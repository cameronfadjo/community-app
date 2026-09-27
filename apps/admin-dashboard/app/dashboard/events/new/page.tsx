'use client';

import { useRouter } from 'next/navigation';
import type { EventFormData, Venue } from '@community/types';
import { EventForm } from '@community/ui';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createEvents, loadActivityOptions, loadApprovedVenues } from '@/lib/events';

export default function NewEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (form: EventFormData, venue: Venue) => {
    if (!user) {
      throw new Error('Not signed in');
    }
    await createEvents(form, venue, user.uid);
    router.push('/dashboard/events');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post an event for a host</h1>
        <p className="text-gray-600">
          It appears in the app as soon as you post it. Until the host confirms the details, the
          app shows it as not yet confirmed.
        </p>
      </div>

      <EventForm
        mode="create"
        onBehalf
        loadActivityOptions={loadActivityOptions}
        loadApprovedVenues={loadApprovedVenues}
        submitLabel="Post event"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/events')}
      />
    </div>
  );
}
