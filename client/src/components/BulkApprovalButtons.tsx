import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  scopeLabel: string; // es. "questo modulo" / "l'intero corso"
  disabled?: boolean;
  size?: 'sm' | 'md';
  onApprove: (note: string | null) => void;
  onReject: (note: string | null) => void;
}

export function BulkApprovalButtons({
  scopeLabel,
  disabled,
  size = 'md',
  onApprove,
  onReject,
}: Props) {
  const [dialog, setDialog] = useState<null | 'approve' | 'reject'>(null);
  const btn =
    size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDialog('approve')}
          className={`rounded-md border border-emerald-300 bg-emerald-50 font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 ${btn}`}
        >
          Approva tutto
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDialog('reject')}
          className={`rounded-md border border-red-300 bg-red-50 font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50 ${btn}`}
        >
          Rifiuta tutto
        </button>
      </div>
      {dialog === 'approve' && (
        <ConfirmDialog
          title="Approva tutto"
          message={`Confermi l'approvazione di tutte le dispense e slide di ${scopeLabel}?`}
          confirmLabel="Approva tutto"
          onConfirm={(note) => {
            onApprove(note);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'reject' && (
        <ConfirmDialog
          title="Rifiuta tutto"
          message={`Confermi il rifiuto di tutte le dispense e slide di ${scopeLabel}? Puoi aggiungere una motivazione.`}
          confirmLabel="Rifiuta tutto"
          confirmVariant="danger"
          withNote
          onConfirm={(note) => {
            onReject(note);
            setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}
