'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Review, Venue, User } from '@/types';
import { format } from 'date-fns';

interface ReviewWithDetails extends Review {
  venueName?: string;
  // userName is inherited from Review (denormalized field).
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  useEffect(() => {
    loadReviews();
  }, [filterRating]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const reviewsRef = collection(db, 'reviews');
      let q;

      if (filterRating === 'all') {
        q = query(reviewsRef, orderBy('createdAt', 'desc'));
      } else {
        q = query(
          reviewsRef,
          where('rating', '==', filterRating),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const reviewsData = await Promise.all(
        snapshot.docs.map(async (reviewDoc) => {
          const reviewData = {
            ...reviewDoc.data(),
            id: reviewDoc.id,
          } as Review;

          // Fetch venue name
          let venueName = 'Unknown Venue';
          try {
            const venueDoc = await getDoc(doc(db, 'venues', reviewData.venueId));
            if (venueDoc.exists()) {
              venueName = (venueDoc.data() as Venue).name;
            }
          } catch (error) {
            console.error('Error fetching venue:', error);
          }

          // Fetch user name
          let userName = 'Unknown User';
          try {
            const userDoc = await getDoc(doc(db, 'users', reviewData.userId));
            if (userDoc.exists()) {
              userName = (userDoc.data() as User).displayName;
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }

          return {
            ...reviewData,
            venueName,
            userName,
          };
        })
      );

      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      loadReviews();
      setSelectedReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Management</h1>
        <p className="text-gray-600">View and moderate user reviews</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by rating:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterRating('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterRating === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterRating === rating
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating} ⭐
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reviews List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No reviews found
              {filterRating !== 'all' && ` with ${filterRating} star rating`}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition ${
                    selectedReview?.id === review.id ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getRatingStars(review.rating)}</span>
                        <span className="text-sm text-gray-500">({review.rating}/5)</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{review.venueName}</h3>
                      <p className="text-sm text-gray-600">by {review.userName}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">{review.text}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{format(review.createdAt.toDate(), 'MMM d, yyyy')}</span>
                    <span>👍 {review.helpful} helpful</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Details Panel */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8 h-fit">
          {selectedReview ? (
            <div>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedReview.venueName}
                    </h2>
                    <div className="text-xl mb-2">
                      {getRatingStars(selectedReview.rating)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Reviewed by {selectedReview.userName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReview(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Review Text */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Review</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedReview.text}</p>
                </div>

                {/* Images */}
                {selectedReview.images && selectedReview.images.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Photos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReview.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Helpful Count</h3>
                    <p className="text-gray-600">👍 {selectedReview.helpful}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Date Posted</h3>
                    <p className="text-gray-600">
                      {format(selectedReview.createdAt.toDate(), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDeleteReview(selectedReview.id)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    🗑️ Delete Review
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p>Select a review to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
