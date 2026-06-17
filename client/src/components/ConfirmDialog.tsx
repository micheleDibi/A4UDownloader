import { useState } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  withNote?: boolean;
  notePlaceholder?: string;
  onConfirm: (note: string | null) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  withNote,
  notePlaceholder,
  onConfirm,
  onCancel,
}: Props) {
  const [note, setNote] = useState('');
  const confirmCls =
    confirmVariant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-slate-800 text-white hover:bg-slate-900';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {withNote && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder ?? 'Motivazione (facoltativa)…'}
            rows={3}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim() ? note.trim() : null)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
