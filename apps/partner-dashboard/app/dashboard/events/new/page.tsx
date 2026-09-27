'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EventFormData, EventListing, Venue } from '@/types';
import { EventForm } from '@/components/EventForm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/toast';
import { createEvents, loadEvent } from '@/lib/events';

function NewEvent() {
  const router = useRouter();
  const copyFromId = useSearchParams().get('from');
  const { user } = useAuth();
  const { showToast } = useToast();

  const [source, setSource] = useState<EventListing | null>(null);
  const [loading, setLoading] = useState(Boolean(copyFromId));

  useEffect(() => {
    if (!copyFromId) return;
    let cancelled = false;
    loadEvent(copyFromId)
      .then((event) => {
        if (!cancelled) setSource(event);
      })
      .catch((error) => console.error('Error loading event to copy:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copyFromId]);

  const handleSubmit = async (form: EventFormData, venue: Venue) => {
    if (!user) return;
    const count = await createEvents(form, venue, user.uid);
    showToast('success', count === 1 ? 'Event posted' : `${count} events posted`);
    router.push('/dashboard/events');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post an event</h1>
        <p className="text-gray-600">
          {source
            ? `Copied from "${source.title}". Choose a new date.`
            : 'It appears in the app as soon as you post it.'}
        </p>
      </div>

      <EventForm
        mode="create"
        initial={source}
        submitLabel="Post event"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/events')}
      />
    </div>
  );
}

export default function NewEventPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <NewEvent />
    </Suspense>
  );
}
