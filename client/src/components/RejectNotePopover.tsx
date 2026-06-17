import { useId, useState } from 'react';

interface Props {
  initialNote?: string | null;
  onConfirm: (note: string | null) => void;
  onCancel: () => void;
}

export function RejectNotePopover({ initialNote, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState(initialNote ?? '');
  const fieldId = useId();
  return (
    <div
      className="absolute right-0 top-full z-20 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-dialog animate-scale-in"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <label htmlFor={fieldId} className="block text-xs font-semibold text-slate-700">
        Motivazione del rifiuto
        <span className="font-normal text-slate-400"> (facoltativa)</span>
      </label>
      <textarea
        id={fieldId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        autoFocus
        placeholder="Es. manca la bibliografia, slide incomplete…"
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim() ? note.trim() : null)}
          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          Conferma rifiuto
        </button>
      </div>
    </div>
  );
}
