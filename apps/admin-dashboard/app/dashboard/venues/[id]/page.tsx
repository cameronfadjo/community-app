'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { VenueDraft, VenueFormData } from '@community/types';
import { VenueForm } from '@/components/VenueForm';
import { loadVenue, updateVenue } from '@/lib/venues';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; venue: VenueDraft };

export default function EditVenuePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadVenue(id)
      .then((venue) => {
        if (!cancelled) setLoaded(venue ? { state: 'ready', venue } : { state: 'missing' });
      })
      .catch((error) => {
        console.error('Error loading venue:', error);
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

  if (loaded.state === 'missing') {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
        We couldn&apos;t find that venue.
      </div>
    );
  }

  const { venue } = loaded;

  const handleSubmit = async (form: VenueFormData) => {
    await updateVenue(venue, form);
    router.push('/dashboard/venues');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{venue.name}</h1>
        <p className="text-gray-600">
          Changes here do not change events already posted at this venue. Changing the name,
          address, or map position means the venue has to be verified again.
        </p>
      </div>

      <VenueForm
        initial={venue}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/venues')}
      />
    </div>
  );
}
