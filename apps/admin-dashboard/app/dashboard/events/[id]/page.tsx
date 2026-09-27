'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { EventFormData, EventListing, Venue } from '@community/types';
import { EventForm } from '@community/ui';
import { loadActivityOptions, loadApprovedVenues, loadEvent, updateEvent } from '@/lib/events';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; event: EventListing };

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadEvent(id)
      .then((event) => {
        if (!cancelled) setLoaded(event ? { state: 'ready', event } : { state: 'missing' });
      })
      .catch((error) => {
        console.error('Error loading event:', error);
        if (!cancelled) setLoaded({ state: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loaded.state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  // A host's own event is theirs to edit. Admins can take it down from the list.
  if (loaded.state === 'missing' || !loaded.event.postedOnBehalfBy) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center max-w-xl">
        <p className="text-lg font-semibold text-gray-900 mb-2">This event can&apos;t be edited here</p>
        <p className="text-gray-600 mb-6">
          It may have been removed, or its host posted it themselves.
        </p>
        <Link href="/dashboard/events" className="text-purple-700 font-medium hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  const { event } = loaded;

  const handleSubmit = async (form: EventFormData, venue: Venue) => {
    await updateEvent(event.id, form, venue);
    router.push('/dashboard/events');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit event</h1>
        <p className="text-gray-600">
          {event.seriesId
            ? 'This changes only this date, not the others in the series.'
            : 'Changes appear in the app straight away.'}
        </p>
      </div>

      <EventForm
        mode="edit"
        onBehalf
        initial={event}
        loadActivityOptions={loadActivityOptions}
        loadApprovedVenues={loadApprovedVenues}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/events')}
      />
    </div>
  );
}
