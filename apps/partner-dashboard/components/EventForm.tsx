'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  MAX_ACTIVITIES_PER_EVENT,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MINIMUM_AGES,
  buildEventOccurrences,
  describeRecurrence,
  parseCoverToCents,
  resolveEventTimes,
  validateEventForm,
  type EventFormData,
  type EventFormErrors,
  type EventListing,
  type EventRepeat,
  type MinimumAge,
  type Venue,
} from '@community/types';
import { loadActivityOptions, loadApprovedVenues, type ActivityOption } from '@/lib/events';

interface EventFormProps {
  mode: 'create' | 'edit';
  /** Event to edit, or to copy from when creating */
  initial?: EventListing | null;
  submitLabel: string;
  onSubmit: (form: EventFormData, venue: Venue) => Promise<void>;
  onCancel: () => void;
}

const pad = (value: number) => String(value).padStart(2, '0');
const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toTimeInput = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const TAG_OPTIONS = [
  { key: 'goodForSolo', label: 'Good for going solo', hint: 'Easy to turn up alone' },
  { key: 'firstTimersWelcome', label: 'First-timers welcome', hint: 'New faces are looked after' },
  { key: 'alcoholFree', label: 'Alcohol-free', hint: 'No alcohol served or needed' },
  { key: 'stepFreeEntry', label: 'Step-free entry', hint: 'No steps to get in' },
] as const;

type TagKey = (typeof TAG_OPTIONS)[number]['key'];

const AGE_OPTIONS: Array<{ value: MinimumAge; label: string }> = [
  { value: 18, label: '18+' },
  { value: 21, label: '21+' },
];

const REPEAT_OPTIONS: Array<{ value: EventRepeat; label: string }> = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'weekly', label: 'Every week' },
  { value: 'every_two_weeks', label: 'Every two weeks' },
  { value: 'monthly', label: 'Every month' },
];

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
  htmlFor?: string;
  hint?: string;
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

