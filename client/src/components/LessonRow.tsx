import type { Lesson } from '../api/types';
import { DownloadButton } from './DownloadButton';

interface Props {
  lesson: Lesson;
  index: number;
}

export function LessonRow({ lesson, index }: Props) {
  const isAssessment = lesson.lesson_type === 'ASSESSMENT';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="font-mono text-xs text-slate-400">
          {String(index + 1).padStart(2, '0')}.
        </span>
        <span className="truncate text-sm text-slate-800">{lesson.title}</span>
        {isAssessment && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
            Quiz
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isAssessment ? (
          <DownloadButton
            href={`/api/lessons/${lesson.id}/quiz.csv`}
            label="CSV quiz"
            enabled
          />
        ) : (
          <>
            <DownloadButton
              href={`/api/lessons/${lesson.id}/pdf`}
              label="PDF"
              enabled
              title="Scarica PDF della lezione"
            />
            <DownloadButton
              href={`/api/lessons/${lesson.id}/file?kind=slides`}
              label="Slides"
              enabled={!!lesson.slides_pdf_url}
              title="Scarica le slide della lezione"
            />
            <DownloadButton
              href={`/api/lessons/${lesson.id}/file?kind=video`}
              label="Video"
              enabled={!!lesson.slides_and_audio_video_url}
              title="Scarica il video con audio"
            />
            <DownloadButton
              href={`/api/lessons/${lesson.id}/file?kind=avatar`}
              label="Video avatar"
              enabled={!!lesson.slides_and_avatar_video_url}
              title="Scarica il video con avatar"
            />
          </>
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
  );
}
