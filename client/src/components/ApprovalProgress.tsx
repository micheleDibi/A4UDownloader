import type { ApprovalSummary } from '../api/types';

interface Props {
  summary: ApprovalSummary;
  className?: string;
}

export function ApprovalProgress({ summary, className }: Props) {
  const { total, approved, rejected, pending } = summary;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className={className}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="bg-emerald-500" style={{ width: `${pct(approved)}%` }} />
        <div className="bg-red-500" style={{ width: `${pct(rejected)}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        <span className="text-emerald-700">{approved} approvate</span>
        <span className="text-red-700">{rejected} rifiutate</span>
        <span>{pending} in attesa</span>
        <span className="text-slate-400">/ {total} totali</span>
      </div>
    </div>
  );
}
