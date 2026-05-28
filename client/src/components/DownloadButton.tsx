interface Props {
  href: string;
  label: string;
  enabled: boolean;
  variant?: 'primary' | 'secondary';
  title?: string;
}

export function DownloadButton({
  href,
  label,
  enabled,
  variant = 'primary',
  title,
}: Props) {
  const base =
    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition';
  const enabledCls =
    variant === 'secondary'
      ? 'border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50';
  const disabledCls =
    'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400';
  if (!enabled) {
    return (
      <span className={`${base} ${disabledCls}`} title="File non disponibile">
        {label}
      </span>
    );
  }
  return (
    <a href={href} download className={`${base} ${enabledCls}`} title={title ?? label}>
      {label}
    </a>
  );
}
