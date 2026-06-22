import { useState } from 'react';
import { ChevronDown, FolderArchive } from 'lucide-react';
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
  let total = 0;
  let approved = 0;
  let rejected = 0;
  for (const l of contentLessons) {
    const types: AssetType[] = ['dispensa', 'slides'];
    if (l.video_available) types.push('video');
    if (l.avatar_video_available) types.push('avatar');
    total += types.length;
    for (const at of types) {
      const s = getState(l.id, at).status;
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
    }
  }
  const summary = { total, approved, rejected, pending: total - approved - rejected };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                open ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <span className="truncate font-semibold text-slate-800">{m.title}</span>
            {detail && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {detail.lessons.length} lezioni
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              title="Scarica tutto il modulo come ZIP"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              ZIP
            </a>
          </div>
        </div>
        {detail && total > 0 && <ApprovalProgress summary={summary} className="mt-3" />}
      </div>

      {open && (
        <div className="rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-4 py-3">
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Errore nel caricare le lezioni di questo modulo.
            </div>
          )}
          {!isError && detail && lessons.length === 0 && (
            <p className="text-sm text-slate-500">
              Nessuna lezione in questo modulo.
            </p>
          )}
          {!isError && lessons.length > 0 && (
            <ul className="divide-y divide-slate-200/70">
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
