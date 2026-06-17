import type { ApprovalSummary } from '../api/types';

export function StatusBadge({ summary }: { summary?: ApprovalSummary }) {
  if (!summary || summary.total === 0) return null;
  const done = summary.approved + summary.rejected;

  let cls = 'bg-slate-100 text-slate-600';
  let label = 'Da valutare';
  if (summary.pending === 0) {
    cls = 'bg-emerald-100 text-emerald-800';
    label = 'Valutazione completata';
  } else if (done > 0) {
    cls = 'bg-amber-100 text-amber-800';
    label = `In valutazione ${done}/${summary.total}`;
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
