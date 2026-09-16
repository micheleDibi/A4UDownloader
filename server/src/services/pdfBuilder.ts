import PDFDocument from 'pdfkit';
import type { LessonAssessmentContent } from '../types';

export interface OpenQuestionsPdfMeta {
  courseTitle?: string | null;
  lessonTitle?: string | null;
}

// Palette neutra: nessun marchio, solo grigi + una riga di separazione.
const INK = '#1e293b';
const MUTED = '#64748b';
const RULE = '#cbd5e1';

const PAGE_MARGIN = 64;
const FOOTER_SPACE = 40;

// Unico file PDF prodotto da questa app: tutti gli altri sono proxati da OVH.
// Domande aperte + traccia della risposta attesa, per la correzione.
export function buildOpenQuestionsPdf(
  content: LessonAssessmentContent | null,
  meta: OpenQuestionsPdfMeta = {}
): Promise<Buffer> {
  const questions = content?.open_questions ?? [];

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN + FOOTER_SPACE,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
      bufferPages: true,
      info: {
        Title: 'Domande aperte',
        Subject: meta.lessonTitle || 'Domande aperte',
        Creator: 'A4U Downloader',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const contentWidth = doc.page.width - PAGE_MARGIN * 2;

    // --- Intestazione ---------------------------------------------------
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(INK)
      .text('Domande aperte', { width: contentWidth });

    const subtitles = [meta.courseTitle, meta.lessonTitle].filter(
      (s): s is string => !!s && s.trim().length > 0
    );
    if (subtitles.length) {
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10.5).fillColor(MUTED);
      for (const s of subtitles) {
        doc.text(s, { width: contentWidth });
      }
    }

    doc.moveDown(0.8);
    doc
      .strokeColor(RULE)
      .lineWidth(1)
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke();
    doc.moveDown(1.2);

    // --- Domande --------------------------------------------------------
    if (questions.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(11)
        .fillColor(MUTED)
        .text('Nessuna domanda aperta in questa verifica.', {
          width: contentWidth,
        });
    }

    const NUM_W = 26;
    const indent = PAGE_MARGIN + NUM_W;
    const bodyWidth = contentWidth - NUM_W;

    questions.forEach((q, i) => {
      // Tiene insieme numero + testo della domanda: se non c'è spazio per
      // almeno tre righe, si va a pagina nuova invece di spezzare il blocco.
      const needed = doc.heightOfString(q.text ?? '', { width: bodyWidth }) + 46;
      if (doc.y + needed > doc.page.height - PAGE_MARGIN - FOOTER_SPACE) {
        doc.addPage();
      }

      const top = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(MUTED)
        .text(`${i + 1}.`, PAGE_MARGIN, top, { width: NUM_W });

      doc
        .font('Helvetica-Bold')
        .fontSize(11.5)
        .fillColor(INK)
        .text(q.text ?? '', indent, top, { width: bodyWidth });

      doc.moveDown(0.7);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text('RISPOSTA ATTESA', indent, doc.y, {
          width: bodyWidth,
          characterSpacing: 0.8,
        });

      doc.moveDown(0.45);
      // `expected_answer` può contenere a capo significativi: non normalizzare.
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(INK)
        .text(q.expected_answer ?? '', indent, doc.y, {
          width: bodyWidth,
          align: 'left',
        });

      if (i < questions.length - 1) doc.moveDown(1.5);
    });

    // --- Piè di pagina --------------------------------------------------
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Il piè di pagina cade sotto il margine inferiore: senza azzerare
      // temporaneamente il margine, pdfkit lo interpreta come overflow e
      // aggiunge una pagina vuota in coda.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(
          `Pagina ${i + 1} di ${range.count}`,
          PAGE_MARGIN,
          doc.page.height - PAGE_MARGIN - FOOTER_SPACE / 2,
          { width: contentWidth, align: 'center', lineBreak: false }
        );
      doc.page.margins.bottom = bottom;
    }

    doc.end();
  });
}
