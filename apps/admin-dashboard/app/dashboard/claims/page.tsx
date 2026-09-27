'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { EventClaim } from '@community/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { approveClaim, loadClaims, rejectClaim } from '@/lib/events';

type Filter = EventClaim['status'];

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'pending', label: 'Waiting' },
  { value: 'approved', label: 'Handed over' },
  { value: 'rejected', label: 'Turned down' },
];

export default function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<EventClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Bumped to load the list again after a change
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadClaims(filter)
      .then((loaded) => {
        if (!cancelled) setClaims(loaded);
      })
      .catch((error) => {
        console.error('Error loading claims:', error);
        if (!cancelled) {
          setMessage({ tone: 'error', text: "We couldn't load the claims. Refresh to try again." });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, version]);

  const changeFilter = (next: Filter) => {
    setLoading(true);
    setFilter(next);
  };

  const run = async (claimId: string, action: () => Promise<string>) => {
    if (!user) return;
    setMessage(null);
    setBusyId(claimId);
    try {
      const text = await action();
      setMessage({ tone: 'success', text });
      setLoading(true);
      setVersion((current) => current + 1);
    } catch (error) {
      console.error('Error deciding claim:', error);
      setMessage({ tone: 'error', text: "We couldn't make that change. Try again." });
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (claim: EventClaim) =>
    run(claim.id, async () => {
      const count = await approveClaim(claim, user!.uid, Date.now());
      return count === 0
        ? `Approved, but no upcoming dates were left to hand over to ${claim.partnerEmail}.`
        : `Handed ${count} date${count === 1 ? '' : 's'} over to ${claim.partnerEmail}.`;
    });

  const handleReject = (claim: EventClaim) =>
    run(claim.id, async () => {
      await rejectClaim(claim.id, user!.uid);
      return 'Claim turned down. The event stays as it is.';
    });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Claims</h1>
        <p className="text-gray-600">
          Hosts asking to take over events posted for them. Check each one before handing it over:
          the host will be able to change or cancel the event.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg border p-4 text-sm ${
            message.tone === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show claims">
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading claims...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No claims here.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {claims.map((claim) => (
              <li key={claim.id} className="p-6">
                <h2 className="text-lg font-semibold text-gray-900">{claim.eventTitle}</h2>
                <p className="text-sm text-gray-600">
                  {claim.venueName}
                  {claim.organizerName ? ` · Listed host: ${claim.organizerName}` : ''}
                </p>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Asked by</dt>
                    <dd className="text-gray-600">{claim.partnerEmail}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Asked on</dt>
                    <dd className="text-gray-600">
                      {claim.createdAt ? format(claim.createdAt.toDate(), 'MMM d, yyyy') : ''}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-700">How they are involved</dt>
                    <dd className="text-gray-600 whitespace-pre-line">{claim.note}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-700">The details we listed</dt>
                    <dd className="text-gray-600">
                      {claim.detailsCorrect
                        ? 'They say the details are right. Handing over marks the event as confirmed.'
                        : 'They will correct them. The event stays "not yet confirmed" until they do.'}
                    </dd>
                  </div>
                </dl>

                {claim.status === 'pending' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === claim.id}
                      onClick={() => handleApprove(claim)}
                      className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
                    >
                      Hand over
                    </button>
                    <button
                      type="button"
                      disabled={busyId === claim.id}
                      onClick={() => handleReject(claim)}
                      className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-800 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Turn down
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
