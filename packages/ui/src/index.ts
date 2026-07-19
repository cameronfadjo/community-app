/**
 * @community/ui — Shared UI primitives for Next.js dashboards.
 *
 * Note: components in this package are web-only (use Tailwind + DOM).
 * The mobile app has its own React Native components.
 */

export {
  createAuthContext,
  type AuthContextValue,
  type AuthContextBundle,
  type AuthProviderProps,
} from './auth/AuthContext';

export {
  ToastProvider,
  useToast,
  type Toast,
  type ToastType,
} from './toast/Toast';

export {
  CardSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  VenueDetailSkeleton,
} from './skeletons/LoadingSkeleton';

export { StatusBadge } from './badges/StatusBadge';
