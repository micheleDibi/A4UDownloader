import { stringify } from 'csv-stringify/sync';
import { a4uJson } from './a4uClient';
import type { LessonDetail, Quiz, QuizQuestion, QuizQuestionDetail } from '../types';
import { limitConcurrency } from '../utils/limit';

const UTF8_BOM = '﻿';
const QUESTION_DETAIL_CONCURRENCY = 8;
const MAX_QUESTIONS_PER_QUIZ = 500;

interface NormalizedQuestion {
  quizIndex: number;
  questionText: string;
  options: Array<{ text: string; isCorrect: boolean }>;
}

async function fetchQuestionDetail(id: number): Promise<QuizQuestionDetail> {
  return a4uJson<QuizQuestionDetail>(`/questions/${id}`);
}

async function fetchQuizQuestions(quizId: number, quizIndex: number): Promise<NormalizedQuestion[]> {
  const list = await a4uJson<QuizQuestion[]>(
    `/quizzes/${quizId}/questions?skip=0&limit=${MAX_QUESTIONS_PER_QUIZ}`
  );
  const details = await limitConcurrency(
    QUESTION_DETAIL_CONCURRENCY,
    list.map((q) => () => fetchQuestionDetail(q.id))
  );
  return details.map((d) => ({
    quizIndex,
    questionText: d.question_text,
    options: (d.options ?? []).map((o) => ({
      text: o.option_text,
      isCorrect: !!o.is_correct,
    })),
  }));
}

export async function buildQuizCsvForLesson(lesson: LessonDetail): Promise<string> {
  const quizzes: Quiz[] = lesson.quizzes ?? [];
  if (quizzes.length === 0) {
    return UTF8_BOM + stringify([['question_text']], { delimiter: ';', quoted_string: true });
  }

  const perQuiz = await Promise.all(quizzes.map((q, i) => fetchQuizQuestions(q.id, i + 1)));
  const flat = perQuiz.flat();
  const maxOpts = flat.reduce((m, q) => Math.max(m, q.options.length), 0);
  const includeQuizIndex = quizzes.length > 1;

  const header: string[] = [];
  if (includeQuizIndex) header.push('quiz_index');
  header.push('question_text');
  for (let i = 0; i < maxOpts; i++) header.push(`option_${i + 1}`);
  header.push('correct_option_index');

  const rows: Array<Array<string | number>> = [header];
  for (const q of flat) {
    const row: Array<string | number> = [];
    if (includeQuizIndex) row.push(q.quizIndex);
    row.push(q.questionText);
    for (let i = 0; i < maxOpts; i++) {
      row.push(q.options[i]?.text ?? '');
    }
    const correctIdx = q.options.findIndex((o) => o.isCorrect);
    row.push(correctIdx >= 0 ? correctIdx + 1 : '');
    rows.push(row);
  }
  return UTF8_BOM + stringify(rows, { delimiter: ';', quoted_string: true });
}
