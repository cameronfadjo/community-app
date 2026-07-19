import type { ModerationStatus } from '@community/types';

const STATUS_STYLES: Record<ModerationStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
};

/**
 * Status badge for moderation decisions. Use in tables, lists, and detail panels
 * to show whether a user/venue/review is pending, approved, or rejected.
 */
export function StatusBadge({ status }: { status: ModerationStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`${style.bg} ${style.text} text-xs font-medium px-2 py-1 rounded-full`}
    >
      {style.label}
    </span>
  );
}
