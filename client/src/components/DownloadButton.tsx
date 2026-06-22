import { Download } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  href: string;
  label: string;
  enabled: boolean;
  variant?: 'primary' | 'secondary';
  title?: string;
  icon?: LucideIcon;
}

export function DownloadButton({
  href,
  label,
  enabled,
  variant = 'primary',
  title,
  icon: Icon = Download,
}: Props) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition';
  const enabledCls =
    variant === 'secondary'
      ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
      : 'border border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100';
  const disabledCls =
    'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400';

  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label={`${label} — file non disponibile`}
        title="File non disponibile"
        className={`${base} ${disabledCls}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      download
      className={`${base} ${enabledCls}`}
      title={title ?? label}
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
