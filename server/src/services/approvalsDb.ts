import * as path from 'node:path';
import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { config } from '../config';
import type { Approval, AssetType, StoredApprovalStatus } from '../types';

// Risolve il path del file .db (assoluto o relativo alla root del repo) e
// garantisce l'esistenza della cartella che lo contiene.
const dbFile = path.isAbsolute(config.approvalsDbPath)
  ? config.approvalsDbPath
  : path.resolve(__dirname, '../../..', config.approvalsDbPath);

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

// Schema corrente: nessun CHECK su `asset_type` (validato a livello app), così
// l'aggiunta di nuovi tipi (video, avatar) non richiede nuove migrazioni.
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS asset_approval (
    lesson_id   TEXT NOT NULL,
    asset_type  TEXT NOT NULL,
    course_id   TEXT NOT NULL,
    module_id   TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('approved','rejected')),
    note        TEXT,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (lesson_id, asset_type)
  )`;
const CREATE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS ix_asset_approval_course ON asset_approval(course_id);
  CREATE INDEX IF NOT EXISTS ix_asset_approval_module ON asset_approval(module_id);
`;

// Migrazione: lo schema iniziale vincolava asset_type a ('dispensa','slides').
// Per consentire i tipi video/avatar ricostruiamo la tabella senza quel CHECK,
// preservando i dati esistenti.
const legacy = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='asset_approval'")
  .get() as { sql: string } | undefined;
if (legacy && legacy.sql.includes("'dispensa'")) {
  const migrate = db.transaction(() => {
    db.exec('ALTER TABLE asset_approval RENAME TO asset_approval_legacy');
    db.exec(CREATE_TABLE_SQL);
    db.exec(
      `INSERT INTO asset_approval
         (lesson_id, asset_type, course_id, module_id, status, note, updated_at)
       SELECT lesson_id, asset_type, course_id, module_id, status, note, updated_at
       FROM asset_approval_legacy`
    );
    db.exec('DROP TABLE asset_approval_legacy');
  });
  migrate();
}

db.exec(CREATE_TABLE_SQL);
db.exec(CREATE_INDEX_SQL);

interface ApprovalRowDb {
  lesson_id: string;
  asset_type: AssetType;
  status: StoredApprovalStatus;
  note: string | null;
  updated_at: string;
}

const selectByCourseStmt = db.prepare<[string], ApprovalRowDb>(
  `SELECT lesson_id, asset_type, status, note, updated_at
   FROM asset_approval WHERE course_id = ?`
);

const upsertStmt = db.prepare(
  `INSERT INTO asset_approval
     (lesson_id, asset_type, course_id, module_id, status, note, updated_at)
   VALUES (@lesson_id, @asset_type, @course_id, @module_id, @status, @note, @updated_at)
   ON CONFLICT(lesson_id, asset_type) DO UPDATE SET
     course_id  = excluded.course_id,
     module_id  = excluded.module_id,
     status     = excluded.status,
     note       = excluded.note,
     updated_at = excluded.updated_at`
);

const deleteStmt = db.prepare(
  `DELETE FROM asset_approval WHERE lesson_id = ? AND asset_type = ?`
);

export function getApprovalsForCourse(courseId: string): Approval[] {
  return selectByCourseStmt.all(courseId).map((r) => ({
    lesson_id: r.lesson_id,
    asset_type: r.asset_type,
    status: r.status,
    note: r.note,
    updated_at: r.updated_at,
  }));
}

export interface SetApprovalInput {
  lesson_id: string;
  asset_type: AssetType;
  course_id: string;
  module_id: string;
  // 'pending' rimuove la riga (torna allo stato iniziale).
  status: StoredApprovalStatus | 'pending';
  note?: string | null;
}

export function setApproval(input: SetApprovalInput): void {
  if (input.status === 'pending') {
    deleteStmt.run(input.lesson_id, input.asset_type);
    return;
  }
  upsertStmt.run({
    lesson_id: input.lesson_id,
    asset_type: input.asset_type,
    course_id: input.course_id,
    module_id: input.module_id,
    status: input.status,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  });
}

export interface BulkAsset {
  lesson_id: string;
  module_id: string;
  // Tipi di asset da impostare per questa lezione (dispensa+slide e, se
  // presenti, video/avatar).
  asset_types: AssetType[];
}

// Imposta lo stato su tutti gli asset indicati, in un'unica transazione.
export function bulkSet(
  assets: BulkAsset[],
  courseId: string,
  status: StoredApprovalStatus | 'pending',
  note?: string | null
): void {
  const apply = db.transaction((items: BulkAsset[]) => {
    for (const a of items) {
      for (const asset_type of a.asset_types) {
        setApproval({
          lesson_id: a.lesson_id,
          asset_type,
          course_id: courseId,
          module_id: a.module_id,
          status,
          note,
        });
      }
    }
  });
  apply(assets);
}

export interface CourseCounts {
  approved: number;
  rejected: number;
}

// Conteggi approved/rejected per ciascun corso (per i badge in lista).
export function countsByCourse(courseIds: string[]): Map<string, CourseCounts> {
  const result = new Map<string, CourseCounts>();
  if (courseIds.length === 0) return result;
  const placeholders = courseIds.map(() => '?').join(',');
  const rows = db
    .prepare<string[], { course_id: string; status: StoredApprovalStatus; n: number }>(
      `SELECT course_id, status, COUNT(*) AS n
       FROM asset_approval WHERE course_id IN (${placeholders})
       GROUP BY course_id, status`
    )
    .all(...courseIds);
  for (const r of rows) {
    const cur = result.get(r.course_id) ?? { approved: 0, rejected: 0 };
    if (r.status === 'approved') cur.approved = r.n;
    else if (r.status === 'rejected') cur.rejected = r.n;
    result.set(r.course_id, cur);
  }
  return result;
}
