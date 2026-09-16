import { useState } from 'react';
import { ChevronDown, FolderArchive } from 'lucide-react';
import type { ModuleDetail, ModuleSummary } from '../api/types';
import { LessonRow } from './LessonRow';
import { Spinner } from './Spinner';

interface Props {
  moduleSummary: ModuleSummary;
  detail?: ModuleDetail;
  isLoading: boolean;
  isError: boolean;
}

export function ModuleAccordion({
  moduleSummary: m,
  detail,
  isLoading,
  isError,
}: Props) {
  const [open, setOpen] = useState(false);
  const lessons = detail
    ? detail.lessons.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

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
                  <LessonRow lesson={l} index={i} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
