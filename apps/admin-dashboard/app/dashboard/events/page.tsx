'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getHostConfirmation, type EventListing } from '@community/types';
import {
  cancelUpcomingInSeries,
  confirmEvent,
  confirmUpcomingInSeries,
  loadUpcomingEvents,
  setEventStatus,
} from '@/lib/events';

type Filter = 'unconfirmed' | 'for_hosts' | 'all';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'unconfirmed', label: 'Not yet confirmed' },
  { value: 'for_hosts', label: 'Posted for hosts' },
  { value: 'all', label: 'All upcoming' },
];

const isUnconfirmed = (event: EventListing) =>
  getHostConfirmation({
    confirmedAtMs: event.confirmedAt?.toMillis(),
    postedOnBehalfBy: event.postedOnBehalfBy,
    handedOverAtMs: event.handedOverAt?.toMillis(),
  }) === 'unconfirmed';

const matches = (event: EventListing, filter: Filter) => {
  if (filter === 'all') return true;
  if (!event.postedOnBehalfBy) return false;
  return filter === 'for_hosts' || (isUnconfirmed(event) && event.status === 'scheduled');
};

function Badge({ tone, children }: { tone: 'yellow' | 'blue' | 'red' | 'gray'; children: string }) {
  const tones = {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-200 text-gray-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('unconfirmed');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // When the list was last loaded
  const [nowMs, setNowMs] = useState(0);

  // Bumped to load the list again after a change
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadedAt = Date.now();
    loadUpcomingEvents(loadedAt)
      .then((loaded) => {
        if (cancelled) return;
        setEvents(loaded);
        setNowMs(loadedAt);
      })
      .catch((error) => {
        console.error('Error loading events:', error);
        if (!cancelled) {
          setMessage({ tone: 'error', text: "We couldn't load the events. Refresh to try again." });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const run = async (eventId: string, action: () => Promise<string>) => {
    setMessage(null);
    setBusyId(eventId);
    try {
      const text = await action();
      setMessage({ tone: 'success', text });
      setVersion((current) => current + 1);
    } catch (error) {
      console.error('Error updating event:', error);
      setMessage({ tone: 'error', text: "We couldn't make that change. Try again." });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = (event: EventListing, wholeSeries: boolean) =>
    run(event.id, async () => {
      if (wholeSeries && event.seriesId) {
        // The one on now counts too
        await confirmEvent(event.id);
        const count = await confirmUpcomingInSeries(events, event.seriesId, nowMs);
        return `Marked ${Math.max(count, 1)} dates as confirmed by the host.`;
      }
      await confirmEvent(event.id);
      return 'Marked as confirmed by the host.';
    });

  const handleTakeDown = (event: EventListing, wholeSeries: boolean) =>
    run(event.id, async () => {
      if (wholeSeries && event.seriesId) {
        await setEventStatus(event.id, 'cancelled');
        const count = await cancelUpcomingInSeries(events, event.seriesId, nowMs);
        return `Took down ${Math.max(count, 1)} dates.`;
      }
      await setEventStatus(event.id, 'cancelled');
      return 'Event taken down.';
    });

  const visible = events.filter((event) => matches(event, filter));

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">
            Post an event for a host who doesn&apos;t have an account yet, and take down any event.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition whitespace-nowrap"
        >
          Post for a host
        </Link>
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
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show events">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
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
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No events here.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {visible.map((event) => {
              const cancelled = event.status === 'cancelled';
              const unconfirmed = isUnconfirmed(event);
              const busy = busyId === event.id;
              return (
                <li key={event.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
                      <p className="text-sm text-gray-600">
                        {format(event.startsAt.toDate(), 'EEE, MMM d')} ·{' '}
                        {format(event.startsAt.toDate(), 'h:mm a')} to{' '}
                        {format(event.endsAt.toDate(), 'h:mm a')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.venueName}, {event.location.city}
                        {event.organizerName ? ` · Hosted by ${event.organizerName}` : ''}
                      </p>
                      {event.detailsSource && (
                        <p className="text-sm text-gray-500 mt-1">
                          Details from: {event.detailsSource}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cancelled && <Badge tone="red">Taken down</Badge>}
                      {event.postedOnBehalfBy && <Badge tone="blue">Posted for host</Badge>}
                      {event.postedOnBehalfBy && !cancelled && (
                        <Badge tone={unconfirmed ? 'yellow' : 'gray'}>
                          {unconfirmed ? 'Not yet confirmed' : 'Confirmed by host'}
                        </Badge>
                      )}
                      {event.seriesId && <Badge tone="gray">Repeats</Badge>}
                    </div>
                  </div>

                  {!cancelled && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.postedOnBehalfBy && (
                        <Link
                          href={`/dashboard/events/${event.id}`}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 transition"
                        >
                          Edit
                        </Link>
                      )}
                      {unconfirmed && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConfirm(event, false)}
                          className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
                        >
                          Host confirmed this date
                        </button>
                      )}
                      {unconfirmed && event.seriesId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConfirm(event, true)}
                          className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
                        >
                          Host confirmed every date
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleTakeDown(event, false)}
                        className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-800 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        Take down
                      </button>
                      {event.seriesId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleTakeDown(event, true)}
                          className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-800 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          Take down every date
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
