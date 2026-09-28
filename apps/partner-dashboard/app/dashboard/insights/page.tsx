'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  MIN_FOR_BREAKDOWN,
  buildFunnel,
  canShowBreakdown,
  rollUpByVenue,
  summarizeSignals,
  type EventListing,
  type SignalDay,
  type SignalSummary,
} from '@community/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Bars, CountsTable, Funnel, hourLabel } from '@/components/insights';
import { loadMyEvents, loadPerkCounts, loadSignalDays, type PerkCounts } from '@/lib/events';

// Events further back than this are left out, to keep the page quick
const LOOK_BACK_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Row {
  event: EventListing;
  summary: SignalSummary;
  perks: PerkCounts;
}

const ALL = 'all';

export default function InsightsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(ALL);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const since = Date.now() - LOOK_BACK_DAYS * MS_PER_DAY;

    const load = async (): Promise<Row[]> => {
      const [mine, perkCounts] = await Promise.all([
        loadMyEvents(user.uid),
        loadPerkCounts(user.uid),
      ]);
      const recent = mine.filter((event) => event.endsAt.toMillis() >= since);
      const days = await Promise.all(recent.map((event) => loadSignalDays(event.id)));

      return recent.map((event, index) => ({
        event,
        summary: summarizeSignals(days[index] as SignalDay[]),
        perks: perkCounts[event.id] ?? { unlocked: 0, redeemed: 0 },
      }));
    };

    load()
      .then((loaded) => {
        if (!cancelled) setRows(loaded);
      })
      .catch((error) => {
        console.error('Error loading insights:', error);
        if (!cancelled) setLoadError("We couldn't load your numbers. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const shown = useMemo(
    () => (selected === ALL ? rows : rows.filter((row) => row.event.id === selected)),
    [rows, selected],
  );

  const totals = useMemo(() => {
    const byHour = Array.from({ length: 24 }, () => 0);
    const byDay = new Map<string, number>();
    let views = 0;
    let saves = 0;
    let directions = 0;
    let perkViews = 0;
    let perkUnlocked = 0;
    let perkRedeemed = 0;

    for (const { summary, perks } of shown) {
      views += summary.views;
      saves += summary.saves;
      directions += summary.directions;
      perkViews += summary.perkViews;
      perkUnlocked += perks.unlocked;
      perkRedeemed += perks.redeemed;
      summary.byHour.forEach((value, hour) => {
        byHour[hour] = (byHour[hour] ?? 0) + value;
      });
      for (const { day, views: dayViews } of summary.byDay) {
        byDay.set(day, (byDay.get(day) ?? 0) + dayViews);
      }
    }

    return {
      views,
      saves,
      directions,
      perkViews,
      perkUnlocked,
      perkRedeemed,
      hasPerk: shown.some((row) => Boolean(row.event.perkLabel)),
      byHour,
      byDay: [...byDay.entries()]
        .map(([day, dayViews]) => ({ day, views: dayViews }))
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(-14),
    };
  }, [shown]);

  const venues = useMemo(
    () =>
      rollUpByVenue(
        rows.map(({ event, summary, perks }) => ({
          venueId: event.venueId,
          venueName: event.venueName,
          views: summary.views,
          saves: summary.saves,
          directions: summary.directions,
          perkViews: summary.perkViews,
          perkUnlocked: perks.unlocked,
          perkRedeemed: perks.redeemed,
        })),
      ),
    [rows],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
        <p className="text-gray-600">
          How people are finding your events. These are counts only: we never record who looked,
          and neither can you.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {loadError}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
          Post an event and its numbers will appear here.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
              Show
            </label>
            <select
              id="event"
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value={ALL}>All events from the last {LOOK_BACK_DAYS} days</option>
              {rows.map(({ event }) => (
                <option key={event.id} value={event.id}>
                  {event.title} · {format(event.startsAt.toDate(), 'EEE, MMM d')}
                </option>
              ))}
            </select>
          </div>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">From seeing it to turning up</h2>
            <p className="text-sm text-gray-600 mb-5">
              Each phone is counted once per event per day. Saved counts how many times people
              saved the event to come back to. It stays the same if someone later takes it off
              their list, and a saved list never leaves the phone it is on.
            </p>
            <Funnel steps={buildFunnel(totals)} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">When people looked</h2>
            {canShowBreakdown(totals.views) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Bars
                  title="Views by day"
                  everyNthLabel={Math.ceil(totals.byDay.length / 5)}
                  items={totals.byDay.map(({ day, views }) => ({
                    key: day,
                    label: format(parseISO(day), 'MMM d'),
                    detail: format(parseISO(day), 'EEE, MMM d'),
                    value: views,
                  }))}
                />
                <Bars
                  title="Views by time of day"
                  everyNthLabel={6}
                  items={totals.byHour.map((value, hour) => ({
                    key: String(hour),
                    label: hourLabel(hour),
                    detail: `${hourLabel(hour)} to ${hourLabel((hour + 1) % 24)}`,
                    value,
                  }))}
                />
              </div>
            ) : (
              <p className="text-gray-600">
                This appears once there are {MIN_FOR_BREAKDOWN} views. With fewer, the timing could
                point to one person.
              </p>
            )}
          </section>

          {selected === ALL && (
            <>
              <section className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">By venue</h2>
                <CountsTable
                  firstHeading="Venue"
                  rows={venues.map((venue) => ({
                    key: venue.venueId,
                    name: venue.venueName,
                    note: `${venue.events} event${venue.events === 1 ? '' : 's'}`,
                    ...venue,
                  }))}
                />
              </section>

              <section className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">By event</h2>
                <CountsTable
                  firstHeading="Event"
                  rows={rows.map(({ event, summary, perks }) => ({
                    key: event.id,
                    name: event.title,
                    note: `${format(event.startsAt.toDate(), 'EEE, MMM d')} · ${event.venueName}`,
                    views: summary.views,
                    saves: summary.saves,
                    directions: summary.directions,
                    perkViews: summary.perkViews,
                    perkUnlocked: perks.unlocked,
                    perkRedeemed: perks.redeemed,
                  }))}
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
