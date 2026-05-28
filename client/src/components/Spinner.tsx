interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
} as const;

export function Spinner({ size = 'md' }: Props) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-slate-200 border-t-slate-700 ${SIZES[size]}`}
      role="status"
      aria-label="caricamento"
    />
  );
}
