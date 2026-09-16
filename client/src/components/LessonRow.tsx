import { Clapperboard, FileText, Mic, Presentation, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Lesson } from '../api/types';
import { DownloadButton } from './DownloadButton';

interface Props {
  lesson: Lesson;
  index: number;
}

interface AssetDescriptor {
  icon: LucideIcon;
  label: string;
  downloadHref: string;
  downloadEnabled: boolean;
  downloadTitle: string;
}

export function LessonRow({ lesson, index }: Props) {
  const isAssessment = lesson.lesson_type === 'ASSESSMENT';

  // Dispensa e slide sono sempre mostrate (disabilitate se il file manca);
  // discorso, video e avatar compaiono solo quando il file è pronto su OVH.
  const assets: AssetDescriptor[] = [
    {
      icon: FileText,
      label: 'Dispensa',
      downloadHref: `/api/lessons/${lesson.id}/pdf`,
      downloadEnabled: lesson.dispensa_available !== false,
      downloadTitle: 'Scarica la dispensa (PDF)',
    },
    {
      icon: Presentation,
      label: 'Slide',
      downloadHref: `/api/lessons/${lesson.id}/file?kind=slides`,
      downloadEnabled: !!lesson.slides_available,
      downloadTitle: 'Scarica le slide (PDF)',
    },
  ];
  if (lesson.discorso_available) {
    assets.push({
      icon: Mic,
      label: 'Discorso',
      downloadHref: `/api/lessons/${lesson.id}/file?kind=discorso`,
      downloadEnabled: true,
      downloadTitle: 'Scarica il discorso (PDF)',
    });
  }
  if (lesson.video_available) {
    assets.push({
      icon: Video,
      label: 'Video',
      downloadHref: `/api/lessons/${lesson.id}/file?kind=video`,
      downloadEnabled: true,
      downloadTitle: 'Scarica il video della lezione (MP4)',
    });
  }
  if (lesson.avatar_video_available) {
    assets.push({
      icon: Clapperboard,
      label: 'Video con avatar',
      downloadHref: `/api/lessons/${lesson.id}/file?kind=avatar`,
      downloadEnabled: true,
      downloadTitle: 'Scarica il video con avatar (MP4)',
    });
  }

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
        <div className="mt-2 flex flex-wrap gap-2 sm:pl-6">
          {assets.map((d) => (
            <DownloadButton
              key={d.label}
              href={d.downloadHref}
              label={d.label}
              enabled={d.downloadEnabled}
              title={d.downloadTitle}
              icon={d.icon}
              variant="secondary"
            />
          ))}
        </div>
      )}
    </div>
  );
}
