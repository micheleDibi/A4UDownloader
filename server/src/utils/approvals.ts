import type {
  Approval,
  ApprovalStatus,
  ApprovalSummary,
  AssetType,
} from '../types';

const APPROVAL_STATUSES: readonly string[] = ['approved', 'rejected', 'pending'];
const ASSET_TYPES: readonly string[] = ['dispensa', 'slides', 'video', 'avatar'];

// Tipi di asset approvabili per una lezione di contenuto: dispensa e slide
// sempre; video e/o avatar solo quando il file è presente su OVH.
export function approvableAssetTypes(l: {
  video_available?: boolean;
  avatar_available?: boolean;
}): AssetType[] {
  const t: AssetType[] = ['dispensa', 'slides'];
  if (l.video_available) t.push('video');
  if (l.avatar_available) t.push('avatar');
  return t;
}

export function isStatus(v: unknown): v is ApprovalStatus {
  return typeof v === 'string' && APPROVAL_STATUSES.includes(v);
}

export function isAssetType(v: unknown): v is AssetType {
  return typeof v === 'string' && ASSET_TYPES.includes(v);
}

export function parseNote(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t.slice(0, 2000) : null;
}

export function buildSummary(
  total: number,
  approvals: Approval[]
): ApprovalSummary {
  const approved = approvals.filter((a) => a.status === 'approved').length;
  const rejected = approvals.filter((a) => a.status === 'rejected').length;
  return {
    total,
    approved,
    rejected,
    pending: Math.max(0, total - approved - rejected),
  };
}
