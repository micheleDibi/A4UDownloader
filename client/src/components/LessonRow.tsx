import { AlertCircle, FileText, Presentation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ApprovalStatus, AssetType, Lesson } from '../api/types';
import type { AssetState } from '../hooks/useApprovals';
import { DownloadButton } from './DownloadButton';
import { ApprovalControl } from './ApprovalControl';

interface Props {
  lesson: Lesson;
  index: number;
  getState: (lessonId: string, assetType: AssetType) => AssetState;
  onSetAsset: (
    lessonId: string,
    assetType: AssetType,
    status: ApprovalStatus,
    note?: string | null
  ) => void;
  busy: boolean;
}

const STATUS_META: Record<
  ApprovalStatus,
  { label: string; pill: string; row: string }
> = {
  pending: {
    label: 'In attesa',
    pill: 'bg-slate-100 text-slate-500 ring-slate-200',
    row: 'border-slate-200 bg-white',
  },
  approved: {
    label: 'Approvata',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    row: 'border-emerald-200 bg-emerald-50/40',
  },
  rejected: {
    label: 'Rifiutata',
    pill: 'bg-red-50 text-red-700 ring-red-200',
    row: 'border-red-200 bg-red-50/40',
  },
};

interface AssetRowProps {
  icon: LucideIcon;
  label: string;
  downloadHref: string;
  downloadEnabled: boolean;
  downloadTitle: string;
  state: AssetState;
  busy: boolean;
  onSet: (status: ApprovalStatus, note?: string | null) => void;
}

function AssetRow({
  icon: Icon,
  label,
  downloadHref,
  downloadEnabled,
  downloadTitle,
  state,
  busy,
  onSet,
}: AssetRowProps) {
  const meta = STATUS_META[state.status];
  return (
    <div className={`rounded-lg border px-3 py-2.5 transition-colors ${meta.row}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.pill}`}
          >
            {meta.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DownloadButton
            href={downloadHref}
            label="Scarica"
            enabled={downloadEnabled}
            title={downloadTitle}
            variant="secondary"
          />
          <ApprovalControl state={state} disabled={busy} onSet={onSet} />
        </div>
      </div>
      {state.status === 'rejected' && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700 ring-1 ring-inset ring-red-100">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Motivazione del rifiuto: </span>
            {state.note ? (
              state.note
            ) : (
              <span className="italic text-red-700">nessuna indicata</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export function LessonRow({ lesson, index, getState, onSetAsset, busy }: Props) {
  const isAssessment = lesson.lesson_type === 'ASSESSMENT';
  return (
    <div className="py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-mono text-xs text-slate-500">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="truncate text-sm font-semibold text-slate-800">
            {lesson.title}
          </span>
          {isAssessment && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
              Quiz
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isAssessment && (
            <DownloadButton
              href={`/api/lessons/${lesson.id}/quiz.csv`}
              label="CSV quiz"
              enabled
            />
          )}
          <DownloadButton
            href={`/api/lessons/${lesson.id}/all.zip`}
            label="ZIP lezione"
            enabled
            variant="secondary"
            title="Scarica tutte le risorse della lezione in un ZIP"
          />
        </div>
      </div>

      {!isAssessment && (
        <div className="mt-2.5 space-y-2 sm:pl-6">
          <AssetRow
            icon={FileText}
            label="Dispensa"
            downloadHref={`/api/lessons/${lesson.id}/pdf`}
            downloadEnabled={lesson.dispensa_available !== false}
            downloadTitle="Scarica la dispensa (PDF)"
            state={getState(lesson.id, 'dispensa')}
            busy={busy}
            onSet={(status, note) =>
              onSetAsset(lesson.id, 'dispensa', status, note)
            }
          />
          <AssetRow
            icon={Presentation}
            label="Slide"
            downloadHref={`/api/lessons/${lesson.id}/file?kind=slides`}
            downloadEnabled={!!lesson.slides_available}
            downloadTitle="Scarica le slide (PDF)"
            state={getState(lesson.id, 'slides')}
            busy={busy}
            onSet={(status, note) =>
              onSetAsset(lesson.id, 'slides', status, note)
            }
          />
        </div>
      )}
    </div>
  );
}
