'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  SOCIAL_PLATFORMS,
  VENUE_CATEGORY_LABELS,
  getApprovalBlockers,
  getVerificationBlockers,
  isOpenForEvents,
  type ModerationStatus,
  type VenueCategory,
  type VenueDraft,
} from '@community/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  loadVenues,
  moveToWaiting,
  setVenueFeatured,
  setVenueStatus,
  verifyVenue,
} from '@/lib/venues';

type Filter = ModerationStatus | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'pending', label: 'Waiting' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const STATUS_LABELS: Record<ModerationStatus, string> = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLES: Record<ModerationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        verified ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'
      }`}
    >
      {verified ? 'Verified' : 'Unverified'}
    </span>
  );
}

// Venues from before the categories changed show their stored word
const categoryLabel = (category: string) =>
  VENUE_CATEGORY_LABELS[category as VenueCategory] ?? category;

const placeLine = (venue: VenueDraft) =>
  [venue.location.city, venue.location.state].filter(Boolean).join(', ');

const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];

const mapLink = (venue: VenueDraft) =>
  venue.location.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${venue.location.coordinates.latitude},${venue.location.coordinates.longitude}`
    : null;

export default function VenuesPage() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Bumped to load the list again after a change
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadVenues(filter)
      .then((loaded) => {
        if (!cancelled) setVenues(loaded);
      })
      .catch((error) => {
        console.error('Error loading venues:', error);
        if (!cancelled) setMessage("We couldn't load the venues. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, version]);

  const reload = () => {
    setLoading(true);
    setVersion((current) => current + 1);
  };

  const changeFilter = (next: Filter) => {
    setLoading(true);
    setSelectedId(null);
    setFilter(next);
  };

  const selected = venues.find((venue) => venue.id === selectedId) ?? null;
  const blockers = selected ? getApprovalBlockers(selected) : [];
  const verifyBlockers = selected ? getVerificationBlockers(selected) : [];
  const selectedMap = selected ? mapLink(selected) : null;

  const handleVerify = async (venue: VenueDraft) => {
    setMessage(null);
    if (!user) return;
    try {
      await verifyVenue(venue, user.uid);
      reload();
    } catch (error) {
      console.error('Error verifying venue:', error);
      setMessage("We couldn't mark the venue as verified. Try again.");
    }
  };

  // Approved before verifying existed, so nobody has checked them
  const neverChecked = venues.filter(
    (venue) => venue.moderationStatus === 'approved' && !isOpenForEvents(venue),
  );

  const handleMoveToWaiting = async () => {
    setMessage(null);
    try {
      await moveToWaiting(neverChecked.map((venue) => venue.id));
      setSelectedId(null);
      reload();
    } catch (error) {
      console.error('Error moving venues to waiting:', error);
      setMessage("We couldn't move those venues. Try again.");
    }
  };

  const handleStatus = async (venueId: string, status: ModerationStatus) => {
    setMessage(null);
    try {
      await setVenueStatus(venueId, status);
      setSelectedId(null);
      reload();
    } catch (error) {
      console.error('Error updating venue:', error);
      setMessage("We couldn't update the venue. Try again.");
    }
  };

  const handleFeatured = async (venueId: string, featured: boolean) => {
    setMessage(null);
    try {
      await setVenueFeatured(venueId, featured);
      reload();
    } catch (error) {
      console.error('Error updating venue:', error);
      setMessage("We couldn't update the venue. Try again.");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Venues</h1>
          <p className="text-gray-600">
            A venue must be approved before events can be posted there.
          </p>
        </div>
        <Link
          href="/dashboard/venues/new"
          className="px-5 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition whitespace-nowrap"
        >
          Add venue
        </Link>
      </div>

      {message && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {message}
        </div>
      )}

      {!loading && neverChecked.length > 0 && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
          <p className="font-semibold mb-1">
            {neverChecked.length === 1
              ? '1 approved venue has not been verified'
              : `${neverChecked.length} approved venues have not been verified`}
          </p>
          <p className="mb-3">
            Events can&apos;t be posted at a venue until its details are verified. Verify each one
            below, or move them all back to waiting and work through them there.
          </p>
          <button
            type="button"
            onClick={handleMoveToWaiting}
            className="px-4 py-2 rounded-lg bg-yellow-900 text-white font-medium hover:bg-yellow-950 transition"
          >
            Move {neverChecked.length === 1 ? 'it' : `all ${neverChecked.length}`} back to waiting
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2" role="group" aria-label="Show venues">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => changeFilter(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === option.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading venues...</p>
            </div>
          ) : venues.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No venues here yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {venues.map((venue) => {
                const missing = getApprovalBlockers(venue);
                return (
                  <li key={venue.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(venue.id)}
                      className={`w-full text-left p-6 hover:bg-gray-50 transition ${
                        selectedId === venue.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                          <p className="text-sm text-gray-500">
                            {categoryLabel(venue.category)} · {placeLine(venue)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={venue.moderationStatus} />
                          <VerifiedBadge verified={venue.detailsVerified === true} />
                        </div>
                      </div>
                      {missing.length > 0 && (
                        <p className="mt-2 text-sm text-yellow-800">Needs {listOf(missing)}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8 h-fit">
          {selected ? (
            <div>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selected.name}</h2>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.moderationStatus} />
                  <VerifiedBadge verified={selected.detailsVerified === true} />
                  {selected.featured && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>
              </div>

              <dl className="p-6 space-y-5 text-gray-600">
                <div>
                  <dt className="text-sm font-medium text-gray-700 mb-1">Kind of place</dt>
                  <dd>{categoryLabel(selected.category)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-700 mb-1">Where</dt>
                  <dd>
                    {selected.location.address || 'No street address yet'}
                    <br />
                    {placeLine(selected)} {selected.location.postalCode}
                  </dd>
                  <dd className="text-sm">
                    {selected.location.coordinates
                      ? `${selected.location.coordinates.latitude}, ${selected.location.coordinates.longitude}`
                      : 'No map position yet'}
                    {selectedMap && (
                      <>
                        {' · '}
                        <a
                          href={selectedMap}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 underline"
                        >
                          Check on the map
                        </a>
                      </>
                    )}
                  </dd>
                </div>
                {selected.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700 mb-1">Description</dt>
                    <dd>{selected.description}</dd>
                  </div>
                )}
                {(selected.contact?.website || selected.contact?.social) && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700 mb-1">Online</dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-1">
                      {selected.contact.website && (
                        <a
                          href={selected.contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 underline"
                        >
                          Website
                        </a>
                      )}
                      {SOCIAL_PLATFORMS.filter(
                        (platform) => selected.contact.social?.[platform.id],
                      ).map((platform) => (
                        <a
                          key={platform.id}
                          href={selected.contact.social?.[platform.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 underline"
                        >
                          {platform.label}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
                {selected.accessibility && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700 mb-1">Accessibility</dt>
                    <dd>{selected.accessibility}</dd>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-700 mb-1">Notes for admins</dt>
                    <dd>{selected.notes}</dd>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {selected.source && <p>From: {selected.source}</p>}
                  {selected.createdAt && (
                    <p>Added {format(selected.createdAt.toDate(), 'MMM d, yyyy')}</p>
                  )}
                  {selected.detailsVerified && selected.verifiedAt && (
                    <p>Verified {format(selected.verifiedAt.toDate(), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </dl>

              <div className="p-6 border-t border-gray-200 space-y-3">
                <Link
                  href={`/dashboard/venues/${selected.id}`}
                  className="block w-full text-center px-4 py-2 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 transition"
                >
                  Edit details
                </Link>

                {!selected.detailsVerified && (
                  <>
                    <button
                      type="button"
                      disabled={verifyBlockers.length > 0}
                      onClick={() => handleVerify(selected)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark details as verified
                    </button>
                    <p className="text-sm text-gray-600">
                      {verifyBlockers.length > 0
                        ? `It needs ${listOf(verifyBlockers)} first.`
                        : 'Only once you have checked the name, the address, and that the map position sits on the front door.'}
                    </p>
                  </>
                )}

                {selected.moderationStatus !== 'approved' && (
                  <>
                    <button
                      type="button"
                      disabled={blockers.length > 0}
                      onClick={() => handleStatus(selected.id, 'approved')}
                      className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve venue
                    </button>
                    {blockers.length > 0 && (
                      <p className="text-sm text-yellow-800">
                        Before it can be approved it needs {listOf(blockers)}.
                      </p>
                    )}
                  </>
                )}

                {selected.moderationStatus === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleStatus(selected.id, 'rejected')}
                    className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
                  >
                    Reject venue
                  </button>
                )}

                {selected.moderationStatus === 'approved' && (
                  <>
                    {isOpenForEvents(selected) && (
                      <button
                        type="button"
                        onClick={() => handleFeatured(selected.id, !selected.featured)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 transition"
                      >
                        {selected.featured ? 'Remove featured' : 'Make featured'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStatus(selected.id, 'rejected')}
                      className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
                    >
                      Take back approval
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">Select a venue to see its details</div>
          )}
        </div>
      </div>
    </div>
  );
}
