import { useState } from 'react';
import type {
  ApprovalStatus,
  AssetType,
  ModuleDetail,
  ModuleSummary,
} from '../api/types';
import type { AssetState } from '../hooks/useApprovals';
import { LessonRow } from './LessonRow';
import { Spinner } from './Spinner';
import { ApprovalProgress } from './ApprovalProgress';
import { BulkApprovalButtons } from './BulkApprovalButtons';

interface Props {
  moduleSummary: ModuleSummary;
  detail?: ModuleDetail;
  isLoading: boolean;
  isError: boolean;
  getState: (lessonId: string, assetType: AssetType) => AssetState;
  onSetAsset: (
    lessonId: string,
    assetType: AssetType,
    status: ApprovalStatus,
    note?: string | null
  ) => void;
  onSetModule: (
    moduleId: string,
    status: ApprovalStatus,
    note?: string | null
  ) => void;
  busy: boolean;
}

export function ModuleAccordion({
  moduleSummary: m,
  detail,
  isLoading,
  isError,
  getState,
  onSetAsset,
  onSetModule,
  busy,
}: Props) {
  const [open, setOpen] = useState(false);
  const lessons = detail
    ? detail.lessons.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  const contentLessons = lessons.filter((l) => l.lesson_type !== 'ASSESSMENT');
  const total = contentLessons.length * 2;
  let approved = 0;
  let rejected = 0;
  for (const l of contentLessons) {
    for (const at of ['dispensa', 'slides'] as AssetType[]) {
      const s = getState(l.id, at).status;
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
    }
  }
  const summary = { total, approved, rejected, pending: total - approved - rejected };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex flex-1 items-center gap-2 text-left text-slate-800 transition hover:text-slate-900"
          >
            <span className="inline-block w-3 text-slate-500">
              {open ? '▾' : '▸'}
            </span>
            <span className="font-medium">{m.title}</span>
            {detail && (
              <span className="text-xs text-slate-500">
                ({detail.lessons.length} lezioni)
              </span>
            )}
            {isLoading && <Spinner size="sm" />}
          </button>
          <div className="flex items-center gap-2">
            {detail && total > 0 && (
              <BulkApprovalButtons
                scopeLabel="questo modulo"
                size="sm"
                disabled={busy}
                onApprove={(note) => onSetModule(m.id, 'approved', note)}
                onReject={(note) => onSetModule(m.id, 'rejected', note)}
              />
            )}
            <a
              href={`/api/modules/${m.id}/all.zip`}
              download
              className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              title="Scarica tutto il modulo come ZIP"
            >
              ZIP modulo
            </a>
          </div>
        </div>
        {detail && total > 0 && <ApprovalProgress summary={summary} className="mt-3" />}
      </div>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          {isError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Errore nel caricare le lezioni di questo modulo.
            </div>
          )}
          {!isError && detail && lessons.length === 0 && (
            <p className="text-sm text-slate-500">
              Nessuna lezione in questo modulo.
            </p>
          )}
          {!isError && lessons.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {lessons.map((l, i) => (
                <li key={l.id}>
                  <LessonRow
                    lesson={l}
                    index={i}
                    getState={getState}
                    onSetAsset={onSetAsset}
                    busy={busy}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
