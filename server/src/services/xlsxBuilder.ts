import archiver from 'archiver';
import { randomInt } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { orderCorrectFirst } from './csvBuilder';
import type { ModuleClosedQuestions } from './db';

// Paniere eCampus: per ogni modulo, 10 domande chiuse estratte a caso dalla
// sua lezione di verifica, scritte nel modello `Modello paniere.xlsx`.
const QUESTIONS_PER_MODULE = 10;
// La verifica è l'ottava lezione di ogni modulo: modulo 1 → 8, modulo 2 → 16…
const LESSONS_PER_MODULE = 8;
const LIVELLO_CONOSCENZE = 1;
// Il modello ha una colonna per la risposta corretta e tre per le sbagliate.
const ANSWER_COLUMNS = 4;

// Il modello scompattato così com'è: si riscrivono solo il foglio e le
// stringhe condivise, tutto il resto (stili, colonne, righe rosse) resta suo.
// Il percorso vale sia da `src/` (tsx) sia da `dist/` (build).
const TEMPLATE_DIR = path.resolve(__dirname, '../../templates/paniere-ecampus');
const SHEET_PATH = 'xl/worksheets/sheet1.xml';
const STRINGS_PATH = 'xl/sharedStrings.xml';
const CONTENT_TYPES_PATH = '[Content_Types].xml';
// Righe 1-2: nota "Non cancellare le righe rosse" e intestazioni. I dati
// partono dalla 3, che nel modello è una riga vuota già formattata.
const HEADER_ROWS = 2;
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export interface PaniereRow {
  nucleo: string;
  lezione: number;
  domanda: string;
  risposte: string[];
}

