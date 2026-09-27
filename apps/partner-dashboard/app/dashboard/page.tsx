import { redirect } from 'next/navigation';

// Partners work with their own events. Moderation lives in the admin dashboard.
export default function DashboardPage() {
  redirect('/dashboard/events');
}
