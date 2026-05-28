import { useState } from 'react';
import type { ModuleDetail, ModuleSummary } from '../api/types';
import { LessonRow } from './LessonRow';
import { Spinner } from './Spinner';

interface Props {
  moduleSummary: ModuleSummary;
  detail?: ModuleDetail;
  isLoading: boolean;
  isError: boolean;
}

export function ModuleAccordion({ moduleSummary: m, detail, isLoading, isError }: Props) {
  const [open, setOpen] = useState(false);
  const lessons = detail
    ? detail.lessons.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left text-slate-800 transition hover:text-slate-900"
        >
          <span className="inline-block w-3 text-slate-500">{open ? '▾' : '▸'}</span>
          <span className="font-medium">{m.title}</span>
          {detail && (
            <span className="text-xs text-slate-500">
              ({detail.lessons.length} lezioni)
            </span>
          )}
          {isLoading && <Spinner size="sm" />}
        </button>
        <a
          href={`/api/modules/${m.id}/all.zip`}
          download
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          title="Scarica tutto il modulo come ZIP"
        >
          ZIP modulo
        </a>
      </div>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          {isError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Errore nel caricare le lezioni di questo modulo.
            </div>
          )}
          {!isError && detail && lessons.length === 0 && (
            <p className="text-sm text-slate-500">Nessuna lezione in questo modulo.</p>
          )}
          {!isError && lessons.length > 0 && (
            <ul className="divide-y divide-slate-100">
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
