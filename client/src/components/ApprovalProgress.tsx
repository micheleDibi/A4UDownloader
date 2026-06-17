import type { ApprovalSummary } from '../api/types';

interface Props {
  summary: ApprovalSummary;
  className?: string;
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-500">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function ApprovalProgress({ summary, className }: Props) {
  const { total, approved, rejected, pending } = summary;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const evaluatedPct = Math.round(pct(approved + rejected));

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Avanzamento valutazione
        </span>
        <span className="text-xs font-semibold text-slate-700">
          {evaluatedPct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={evaluatedPct}
        aria-valuetext={`${evaluatedPct}% valutato — ${approved} approvate, ${rejected} rifiutate, ${pending} in attesa`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
      >
        <div
          aria-hidden="true"
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct(approved)}%` }}
        />
        <div
          aria-hidden="true"
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${pct(rejected)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Legend dot="bg-emerald-500" label={`${approved} approvate`} />
        <Legend dot="bg-red-500" label={`${rejected} rifiutate`} />
        <Legend dot="bg-slate-300" label={`${pending} in attesa`} />
        <span className="ml-auto text-slate-500">{total} totali</span>
      </div>
    </div>
  );
}
