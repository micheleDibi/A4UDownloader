import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

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

const FOCUSABLE = 'button, textarea, input, select, a[href]';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const danger = confirmVariant === 'danger';
  const confirmCls = danger
    ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-brand-600 text-white hover:bg-brand-700';
  const Icon = danger ? AlertTriangle : CheckCircle2;
  const iconWrap = danger ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-700';

  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = node?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables && focusables[0] ? focusables[0] : node)?.focus();
    return () => prevFocused?.focus?.();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const node = dialogRef.current;
    if (!node) return;
    const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled')
    );
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-dialog outline-none animate-scale-in"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconWrap}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-slate-800">
              {title}
            </h3>
            <p id={descId} className="mt-1 text-sm text-slate-600">
              {message}
            </p>
          </div>
        </div>
        {withNote && (
          <textarea
            aria-label="Motivazione (facoltativa)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={notePlaceholder ?? 'Motivazione (facoltativa)…'}
            rows={3}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim() ? note.trim() : null)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
