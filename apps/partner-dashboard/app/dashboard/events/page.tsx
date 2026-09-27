'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { EventListing } from '@/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import {
  cancelUpcomingInSeries,
  confirmEvent,
  loadMyEvents,
  loadPerkCounts,
  type PerkCounts,
  setEventStatus,
} from '@/lib/events';

type Filter = 'upcoming' | 'past' | 'cancelled';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

const formatCover = (cents: number) => (cents > 0 ? `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}` : 'Free');

export default function EventsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [busyId, setBusyId] = useState<string | null>(null);
  // When the list was last loaded, used to split upcoming from past
  const [nowMs, setNowMs] = useState(0);
  const [perkCounts, setPerkCounts] = useState<Record<string, PerkCounts>>({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const mine = await loadMyEvents(user.uid);
      setEvents(mine);
      setNowMs(Date.now());
      setLoadError(null);
    } catch (error) {
      console.error('Error loading events:', error);
      setLoadError("We couldn't load your events. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;

    loadMyEvents(user.uid)
      .then((mine) => {
        if (cancelled) return;
        setEvents(mine);
        setNowMs(Date.now());
      })
      .catch((error) => {
        console.error('Error loading events:', error);
        if (!cancelled) setLoadError("We couldn't load your events. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Perk totals are a nice-to-have, so a failure here doesn't block the list
    loadPerkCounts(user.uid)
      .then((counts) => {
        if (!cancelled) setPerkCounts(counts);
      })
      .catch((error) => console.error('Error loading perk counts:', error));

    return () => {
      cancelled = true;
    };
  }, [user]);

  const visible = useMemo(() => {
    const matching = events.filter((event) => {
      if (filter === 'cancelled') return event.status === 'cancelled';
      if (event.status === 'cancelled') return false;
      const ended = event.endsAt.toMillis() <= nowMs;
      return filter === 'past' ? ended : !ended;
    });
    // Upcoming reads soonest first; the rest most recent first
    return filter === 'upcoming' ? [...matching].reverse() : matching;
  }, [events, filter, nowMs]);

  const run = async (eventId: string, action: () => Promise<void>, success: string) => {
    setBusyId(eventId);
    try {
      await action();
      showToast('success', success);
      await load();
    } catch (error) {
      console.error('Error updating event:', error);
      showToast('error', "That didn't save. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (event: EventListing) => {
    if (!window.confirm(`Cancel "${event.title}" on ${format(event.startsAt.toDate(), 'EEE, MMM d')}? People will see it as cancelled.`)) {
      return;
    }
    run(event.id, () => setEventStatus(event.id, 'cancelled'), 'Event cancelled');
  };

  const handleCancelSeries = (event: EventListing) => {
    if (!event.seriesId) return;
    const seriesId = event.seriesId;
    if (!window.confirm(`Cancel every upcoming "${event.title}"? This can't be undone in one step.`)) {
      return;
    }
    run(
      event.id,
      async () => {
        await cancelUpcomingInSeries(events, seriesId, Date.now());
      },
      'Upcoming events in the series cancelled',
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your events</h1>
          <p className="text-gray-600">Events publish straight away and appear in the app.</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
        >
          Post an event
        </Link>
      </div>

      <div className="flex gap-2 mb-6" role="tablist" aria-label="Filter events">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === option.value
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 mb-6" role="alert">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-1">
            {filter === 'upcoming' ? 'No upcoming events' : `No ${filter} events`}
          </p>
          {filter === 'upcoming' && (
            <p className="text-gray-600">Post one and it will show up in the app right away.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((event) => {
            const start = event.startsAt.toDate();
            const end = event.endsAt.toDate();
            const isUpcoming = filter === 'upcoming';
            const busy = busyId === event.id;

            return (
              <li key={event.id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
                      {event.seriesId && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Weekly
                        </span>
                      )}
                      {event.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')} to {format(end, 'h:mm a')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.venueName} · {formatCover(event.coverCents)}
                      {event.perkLabel && ` · Perk: ${event.perkLabel}`}
                    </p>
                    {event.perkLabel && perkCounts[event.id] && (
                      <p className="text-sm text-purple-800 mt-1">
                        {perkCounts[event.id].unlocked} arrived and unlocked the perk ·{' '}
                        {perkCounts[event.id].redeemed} redeemed
                      </p>
                    )}
                    {isUpcoming && event.confirmedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Details confirmed {format(event.confirmedAt.toDate(), 'MMM d')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isUpcoming && (
                      <>
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => run(event.id, () => confirmEvent(event.id), 'Marked as still correct')}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition disabled:opacity-50"
                        >
                          Still correct
                        </button>
                      </>
                    )}
                    <Link
                      href={`/dashboard/events/new?from=${event.id}`}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                    >
                      Copy
                    </Link>
                    {isUpcoming && (
                      <>
                        <button
                          onClick={() => handleCancel(event)}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          Cancel event
                        </button>
                        {event.seriesId && (
                          <button
                            onClick={() => handleCancelSeries(event)}
                            disabled={busy}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                          >
                            Cancel all upcoming
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
