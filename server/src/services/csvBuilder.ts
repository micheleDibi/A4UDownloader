import { stringify } from 'csv-stringify/sync';
import type { LessonAssessmentContent } from '../types';

const UTF8_BOM = '﻿';

// Costruisce il CSV del quiz a partire dal JSON `content_raw` di una lezione
// di verifica (scelta multipla + domande aperte). Delimitatore `;` + BOM UTF-8
// per la compatibilità con Excel italiano.
export function buildQuizCsv(content: LessonAssessmentContent | null): string {
  const mc = content?.multiple_choice_questions ?? [];
  const open = content?.open_questions ?? [];
  const maxOpts = mc.reduce((m, q) => Math.max(m, q.options?.length ?? 0), 0);

  const header: string[] = ['type', 'question_text'];
  for (let i = 0; i < maxOpts; i++) header.push(`option_${i + 1}`);
  header.push('correct_option_index', 'expected_answer');

  const rows: Array<Array<string | number>> = [header];

  for (const q of mc) {
    const opts = q.options ?? [];
    const row: Array<string | number> = ['mc', q.text];
    for (let i = 0; i < maxOpts; i++) row.push(opts[i]?.text ?? '');
    const correctIdx = opts.findIndex((o) => o.option_id === q.correct_option_id);
    row.push(correctIdx >= 0 ? correctIdx + 1 : '');
    row.push('');
    rows.push(row);
  }

  for (const q of open) {
    const row: Array<string | number> = ['open', q.text];
    for (let i = 0; i < maxOpts; i++) row.push('');
    row.push('');
    row.push(q.expected_answer ?? '');
    rows.push(row);
  }

  return UTF8_BOM + stringify(rows, { delimiter: ';', quoted_string: true });
}