export function EventForm({ mode, initial, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const initialStart = initial?.startsAt.toDate();
  const initialEnd = initial?.endsAt.toDate();
  // A copied event keeps its times but needs a new date
  const keepDate = mode === 'edit';

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [activityIds, setActivityIds] = useState<string[]>(initial?.activityIds ?? []);
  const [venueId, setVenueId] = useState(initial?.venueId ?? '');
  const [organizerName, setOrganizerName] = useState(initial?.organizerName ?? '');
  const [date, setDate] = useState(keepDate && initialStart ? toDateInput(initialStart) : '');
  const [startTime, setStartTime] = useState(initialStart ? toTimeInput(initialStart) : '');
  const [endTime, setEndTime] = useState(initialEnd ? toTimeInput(initialEnd) : '');
  const [repeat, setRepeat] = useState<EventRepeat>('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [cover, setCover] = useState(
    initial && initial.coverCents > 0 ? (initial.coverCents / 100).toString() : '',
  );
  const [ticketUrl, setTicketUrl] = useState(initial?.ticketUrl ?? '');
  const [perkLabel, setPerkLabel] = useState(initial?.perkLabel ?? '');
  const [tags, setTags] = useState<Record<TagKey, boolean>>({
    goodForSolo: initial?.tags.goodForSolo ?? false,
    firstTimersWelcome: initial?.tags.firstTimersWelcome ?? false,
    alcoholFree: initial?.tags.alcoholFree ?? false,
    stepFreeEntry: initial?.tags.stepFreeEntry ?? false,
  });
  // An event saved before all-ages was removed falls back to 21+
  const [minimumAge, setMinimumAge] = useState<MinimumAge>(
    MINIMUM_AGES.find((age) => age === initial?.tags.minimumAge) ?? 21,
  );
  const [audience, setAudience] = useState(initial?.audience.join(', ') ?? '');

  const [errors, setErrors] = useState<EventFormErrors>({});
  const [coverError, setCoverError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadActivityOptions(), loadApprovedVenues()])
      .then(([activityOptions, venueOptions]) => {
        if (cancelled) return;
        setActivities(activityOptions);
        setVenues(venueOptions);
      })
      .catch((error) => {
        console.error('Error loading form options:', error);
        if (!cancelled) setOptionsError("We couldn't load venues. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const times = useMemo(() => resolveEventTimes(date, startTime, endTime), [date, startTime, endTime]);
  const endsNextDay = times ? times.endsAt.getDate() !== times.startsAt.getDate() : false;

  const repeatCount = useMemo(() => {
    if (!times || repeat === 'none' || !repeatUntil) return null;
    const until = resolveEventTimes(repeatUntil, '00:00', '00:01');
    if (!until) return null;
    return buildEventOccurrences(
      { startsAt: times.startsAt, endsAt: times.endsAt, repeat, repeatUntil: until.startsAt },
      () => 'preview',
    ).length;
  }, [times, repeat, repeatUntil]);

  const repeatSummary = times && repeat !== 'none' ? describeRecurrence(times.startsAt, repeat) : null;

  const toggleActivity = (id: string) => {
    setActivityIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const coverCents = parseCoverToCents(cover);
    setCoverError(
      coverCents === null ? 'Enter the cover as a dollar amount, or leave it blank if free.' : null,
    );

    const invalidDate = new Date(NaN);
    const repeatDate =
      repeat !== 'none' && repeatUntil
        ? resolveEventTimes(repeatUntil, '00:00', '00:01')?.startsAt
        : undefined;

    const form: EventFormData = {
      title,
      description,
      activityIds,
      venueId,
      organizerName: organizerName || undefined,
      startsAt: times?.startsAt ?? invalidDate,
      endsAt: times?.endsAt ?? invalidDate,
      repeat: mode === 'create' ? repeat : 'none',
      repeatUntil: repeatDate,
      coverCents: coverCents ?? 0,
      ticketUrl: ticketUrl || undefined,
      images: initial?.images ?? [],
      tags: { ...tags, minimumAge },
      audience: audience
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      offerId: initial?.offerId,
      perkLabel: perkLabel || undefined,
    };

    const found = validateEventForm(form, Date.now(), { isEditing: mode === 'edit' });
    setErrors(found);

    const venue = venues.find((item) => item.id === venueId);
    if (Object.keys(found).length > 0 || coverCents === null || !venue) {
      setSubmitError('Some details need fixing. Check the messages above.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form, venue);
    } catch (error) {
      console.error('Error saving event:', error);
      setSubmitError("We couldn't save the event. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl" noValidate>
      {optionsError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {optionsError}
        </div>
      )}

      <Section title="What is it?">
        <Field label="Event name" htmlFor="title" error={errors.title}>
          <input
            id="title"
            className={inputClass}
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Friday drag show"
          />
        </Field>

        <Field
          label="Activities"
          hint={`Pick up to ${MAX_ACTIVITIES_PER_EVENT}. People browse by these, so choose the closest fit first.`}
          error={errors.activityIds}
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label="Activities">
            {activities.map((activity) => {
              const selected = activityIds.includes(activity.id);
              const full = !selected && activityIds.length >= MAX_ACTIVITIES_PER_EVENT;
              return (
                <button
                  key={activity.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={full}
                  onClick={() => toggleActivity(activity.id)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border transition ${
                    selected
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                  } ${full ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {activity.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="What to expect"
          htmlFor="description"
          hint="The crowd, the vibe, what to wear. This helps someone decide to come, especially on their own."
          error={errors.description}
        >
          <textarea
            id="description"
            className={inputClass}
            rows={4}
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Where and when">
        <Field
          label="Venue"
          htmlFor="venue"
          hint={venues.length === 0 ? 'No approved venues yet. A venue must be approved before events can be posted there.' : undefined}
          error={errors.venueId}
        >
          <select id="venue" className={inputClass} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">Choose a venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} · {venue.location.city}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Hosted by (optional)"
          htmlFor="organizer"
          hint="Fill this in if a promoter or group runs the event rather than the venue."
        >
          <input
            id="organizer"
            className={inputClass}
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Date" htmlFor="date" error={errors.startsAt}>
            <input id="date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Starts" htmlFor="start">
            <input id="start" type="time" className={inputClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field
            label="Ends"
            htmlFor="end"
            hint={endsNextDay ? 'Ends the next day' : undefined}
            error={errors.endsAt}
          >
            <input id="end" type="time" className={inputClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        {mode === 'create' && (
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <Field
              label="Repeats"
              htmlFor="repeat"
              hint={
                repeatSummary ??
                (repeat === 'monthly'
                  ? 'Keeps the same weekday, such as the 3rd Saturday. Choose the first date above.'
                  : undefined)
              }
            >
              <select
                id="repeat"
                className={inputClass}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as EventRepeat)}
              >
                {REPEAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {repeat !== 'none' && (
              <Field
                label="Last date"
                htmlFor="repeat-until"
                hint={
                  repeatCount
                    ? `This will post ${repeatCount} event${repeatCount === 1 ? '' : 's'}. Each can be edited or cancelled on its own.`
                    : 'Up to 26 events at a time.'
                }
                error={errors.repeatUntil}
              >
                <input
                  id="repeat-until"
                  type="date"
                  className={inputClass}
                  value={repeatUntil}
                  min={date}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                />
              </Field>
            )}
          </div>
        )}
      </Section>

      <Section title="Cost">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Cover charge"
            htmlFor="cover"
            hint="In dollars. Leave blank if it's free."
            error={coverError ?? errors.coverCents}
          >
            <input
              id="cover"
              className={inputClass}
              inputMode="decimal"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="10"
            />
          </Field>
          <Field
            label="Ticket link (optional)"
            htmlFor="tickets"
            hint="Where people buy tickets, if you sell them."
            error={errors.ticketUrl}
          >
            <input
              id="tickets"
              type="url"
              className={inputClass}
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://"
            />
          </Field>
        </div>

        <Field
          label="Perk on arrival (optional)"
          htmlFor="perk"
          hint='A reason to come, shown as "Free drink when you arrive". People show their phone at the bar.'
        >
          <input
            id="perk"
            className={inputClass}
            value={perkLabel}
            maxLength={40}
            onChange={(e) => setPerkLabel(e.target.value)}
            placeholder="Free drink"
          />
        </Field>
      </Section>

      <Section title="Who it's good for">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TAG_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-purple-300"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={tags[option.key]}
                onChange={(e) => setTags((current) => ({ ...current, [option.key]: e.target.checked }))}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                <span className="block text-sm text-gray-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <Field
          label="Minimum age"
          hint="Every event is for adults. ID is still checked at the door."
          error={errors.tags}
        >
          <div className="flex gap-2" role="radiogroup" aria-label="Minimum age">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={minimumAge === option.value}
                onClick={() => setMinimumAge(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  minimumAge === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Who it's for (optional)"
          htmlFor="audience"
          hint="Short labels separated by commas, such as: Everyone welcome, Bears and friends"
        >
          <input
            id="audience"
            className={inputClass}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </Field>
      </Section>

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
