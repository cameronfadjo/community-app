'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Venue, Review } from '@/types';
import { format, subDays } from 'date-fns';

interface VenueStats extends Venue {
  totalReviews: number;
  averageRating: number;
  recentReviews: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [topVenues, setTopVenues] = useState<VenueStats[]>([]);
  const [recentActivity, setRecentActivity] = useState({
    newUsers: 0,
    newVenues: 0,
    newReviews: 0,
  });
  const [categoryDistribution, setCategoryDistribution] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load top-rated venues
      const venuesRef = collection(db, 'venues');
      const venuesQuery = query(
        venuesRef,
        where('moderationStatus', '==', 'approved'),
        orderBy('rating', 'desc'),
        limit(10)
      );
      const venuesSnapshot = await getDocs(venuesQuery);
      const venuesData = venuesSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Venue[];

      // Get review counts for top venues
      const venuesWithStats = await Promise.all(
        venuesData.map(async (venue) => {
          const reviewsRef = collection(db, 'reviews');
          const reviewsQuery = query(reviewsRef, where('venueId', '==', venue.id));
          const reviewsSnapshot = await getDocs(reviewsQuery);

          const sevenDaysAgo = subDays(new Date(), 7);
          const recentReviews = reviewsSnapshot.docs.filter((doc) => {
            const reviewData = doc.data();
            return reviewData.createdAt.toDate() >= sevenDaysAgo;
          }).length;

          return {
            ...venue,
            totalReviews: reviewsSnapshot.size,
            averageRating: venue.rating,
            recentReviews,
          };
        })
      );

      setTopVenues(venuesWithStats);

      // Load recent activity (last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);

      // Count new users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const newUsers = usersSnapshot.docs.filter((doc) => {
        const userData = doc.data();
        return userData.createdAt.toDate() >= sevenDaysAgo;
      }).length;

      // Count new venues
      const newVenues = venuesSnapshot.docs.filter((doc) => {
        const venueData = doc.data();
        return venueData.createdAt.toDate() >= sevenDaysAgo;
      }).length;

      // Count new reviews
      const reviewsRef = collection(db, 'reviews');
      const reviewsSnapshot = await getDocs(reviewsRef);
      const newReviews = reviewsSnapshot.docs.filter((doc) => {
        const reviewData = doc.data();
        return reviewData.createdAt.toDate() >= sevenDaysAgo;
      }).length;

      setRecentActivity({
        newUsers,
        newVenues,
        newReviews,
      });

      // Calculate category distribution
      const categoryCount: Record<string, number> = {};
      venuesSnapshot.docs.forEach((doc) => {
        const venue = doc.data() as Venue;
        if (venue.moderationStatus === 'approved') {
          categoryCount[venue.category] = (categoryCount[venue.category] || 0) + 1;
        }
      });
      setCategoryDistribution(categoryCount);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      resort: '🏨',
      club: '🎉',
      restaurant: '🍽️',
      bar: '🍸',
      event: '🎭',
      attraction: '🎡',
    };
    return icons[category] || '📍';
  };

  const getPriceRange = (price: number) => {
    return '$'.repeat(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Platform insights and performance metrics</p>
      </div>

      {/* Recent Activity (Last 7 Days) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">New Users</p>
                <p className="text-3xl font-bold text-gray-900">{recentActivity.newUsers}</p>
              </div>
              <div className="text-4xl opacity-80">👥</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">New Venues</p>
                <p className="text-3xl font-bold text-gray-900">{recentActivity.newVenues}</p>
              </div>
              <div className="text-4xl opacity-80">📍</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">New Reviews</p>
                <p className="text-3xl font-bold text-gray-900">{recentActivity.newReviews}</p>
              </div>
              <div className="text-4xl opacity-80">⭐</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Venues by Category</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(categoryDistribution).map(([category, count]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">{getCategoryIcon(category)}</div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{category}</div>
              </div>
            ))}
          </div>
          {Object.keys(categoryDistribution).length === 0 && (
            <p className="text-center text-gray-500 py-8">No approved venues yet</p>
          )}
        </div>
      </div>

      {/* Top Rated Venues */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Rated Venues</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {topVenues.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No approved venues yet
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New (7d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topVenues.map((venue, index) => (
                  <tr key={venue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getCategoryIcon(venue.category)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{venue.name}</div>
                          <div className="text-sm text-gray-500">
                            {venue.location.city}, {venue.location.country}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 capitalize">{venue.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{getPriceRange(venue.priceRange)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">⭐</span>
                        <span className="text-sm font-medium text-gray-900">
                          {venue.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{venue.totalReviews}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {venue.recentReviews > 0 ? `+${venue.recentReviews}` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {venue.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          ⭐ Featured
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
