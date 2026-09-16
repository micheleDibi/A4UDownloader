import { stringify } from 'csv-stringify/sync';
import type { AssessmentMCOption, LessonAssessmentContent } from '../types';

const UTF8_BOM = '﻿';

// In a4u la lettera dell'opzione vive in `option_id`, non nel testo: il
// prefisso "A) " lo compone l'export del frontend. Nulla però impedisce
// all'AI di scriverlo dentro `text`, quindi lo togliamo in modo difensivo.
//
// Regola stretta: si rimuove SOLO se OGNI opzione della domanda inizia con
// la PROPRIA lettera. Una regex ingenua su `^[A-F][).]` mangerebbe la "E."
// di un'opzione legittima come "E. coli è un batterio".
function prefixRe(optionId: string): RegExp | null {
  const letter = optionId.trim();
  if (!/^[A-Za-z]$/.test(letter)) return null;
  return new RegExp(`^\\s*${letter}\\s*[).\\-:]\\s+`, 'i');
}

function stripOptionPrefixes(options: AssessmentMCOption[]): string[] {
  const texts = options.map((o) => o.text ?? '');
  const allPrefixed = options.every((o, i) => {
    const re = prefixRe(o.option_id ?? '');
    return re !== null && re.test(texts[i] ?? '');
  });
  if (!allPrefixed) return texts;
  return options.map((o, i) => {
    const re = prefixRe(o.option_id ?? '');
    const t = texts[i] ?? '';
    return re ? t.replace(re, '').trim() : t;
  });
}

// Ordina le opzioni mettendo la corretta per prima, senza alterare l'ordine
// relativo delle altre. Se `correct_option_id` non combacia con nessuna
// opzione (dato corrotto a monte) l'ordine resta invariato e lo segnaliamo.
function orderCorrectFirst(
  options: AssessmentMCOption[],
  correctOptionId: string
): { texts: string[]; found: boolean } {
  const texts = stripOptionPrefixes(options);
  const idx = options.findIndex((o) => o.option_id === correctOptionId);
  if (idx < 0) return { texts, found: false };
  const correct = texts[idx] ?? '';
  const rest = texts.filter((_, i) => i !== idx);
  return { texts: [correct, ...rest], found: true };
}

// CSV delle sole domande a scelta multipla. Delimitatore `;` + BOM UTF-8 per
// la compatibilità con Excel italiano. La prima opzione è sempre la corretta.
export function buildQuizCsv(content: LessonAssessmentContent | null): string {
  const mc = content?.multiple_choice_questions ?? [];
  const maxOpts = mc.reduce((m, q) => Math.max(m, q.options?.length ?? 0), 0);

  const header: string[] = ['Domanda'];
  for (let i = 0; i < maxOpts; i++) header.push(`Opzione ${i + 1}`);
  header.push('Risposta corretta');

  const rows: Array<Array<string | number>> = [header];

  for (const q of mc) {
    const { texts, found } = orderCorrectFirst(
      q.options ?? [],
      q.correct_option_id
    );
    const row: Array<string | number> = [q.text ?? ''];
    for (let i = 0; i < maxOpts; i++) row.push(texts[i] ?? '');
    row.push(found ? 1 : '');
    rows.push(row);
  }

  return UTF8_BOM + stringify(rows, { delimiter: ';', quoted_string: true });
}
