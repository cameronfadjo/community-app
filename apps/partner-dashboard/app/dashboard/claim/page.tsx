'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  MAX_CLAIM_NOTE_LENGTH,
  getClaimId,
  groupClaimableEvents,
  validateClaim,
  type ClaimFormErrors,
  type ClaimableGroup,
  type EventClaim,
} from '@community/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { createClaim, loadMyClaims, loadUpcomingEvents, withdrawClaim } from '@/lib/events';

const STATUS_TEXT: Record<EventClaim['status'], string> = {
  pending: 'Waiting for us to check',
  approved: 'Handed over to you',
  rejected: 'Not handed over. Get in touch if this is wrong.',
};

const STATUS_STYLES: Record<EventClaim['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ClaimPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<ClaimableGroup[]>([]);
  const [claims, setClaims] = useState<EventClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [detailsCorrect, setDetailsCorrect] = useState(true);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<ClaimFormErrors>({});
  const [saving, setSaving] = useState(false);

  // Bumped to load the lists again after a change
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const nowMs = Date.now();

    Promise.all([loadUpcomingEvents(nowMs), loadMyClaims(user.uid)])
      .then(([events, mine]) => {
        if (cancelled) return;
        setGroups(
          groupClaimableEvents(
            events.map((event) => ({ ...event, startsAtMs: event.startsAt.toMillis() })),
            nowMs,
          ),
        );
        setClaims(mine);
        setLoadError(null);
      })
      .catch((error) => {
        console.error('Error loading events to claim:', error);
        if (!cancelled) setLoadError("We couldn't load the events. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, version]);

  // A claim is made once. One that was turned down is settled by talking to
  // us, not by asking again.
  const claimedKeys = useMemo(() => new Set(claims.map((claim) => claim.claimKey)), [claims]);

  const visible = useMemo(() => {
    const words = search.trim().toLowerCase();
    return groups
      .filter((group) => !claimedKeys.has(group.claimKey))
      .filter(
        (group) =>
          !words ||
          [group.title, group.organizerName ?? '', group.venueName]
            .join(' ')
            .toLowerCase()
            .includes(words),
      );
  }, [groups, claimedKeys, search]);

  const open = (claimKey: string) => {
    setOpenKey(claimKey);
    setIsHost(false);
    setDetailsCorrect(true);
    setNote('');
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent, group: ClaimableGroup) => {
    event.preventDefault();
    if (!user?.email) return;

    const found = validateClaim({ isHost, note });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await createClaim(group, { uid: user.uid, email: user.email }, { note, detailsCorrect });
      showToast('success', "Sent. We'll check and hand it over.");
      setOpenKey(null);
      setVersion((current) => current + 1);
    } catch (error) {
      console.error('Error sending claim:', error);
      showToast('error', "We couldn't send that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (claim: EventClaim) => {
    if (!user) return;
    try {
      await withdrawClaim(getClaimId(claim.claimKey, user.uid));
      showToast('success', 'Claim taken back');
      setVersion((current) => current + 1);
    } catch (error) {
      console.error('Error taking back claim:', error);
      showToast('error', "We couldn't take that back. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim your events</h1>
        <p className="text-gray-600">
          We may have listed an event you run before you joined. Claim it and we&apos;ll hand it
          over, so you can keep it up to date yourself.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {loadError}
        </div>
      )}

      {claims.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your claims</h2>
          <ul className="divide-y divide-gray-200">
            {claims.map((claim) => (
              <li key={claim.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{claim.eventTitle}</p>
                  <p className="text-sm text-gray-600">{claim.venueName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[claim.status]}`}
                  >
                    {STATUS_TEXT[claim.status]}
                  </span>
                  {claim.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(claim)}
                      className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
                    >
                      Take back
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Events waiting for their host</h2>

        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
          Search by event, host, or venue
        </label>
        <input
          id="search"
          type="search"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 mb-4 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {visible.length === 0 ? (
          <p className="text-gray-500 py-6 text-center">
            {groups.length === 0 ? 'No events are waiting for a host.' : 'Nothing matches.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {visible.map((group) => (
              <li key={group.claimKey} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{group.title}</p>
                    <p className="text-sm text-gray-600">
                      {group.venueName}
                      {group.organizerName ? ` · Hosted by ${group.organizerName}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      Next: {format(new Date(group.nextStartsAtMs), 'EEE, MMM d · h:mm a')}
                      {group.dates > 1 ? ` · ${group.dates} dates` : ''}
                    </p>
                  </div>
                  {openKey !== group.claimKey && (
                    <button
                      type="button"
                      onClick={() => open(group.claimKey)}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
                    >
                      This is mine
                    </button>
                  )}
                </div>

                {openKey === group.claimKey && (
                  <form
                    onSubmit={(e) => handleSubmit(e, group)}
                    className="mt-4 rounded-lg border border-gray-200 p-4 space-y-4"
                    noValidate
                  >
                    <div>
                      <label className="flex items-start gap-3 text-sm font-medium text-gray-900">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          checked={isHost}
                          onChange={(e) => setIsHost(e.target.checked)}
                        />
                        I run this event, or I&apos;m posting for the people who do
                      </label>
                      {errors.isHost && (
                        <p className="mt-1 text-sm text-red-700" role="alert">
                          {errors.isHost}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                        How are you involved?
                      </label>
                      <textarea
                        id="note"
                        rows={3}
                        maxLength={MAX_CLAIM_NOTE_LENGTH}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      {errors.note ? (
                        <p className="mt-1 text-sm text-red-700" role="alert">
                          {errors.note}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500">
                          For example your role, or where we can see you listed as the organizer.
                        </p>
                      )}
                    </div>

                    <fieldset>
                      <legend className="text-sm font-medium text-gray-700 mb-2">
                        Are the details we listed right?
                      </legend>
                      <div className="space-y-2 text-sm text-gray-900">
                        <label className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="details"
                            checked={detailsCorrect}
                            onChange={() => setDetailsCorrect(true)}
                          />
                          Yes, they&apos;re right
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="details"
                            checked={!detailsCorrect}
                            onChange={() => setDetailsCorrect(false)}
                          />
                          No, I&apos;ll correct them once it&apos;s mine
                        </label>
                      </div>
                    </fieldset>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Sending...' : 'Send claim'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenKey(null)}
                        disabled={saving}
                        className="px-5 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
