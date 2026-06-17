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

interface AssetRowProps {
  label: string;
  downloadHref: string;
  downloadLabel: string;
  downloadEnabled: boolean;
  downloadTitle: string;
  state: AssetState;
  busy: boolean;
  onSet: (status: ApprovalStatus, note?: string | null) => void;
}

function AssetRow({
  label,
  downloadHref,
  downloadLabel,
  downloadEnabled,
  downloadTitle,
  state,
  busy,
  onSet,
}: AssetRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50/70 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-16 text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <DownloadButton
          href={downloadHref}
          label={downloadLabel}
          enabled={downloadEnabled}
          title={downloadTitle}
        />
      </div>
      <ApprovalControl state={state} disabled={busy} onSet={onSet} />
    </div>
  );
}

export function LessonRow({ lesson, index, getState, onSetAsset, busy }: Props) {
  const isAssessment = lesson.lesson_type === 'ASSESSMENT';
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-mono text-xs text-slate-400">
            {String(index + 1).padStart(2, '0')}.
          </span>
          <span className="truncate text-sm font-medium text-slate-800">
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
        <div className="mt-2 space-y-1.5 pl-6">
          <AssetRow
            label="Dispensa"
            downloadHref={`/api/lessons/${lesson.id}/pdf`}
            downloadLabel="Scarica"
            downloadEnabled={lesson.dispensa_available !== false}
            downloadTitle="Scarica la dispensa (PDF)"
            state={getState(lesson.id, 'dispensa')}
            busy={busy}
            onSet={(status, note) =>
              onSetAsset(lesson.id, 'dispensa', status, note)
            }
          />
          <AssetRow
            label="Slide"
            downloadHref={`/api/lessons/${lesson.id}/file?kind=slides`}
            downloadLabel="Scarica"
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
