const WINDOWS_ILLEGAL = /[<>:"/\\|?*\x00-\x1f]/g;
const MULTI_DASH = /-+/g;
const ACCENTS = /[̀-ͯ]/g;

export function slugify(input: string | null | undefined, maxLen = 80): string {
  const raw = (input ?? '').toString();
  const out = raw
    .normalize('NFD')
    .replace(ACCENTS, '')
    .replace(WINDOWS_ILLEGAL, '-')
    .replace(/\s+/g, '-')
    .replace(MULTI_DASH, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);
  return out || 'untitled';
}

export function ordinalPrefix(zeroBasedIndex: number, slug: string): string {
  return `${String(zeroBasedIndex + 1).padStart(2, '0')}-${slug}`;
}
