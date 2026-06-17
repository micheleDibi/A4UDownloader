import type { ApprovalSummary } from '../api/types';

export function StatusBadge({ summary }: { summary?: ApprovalSummary }) {
  if (!summary || summary.total === 0) return null;
  const done = summary.approved + summary.rejected;

  let cls = 'bg-slate-100 text-slate-600 ring-slate-200';
  let dot = 'bg-slate-400';
  let label = 'Da valutare';
  if (summary.pending === 0) {
    cls = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    dot = 'bg-emerald-500';
    label = 'Valutato';
  } else if (done > 0) {
    cls = 'bg-amber-50 text-amber-700 ring-amber-200';
    dot = 'bg-amber-500';
    label = `${done}/${summary.total}`;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
