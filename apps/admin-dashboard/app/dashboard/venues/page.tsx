'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Venue, ModerationStatus } from '@/types';
import { format } from 'date-fns';

async function fetchVenues(filter: ModerationStatus | 'all'): Promise<Venue[]> {
  const ref = collection(db, 'venues');
  const q =
    filter === 'all'
      ? query(ref, orderBy('createdAt', 'desc'))
      : query(ref, where('moderationStatus', '==', filter), orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id })) as Venue[];
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ModerationStatus | 'all'>('pending');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Bumped to load the list again after a change
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchVenues(filter)
      .then((loaded) => {
        if (!cancelled) setVenues(loaded);
      })
      .catch((error) => console.error('Error loading venues:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, version]);

  const loadVenues = () => {
    setLoading(true);
    setVersion((current) => current + 1);
  };

  const changeFilter = (next: ModerationStatus | 'all') => {
    setLoading(true);
    setFilter(next);
  };

  const handleModerate = async (venueId: string, status: ModerationStatus) => {
    try {
      const venueRef = doc(db, 'venues', venueId);
      await updateDoc(venueRef, {
        moderationStatus: status,
        updatedAt: serverTimestamp(),
      });

      // Refresh the list
      loadVenues();
      setSelectedVenue(null);
    } catch (error) {
      console.error('Error moderating venue:', error);
      alert('Failed to update venue status');
    }
  };

  const toggleFeatured = async (venueId: string, currentStatus: boolean) => {
    try {
      const venueRef = doc(db, 'venues', venueId);
      await updateDoc(venueRef, {
        featured: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      // Refresh the list
      loadVenues();
      if (selectedVenue?.id === venueId) {
        setSelectedVenue({ ...selectedVenue, featured: !currentStatus });
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status');
    }
  };

  const getStatusBadge = (status: ModerationStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Venue Moderation</h1>
        <p className="text-gray-600">Review and approve venue submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => changeFilter(status as ModerationStatus | 'all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venues List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading venues...</p>
            </div>
          ) : venues.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No venues found with status: {filter}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue)}
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition ${
                    selectedVenue?.id === venue.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getCategoryIcon(venue.category)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                        {venue.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{venue.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{venue.location.city}, {venue.location.country}</span>
                        <span>{getPriceRange(venue.priceRange)}</span>
                        <span className="capitalize">{venue.category}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(venue.moderationStatus)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>Submitted: {venue.createdAt && format(venue.createdAt.toDate(), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Venue Details Panel */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8 h-fit">
          {selectedVenue ? (
            <div>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedVenue.name}</h2>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedVenue.moderationStatus)}
                      {selectedVenue.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVenue(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedVenue.description}</p>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Location</h3>
                  <p className="text-gray-600">{selectedVenue.location.address}</p>
                  <p className="text-gray-600">{selectedVenue.location.city}, {selectedVenue.location.country}</p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
                    <p className="text-gray-600 capitalize">{selectedVenue.category}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Price Range</h3>
                    <p className="text-gray-600">{getPriceRange(selectedVenue.priceRange)}</p>
                  </div>
                </div>

                {/* Contact */}
                {(selectedVenue.contact.phone || selectedVenue.contact.email || selectedVenue.contact.website) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Contact</h3>
                    {selectedVenue.contact.phone && (
                      <p className="text-gray-600">📞 {selectedVenue.contact.phone}</p>
                    )}
                    {selectedVenue.contact.email && (
                      <p className="text-gray-600">📧 {selectedVenue.contact.email}</p>
                    )}
                    {selectedVenue.contact.website && (
                      <p className="text-gray-600">
                        🌐 <a href={selectedVenue.contact.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                          {selectedVenue.contact.website}
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  {selectedVenue.moderationStatus === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModerate(selectedVenue.id, 'approved')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        ✓ Approve Venue
                      </button>
                      <button
                        onClick={() => handleModerate(selectedVenue.id, 'rejected')}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        ✗ Reject Venue
                      </button>
                    </div>
                  )}
                  {selectedVenue.moderationStatus === 'approved' && (
                    <>
                      <button
                        onClick={() => toggleFeatured(selectedVenue.id, selectedVenue.featured)}
                        className={`w-full px-4 py-2 rounded-lg transition font-medium ${
                          selectedVenue.featured
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }`}
                      >
                        {selectedVenue.featured ? '⭐ Remove Featured' : '⭐ Make Featured'}
                      </button>
                      <button
                        onClick={() => handleModerate(selectedVenue.id, 'rejected')}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Revoke Approval
                      </button>
                    </>
                  )}
                  {selectedVenue.moderationStatus === 'rejected' && (
                    <button
                      onClick={() => handleModerate(selectedVenue.id, 'approved')}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Approve Venue
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Select a venue to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
