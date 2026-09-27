'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { EventFormData, EventListing, Venue } from '@/types';
import { EventForm } from '@/components/EventForm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { loadEvent, updateEvent } from '@/lib/events';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadEvent(id)
      .then((found) => {
        if (!cancelled) setEvent(found);
      })
      .catch((error) => console.error('Error loading event:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (form: EventFormData, venue: Venue) => {
    await updateEvent(id, form, venue);
    showToast('success', 'Changes saved');
    router.push('/dashboard/events');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  // Events belong to whoever posted them
  if (!event || event.organizerId !== user?.uid) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center max-w-xl">
        <p className="text-lg font-semibold text-gray-900 mb-2">We couldn&apos;t find that event</p>
        <p className="text-gray-600 mb-6">It may have been removed, or it was posted by someone else.</p>
        <Link href="/dashboard/events" className="text-purple-700 font-medium hover:underline">
          Back to your events
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit event</h1>
        <p className="text-gray-600">
          {event.seriesId
            ? 'This changes only this date, not the other weeks.'
            : 'Changes appear in the app straight away.'}
        </p>
      </div>

      <EventForm
        mode="edit"
        initial={event}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/events')}
      />
    </div>
  );
}
