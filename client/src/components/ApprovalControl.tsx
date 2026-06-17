import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ApprovalStatus } from '../api/types';
import type { AssetState } from '../hooks/useApprovals';
import { RejectNotePopover } from './RejectNotePopover';

interface Props {
  state: AssetState;
  disabled?: boolean;
  onSet: (status: ApprovalStatus, note?: string | null) => void;
}

export function ApprovalControl({ state, disabled, onSet }: Props) {
  const [rejecting, setRejecting] = useState(false);
  const approved = state.status === 'approved';
  const rejected = state.status === 'rejected';

  const base =
    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const approveCls = approved
    ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
    : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700';
  const rejectCls = rejected
    ? 'border-red-600 bg-red-600 text-white shadow-sm'
    : 'border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-700';

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={approved}
        title={approved ? 'Annulla approvazione' : 'Approva'}
        onClick={() => {
          setRejecting(false);
          onSet(approved ? 'pending' : 'approved');
        }}
        className={`${base} ${approveCls}`}
      >
        <Check className="h-3.5 w-3.5" />
        Approva
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={rejected}
        title={rejected ? 'Annulla rifiuto' : 'Rifiuta'}
        onClick={() => {
          if (rejected) onSet('pending');
          else setRejecting((v) => !v);
        }}
        className={`${base} ${rejectCls}`}
      >
        <X className="h-3.5 w-3.5" />
        Rifiuta
      </button>
      {rejecting && (
        <RejectNotePopover
          initialNote={state.note}
          onConfirm={(note) => {
            onSet('rejected', note);
            setRejecting(false);
          }}
          onCancel={() => setRejecting(false)}
        />
      )}
    </div>
  );
}
