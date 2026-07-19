'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalVenues: number;
  pendingVenues: number;
  approvedVenues: number;
  totalReviews: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingUsers: 0,
    totalVenues: 0,
    pendingVenues: 0,
    approvedVenues: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Users stats
      const usersRef = collection(db, 'users');
      const totalUsersSnap = await getCountFromServer(usersRef);
      const pendingUsersSnap = await getCountFromServer(
        query(usersRef, where('moderationStatus', '==', 'pending'))
      );

      // Venues stats
      const venuesRef = collection(db, 'venues');
      const totalVenuesSnap = await getCountFromServer(venuesRef);
      const pendingVenuesSnap = await getCountFromServer(
        query(venuesRef, where('moderationStatus', '==', 'pending'))
      );
      const approvedVenuesSnap = await getCountFromServer(
        query(venuesRef, where('moderationStatus', '==', 'approved'))
      );

      // Reviews stats
      const reviewsRef = collection(db, 'reviews');
      const totalReviewsSnap = await getCountFromServer(reviewsRef);

      setStats({
        totalUsers: totalUsersSnap.data().count,
        pendingUsers: pendingUsersSnap.data().count,
        totalVenues: totalVenuesSnap.data().count,
        pendingVenues: pendingVenuesSnap.data().count,
        approvedVenues: approvedVenuesSnap.data().count,
        totalReviews: totalReviewsSnap.data().count,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    subtitle,
    href
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
    subtitle?: string;
    href?: string;
  }) => {
    const Card = (
      <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-4xl opacity-80">{icon}</div>
        </div>
      </div>
    );

    if (href) {
      return <Link href={href}>{Card}</Link>;
    }
    return Card;
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome to the Community admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="border-blue-500"
          href="/dashboard/users"
        />
        <StatCard
          title="Pending Users"
          value={stats.pendingUsers}
          icon="⏳"
          color="border-yellow-500"
          subtitle="Awaiting approval"
          href="/dashboard/users"
        />
        <StatCard
          title="Total Venues"
          value={stats.totalVenues}
          icon="📍"
          color="border-purple-500"
          href="/dashboard/venues"
        />
        <StatCard
          title="Pending Venues"
          value={stats.pendingVenues}
          icon="⏳"
          color="border-yellow-500"
          subtitle="Awaiting approval"
          href="/dashboard/venues"
        />
        <StatCard
          title="Approved Venues"
          value={stats.approvedVenues}
          icon="✅"
          color="border-green-500"
          subtitle="Live on platform"
          href="/dashboard/venues"
        />
        <StatCard
          title="Total Reviews"
          value={stats.totalReviews}
          icon="⭐"
          color="border-pink-500"
          href="/dashboard/reviews"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <div className="font-medium text-gray-900">Moderate Users</div>
            {stats.pendingUsers > 0 && (
              <div className="text-sm text-yellow-600 mt-1">
                {stats.pendingUsers} pending
              </div>
            )}
          </Link>
          <Link
            href="/dashboard/venues"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition text-center"
          >
            <div className="text-3xl mb-2">🏢</div>
            <div className="font-medium text-gray-900">Moderate Venues</div>
            {stats.pendingVenues > 0 && (
              <div className="text-sm text-yellow-600 mt-1">
                {stats.pendingVenues} pending
              </div>
            )}
          </Link>
          <Link
            href="/dashboard/reviews"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition text-center"
          >
            <div className="text-3xl mb-2">⭐</div>
            <div className="font-medium text-gray-900">View Reviews</div>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition text-center"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-medium text-gray-900">Analytics</div>
          </Link>
        </div>
      </div>

      {/* Alert for pending items */}
      {(stats.pendingUsers > 0 || stats.pendingVenues > 0) && (
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex items-start">
            <div className="text-2xl mr-4">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Attention Required</h3>
              <p className="text-yellow-700">
                You have {stats.pendingUsers} pending user{stats.pendingUsers !== 1 ? 's' : ''} and{' '}
                {stats.pendingVenues} pending venue{stats.pendingVenues !== 1 ? 's' : ''} awaiting moderation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
