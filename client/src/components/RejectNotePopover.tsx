import { useState } from 'react';

interface Props {
  initialNote?: string | null;
  onConfirm: (note: string | null) => void;
  onCancel: () => void;
}

export function RejectNotePopover({ initialNote, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState(initialNote ?? '');
  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <label className="block text-xs font-medium text-slate-600">
        Motivazione (facoltativa)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        autoFocus
        placeholder="Perché viene rifiutata…"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim() ? note.trim() : null)}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
        >
          Conferma rifiuto
        </button>
      </div>
    </div>
  );
}