// Estrazione senza ripetizioni (Fisher-Yates parziale). Le domande scelte
// restano nell'ordine in cui compaiono nella verifica.
function pickRandom<T>(items: T[], n: number): T[] {
  const idx = items.map((_, i) => i);
  const k = Math.min(n, idx.length);
  for (let i = 0; i < k; i++) {
    const j = i + randomInt(idx.length - i);
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return idx
    .slice(0, k)
    .sort((a, b) => a - b)
    .map((i) => items[i]!);
}

// Una domanda entra nel paniere solo se si sa qual è la risposta corretta:
// con un `correct_option_id` che non combacia, la colonna "Risposta 1
// (corretta)" mentirebbe. Con più di quattro opzioni si tengono le prime tre
// sbagliate; con meno, le colonne in eccesso restano vuote.
export function buildPaniereRows(modules: ModuleClosedQuestions[]): PaniereRow[] {
  const rows: PaniereRow[] = [];
  modules.forEach((mod, i) => {
    const usable = mod.questions.flatMap((q) => {
      const domanda = cleanText(q.text ?? '');
      const { texts, found } = orderCorrectFirst(
        q.options ?? [],
        q.correct_option_id
      );
      if (!domanda || !found) return [];
      return [{ domanda, risposte: texts.slice(0, ANSWER_COLUMNS).map(cleanText) }];
    });
    for (const q of pickRandom(usable, QUESTIONS_PER_MODULE)) {
      rows.push({
        nucleo: cleanText(mod.title ?? ''),
        lezione: (i + 1) * LESSONS_PER_MODULE,
        ...q,
      });
    }
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Scrittura del file .xlsx
// ---------------------------------------------------------------------------

// Caratteri vietati in XML 1.0 (controlli, surrogati spaiati): Excel
// rifiuterebbe il file intero.
const INVALID_XML_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function cleanText(s: string): string {
  return s.replace(/\r\n?/g, '\n').replace(INVALID_XML_CHARS, '').trim();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let templateCache: Map<string, Buffer> | null = null;

function loadTemplate(): Map<string, Buffer> {
  if (templateCache) return templateCache;
  const files = new Map<string, Buffer>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (/\.(xml|rels)$/.test(entry.name)) {
        // Solo le parti OOXML: niente .DS_Store & co. dentro il pacchetto.
        const rel = path.relative(TEMPLATE_DIR, abs).split(path.sep).join('/');
        files.set(rel, fs.readFileSync(abs));
      }
    }
  };
  walk(TEMPLATE_DIR);
  for (const required of [CONTENT_TYPES_PATH, SHEET_PATH, STRINGS_PATH]) {
    if (!files.has(required)) {
      throw new Error(`Modello paniere incompleto: manca ${required}`);
    }
  }
  templateCache = files;
  return files;
}

function templateRow(sheet: string, r: number): string {
  const m = sheet.match(new RegExp(`<row r="${r}"[\\s>][\\s\\S]*?</row>`));
  if (!m) throw new Error(`Modello paniere: riga ${r} non trovata`);
  return m[0];
}

// Stile di ogni colonna dati, letto dalla prima riga dati del modello.
function dataStyles(sheet: string): Map<string, string> {
  const styles = new Map<string, string>();
  const row = templateRow(sheet, HEADER_ROWS + 1);
  for (const [, attrs] of row.matchAll(/<c\b([^>]*?)\/?>/g)) {
    const col = attrs?.match(/\br="([A-Z]+)\d+"/)?.[1];
    const style = attrs?.match(/\bs="(\d+)"/)?.[1];
    if (col && style) styles.set(col, style);
  }
  return styles;
}

class SharedStrings {
  private readonly index = new Map<string, number>();
  private readonly items: string[];
  private refs: number;

  // Le stringhe del modello (intestazioni) mantengono i loro indici.
  constructor(templateXml: string, templateRefs: number) {
    this.items = templateXml.match(/<si>[\s\S]*?<\/si>/g) ?? [];
    this.refs = templateRefs;
  }

  ref(text: string): number {
    this.refs++;
    let i = this.index.get(text);
    if (i === undefined) {
      i = this.items.length;
      this.items.push(`<si><t xml:space="preserve">${escapeXml(text)}</t></si>`);
      this.index.set(text, i);
    }
    return i;
  }

  toXml(): string {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ` count="${this.refs}" uniqueCount="${this.items.length}">` +
      `${this.items.join('')}</sst>`
    );
  }
}

function buildSheet(
  sheet: string,
  strings: SharedStrings,
  rows: PaniereRow[]
): string {
  const styles = dataStyles(sheet);
  const s = (col: string): string => {
    const style = styles.get(col);
    return style ? ` s="${style}"` : '';
  };
  const text = (col: string, r: number, value: string): string =>
    value
      ? `<c r="${col}${r}"${s(col)} t="s"><v>${strings.ref(value)}</v></c>`
      : `<c r="${col}${r}"${s(col)}/>`;
  const num = (col: string, r: number, value: number): string =>
    `<c r="${col}${r}"${s(col)}><v>${value}</v></c>`;

  const header = Array.from({ length: HEADER_ROWS }, (_, i) =>
    templateRow(sheet, i + 1)
  ).join('');
  const data = rows
    .map((row, i) => {
      const r = HEADER_ROWS + 1 + i;
      const answers = Array.from({ length: ANSWER_COLUMNS }, (_, k) =>
        text(COLUMNS[4 + k]!, r, row.risposte[k] ?? '')
      ).join('');
      return (
        `<row r="${r}" spans="1:${COLUMNS.length}">` +
        text('A', r, row.nucleo) +
        num('B', r, row.lezione) +
        num('C', r, LIVELLO_CONOSCENZE) +
        text('D', r, row.domanda) +
        answers +
        '</row>'
      );
    })
    .join('');

  const lastRow = HEADER_ROWS + rows.length;
  const lastCol = COLUMNS[COLUMNS.length - 1];
  // Sostituzioni con funzione: una stringa di rimpiazzo interpreterebbe i
  // `$&`, `$1`… eventualmente presenti nel testo delle domande.
  return sheet
    .replace(/<dimension ref="[^"]*"\/>/, () => `<dimension ref="A1:${lastCol}${lastRow}"/>`)
    .replace(/<sheetData>[\s\S]*<\/sheetData>/, () => `<sheetData>${header}${data}</sheetData>`);
}

function zipToBuffer(entries: Array<[string, Buffer | string]>): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('warning', reject);
    archive.on('error', reject);
    for (const [name, data] of entries) archive.append(data, { name });
    archive.finalize().catch(reject);
  });
}

export async function buildPaniereXlsx(rows: PaniereRow[]): Promise<Buffer> {
  const template = loadTemplate();
  const sheet = template.get(SHEET_PATH)!.toString('utf8');
  const templateStrings = template.get(STRINGS_PATH)!.toString('utf8');

  // Riferimenti a stringhe condivise già presenti nelle righe d'intestazione.
  const headerXml = Array.from({ length: HEADER_ROWS }, (_, i) =>
    templateRow(sheet, i + 1)
  ).join('');
  const headerRefs = (headerXml.match(/\bt="s"/g) ?? []).length;

  const strings = new SharedStrings(templateStrings, headerRefs);
  const sheetXml = buildSheet(sheet, strings, rows);

  // [Content_Types].xml per primo, come fa Excel.
  const names = [...template.keys()].sort((a, b) =>
    a === CONTENT_TYPES_PATH ? -1 : b === CONTENT_TYPES_PATH ? 1 : a.localeCompare(b)
  );
  const entries = names.map((name): [string, Buffer | string] => {
    if (name === SHEET_PATH) return [name, sheetXml];
    if (name === STRINGS_PATH) return [name, strings.toXml()];
    return [name, template.get(name)!];
  });
  return zipToBuffer(entries);
}
