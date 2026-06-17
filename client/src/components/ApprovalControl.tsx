import { useState } from 'react';
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
    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const approveCls = approved
    ? 'border-emerald-500 bg-emerald-500 text-white'
    : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-700';
  const rejectCls = rejected
    ? 'border-red-500 bg-red-500 text-white'
    : 'border-slate-300 bg-white text-slate-600 hover:border-red-400 hover:text-red-700';

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
        ✓ Approva
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
        ✗ Rifiuta
      </button>
      {rejected && state.note && (
        <span
          title={state.note}
          aria-label={`Motivazione: ${state.note}`}
          className="cursor-help select-none text-amber-500"
        >
          ⓘ
        </span>
      )}
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
