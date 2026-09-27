'use client';

import { useRouter } from 'next/navigation';
import type { VenueFormData } from '@community/types';
import { VenueForm } from '@/components/VenueForm';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createVenue } from '@/lib/venues';

export default function NewVenuePage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (form: VenueFormData) => {
    if (!user) {
      throw new Error('Not signed in');
    }
    await createVenue(form, user.uid);
    router.push('/dashboard/venues');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add a venue</h1>
        <p className="text-gray-600">
          It is saved as waiting and unverified. Verify and approve it from the venues list once
          the details have been checked.
        </p>
      </div>

      <VenueForm
        submitLabel="Save venue"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/dashboard/venues')}
      />
    </div>
  );
}
