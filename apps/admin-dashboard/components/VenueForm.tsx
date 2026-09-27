'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  MAX_VENUE_NAME_LENGTH,
  SOCIAL_PLATFORMS,
  normalizeSocialLink,
  VENUE_CATEGORIES,
  VENUE_CATEGORY_LABELS,
  getVerificationBlockers,
  parseCoordinates,
  validateVenueForm,
  type SocialPlatform,
  type VenueCategory,
  type VenueDraft,
  type VenueFormData,
  type VenueFormErrors,
} from '@community/types';

interface VenueFormProps {
  /** Venue to edit. Leave out to add a new one. */
  initial?: VenueDraft | null;
  submitLabel: string;
  onSubmit: (form: VenueFormData) => Promise<void>;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200';

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

const isKnownCategory = (value: string | undefined): value is VenueCategory =>
  VENUE_CATEGORIES.includes(value as VenueCategory);

const toForm = (venue?: VenueDraft | null): VenueFormData => ({
  name: venue?.name ?? '',
  description: venue?.description ?? '',
  // Venues from before the categories changed fall back to Other
  category: isKnownCategory(venue?.category) ? venue.category : 'other',
  address: venue?.location.address ?? '',
  city: venue?.location.city ?? '',
  state: venue?.location.state ?? 'CT',
  postalCode: venue?.location.postalCode ?? '',
  coordinates: venue?.location.coordinates
    ? `${venue.location.coordinates.latitude}, ${venue.location.coordinates.longitude}`
    : '',
  phone: venue?.contact?.phone ?? '',
  email: venue?.contact?.email ?? '',
  website: venue?.contact?.website ?? '',
  social: { ...(venue?.contact?.social ?? {}) },
  accessibility: venue?.accessibility ?? '',
  notes: venue?.notes ?? '',
});

export function VenueForm({ initial, submitLabel, onSubmit, onCancel }: VenueFormProps) {
  const [form, setForm] = useState<VenueFormData>(() => toForm(initial));
  const [errors, setErrors] = useState<VenueFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: Exclude<keyof VenueFormData, 'social'>) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const setSocial = (platform: SocialPlatform) => (value: string) =>
    setForm((current) => ({ ...current, social: { ...current.social, [platform]: value } }));

  const position = parseCoordinates(form.coordinates);
  const blockers = getVerificationBlockers({
    location: { address: form.address, coordinates: position },
  });

  const searchText = [form.name, form.address, form.city, form.state].filter(Boolean).join(', ');
  const findOnMap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`;
  const checkOnMap = position
    ? `https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}`
    : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const found = validateVenueForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSubmitError('Some details need fixing. Check the messages above.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (error) {
      console.error('Error saving venue:', error);
      setSubmitError("We couldn't save the venue. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl" noValidate>
      <Section title="The place">
        <Field label="Name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            className={inputClass}
            value={form.name}
            maxLength={MAX_VENUE_NAME_LENGTH}
            onChange={(e) => set('name')(e.target.value)}
          />
        </Field>

        <Field label="Kind of place" htmlFor="category">
          <select
            id="category"
            className={inputClass}
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
          >
            {VENUE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {VENUE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Description (optional)"
          htmlFor="description"
          hint="A sentence or two on what kind of place it is."
        >
          <textarea
            id="description"
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Where it is">
        <Field
          label="Street address"
          htmlFor="address"
          hint="Needed before the venue can be approved."
        >
          <input
            id="address"
            className={inputClass}
            value={form.address}
            onChange={(e) => set('address')(e.target.value)}
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Town or city" htmlFor="city" error={errors.city}>
            <input
              id="city"
              className={inputClass}
              value={form.city}
              onChange={(e) => set('city')(e.target.value)}
            />
          </Field>
          <Field label="State" htmlFor="state" error={errors.state}>
            <input
              id="state"
              className={inputClass}
              value={form.state}
              maxLength={2}
              onChange={(e) => set('state')(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="ZIP code (optional)" htmlFor="postalCode">
            <input
              id="postalCode"
              className={inputClass}
              inputMode="numeric"
              value={form.postalCode}
              onChange={(e) => set('postalCode')(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Map position"
          htmlFor="coordinates"
          error={errors.coordinates}
          hint={
            <>
              Latitude and longitude, such as 41.3083, -72.9279. People&apos;s distance and perks
              depend on it, so put it on the front door.{' '}
              <a
                href={findOnMap}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 underline"
              >
                Find it on the map
              </a>
              , then right-click the door and choose the numbers at the top to copy them.
            </>
          }
        >
          <input
            id="coordinates"
            className={inputClass}
            value={form.coordinates}
            onChange={(e) => set('coordinates')(e.target.value)}
            placeholder="41.3083, -72.9279"
            autoComplete="off"
          />
        </Field>

        {checkOnMap && (
          <p className="text-sm">
            <a
              href={checkOnMap}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 underline"
            >
              Check this position on the map
            </a>
          </p>
        )}
      </Section>

      <Section title="Good to know">
        <Field
          label="Accessibility (optional)"
          htmlFor="accessibility"
          hint="Steps at the entrance, bathrooms, parking, and the like."
        >
          <textarea
            id="accessibility"
            className={inputClass}
            rows={2}
            value={form.accessibility}
            onChange={(e) => set('accessibility')(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone (optional)" htmlFor="phone">
            <input
              id="phone"
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
            />
          </Field>
          <Field label="Email (optional)" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Website (optional)" htmlFor="website" error={errors.website}>
          <input
            id="website"
            type="url"
            className={inputClass}
            value={form.website}
            onChange={(e) => set('website')(e.target.value)}
            placeholder="https://"
          />
        </Field>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-700">Social accounts (optional)</legend>
          <p className="text-sm text-gray-500">
            Type the account name or paste a link. These are where people check a venue before
            they go.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              const typed = form.social[platform.id] ?? '';
              const link = normalizeSocialLink(platform.id, typed);
              return (
                <Field
                  key={platform.id}
                  label={platform.label}
                  htmlFor={`social-${platform.id}`}
                  error={errors.social?.[platform.id]}
                  hint={
                    link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 underline"
                      >
                        Open to check it
                      </a>
                    ) : undefined
                  }
                >
                  <input
                    id={`social-${platform.id}`}
                    className={inputClass}
                    value={typed}
                    onChange={(e) => setSocial(platform.id)(e.target.value)}
                    placeholder={platform.placeholder}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </Field>
              );
            })}
          </div>
        </fieldset>

        <Field
          label="Notes for admins (optional)"
          htmlFor="notes"
          hint="Who you spoke to, what to follow up. Never shown in the app."
        >
          <textarea
            id="notes"
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
          />
        </Field>
      </Section>

      {blockers.length > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
          You can save this now and finish it later. Before it can be verified it needs{' '}
          {blockers.join(' and ')}.
        </div>
      )}

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {submitError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50"
        >
          {submitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-3 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
