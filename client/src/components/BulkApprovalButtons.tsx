import { useState } from 'react';
import { Ban, CheckCheck } from 'lucide-react';
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
  const sizeCls = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDialog('approve')}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 ${sizeCls}`}
        >
          <CheckCheck className={iconCls} />
          Approva tutto
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDialog('reject')}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50 ${sizeCls}`}
        >
          <Ban className={iconCls} />
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
