'use client';

import { useEffect, useState } from 'react';
import { Timestamp, collection, getCountFromServer, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { COLLECTIONS } from '@community/firebase';
import { db } from '@/lib/firebase/config';

interface Stats {
  accounts: number;
  blockedAccounts: number;
  venues: number;
  pendingVenues: number;
  approvedVenues: number;
  upcomingEvents: number;
}

const count = async (...parts: Parameters<typeof query>): Promise<number> =>
  (await getCountFromServer(query(...parts))).data().count;

async function loadStats(): Promise<Stats> {
  const users = collection(db, COLLECTIONS.USERS);
  const venues = collection(db, COLLECTIONS.VENUES);
  const events = collection(db, COLLECTIONS.EVENTS);

  const [accounts, blockedAccounts, allVenues, pendingVenues, approvedVenues, upcomingEvents] =
    await Promise.all([
      count(users),
      count(users, where('moderationStatus', '==', 'rejected')),
      count(venues),
      count(venues, where('moderationStatus', '==', 'pending')),
      count(venues, where('moderationStatus', '==', 'approved')),
      count(events, where('status', '==', 'scheduled'), where('startsAt', '>=', Timestamp.now())),
    ]);

  return {
    accounts,
    blockedAccounts,
    venues: allVenues,
    pendingVenues,
    approvedVenues,
    upcomingEvents,
  };
}

function StatCard({
  title,
  value,
  color,
  subtitle,
  href,
}: {
  title: string;
  value: number;
  color: string;
  subtitle?: string;
  href?: string;
}) {
  const card = (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${color}`}>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStats()
      .then((loaded) => {
        if (!cancelled) setStats(loaded);
      })
      .catch((error) => {
        console.error('Error loading stats:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
        We couldn&apos;t load the totals. Refresh to try again.
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Overview</h1>
        <p className="text-gray-600">Accounts, venues, and events across the app</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Accounts"
          value={stats.accounts}
          color="border-blue-500"
          href="/dashboard/users"
        />
        <StatCard
          title="Blocked accounts"
          value={stats.blockedAccounts}
          color="border-red-500"
          href="/dashboard/users"
        />
        <StatCard
          title="Upcoming events"
          value={stats.upcomingEvents}
          color="border-pink-500"
          subtitle="Posted by venues and hosts"
        />
        <StatCard
          title="Venues"
          value={stats.venues}
          color="border-purple-500"
          href="/dashboard/venues"
        />
        <StatCard
          title="Venues waiting"
          value={stats.pendingVenues}
          color="border-yellow-500"
          subtitle="Need approval before events can be posted there"
          href="/dashboard/venues"
        />
        <StatCard
          title="Approved venues"
          value={stats.approvedVenues}
          color="border-green-500"
          href="/dashboard/venues"
        />
      </div>
    </div>
  );
}
