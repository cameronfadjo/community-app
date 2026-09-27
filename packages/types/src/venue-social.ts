/**
 * Social accounts for a venue. People type these as a handle or paste a
 * link, so both are accepted and stored as a tidy link.
 */

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'x' | 'youtube';

interface PlatformRules {
  id: SocialPlatform;
  label: string;
  /** Shown as the example in the form */
  placeholder: string;
  /** Sites a pasted link may point to */
  hosts: string[];
  /** The link for an account typed as a handle */
  toLink: (handle: string) => string;
}

export const SOCIAL_PLATFORMS: PlatformRules[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    placeholder: '@name',
    hosts: ['instagram.com'],
    toLink: (handle) => `https://www.instagram.com/${handle}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    placeholder: 'facebook.com/name',
    hosts: ['facebook.com', 'fb.com'],
    toLink: (handle) => `https://www.facebook.com/${handle}`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    placeholder: '@name',
    hosts: ['tiktok.com'],
    toLink: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    placeholder: '@name',
    hosts: ['x.com', 'twitter.com'],
    toLink: (handle) => `https://x.com/${handle}`,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    placeholder: '@name',
    hosts: ['youtube.com'],
    toLink: (handle) => `https://www.youtube.com/@${handle}`,
  },
];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

const HANDLE = /^[A-Za-z0-9._-]{1,100}$/;

// The part of a Facebook profile link that says which profile it is
const KEPT_QUERY = ['id'];

const rulesFor = (platform: SocialPlatform): PlatformRules =>
  SOCIAL_PLATFORMS.find((rules) => rules.id === platform) as PlatformRules;

const tidyLink = (rules: PlatformRules, url: URL): string | null => {
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!rules.hosts.includes(host)) return null;

  const path = url.pathname.replace(/\/+$/, '');
  if (!path) return null;

  const query = new URLSearchParams();
  for (const key of KEPT_QUERY) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';

  // Links copied from a phone or an old bookmark end up at the main site
  const site = new URL(rules.toLink('x')).origin;
  return `${site}${path}${suffix}`;
};

/**
 * The link for an account typed as a handle or pasted as a link. Returns an
 * empty string when nothing was entered, and null when it isn't an account
 * on that platform.
 */
export const normalizeSocialLink = (platform: SocialPlatform, input: string): string | null => {
  const text = input.trim();
  if (!text) {
    return '';
  }

  const rules = rulesFor(platform);
  const handle = text.replace(/^@/, '');
  if (HANDLE.test(handle)) {
    return rules.toLink(handle);
  }

  const looksLikeLink = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    return tidyLink(rules, new URL(looksLikeLink));
  } catch {
    return null;
  }
};

export type SocialLinkErrors = Partial<Record<SocialPlatform, string>>;

/** Tidies every link entered. Empty ones are left out. */
export const validateSocialLinks = (
  input: SocialLinks
): { links: SocialLinks; errors: SocialLinkErrors } => {
  const links: SocialLinks = {};
  const errors: SocialLinkErrors = {};

  for (const { id, label } of SOCIAL_PLATFORMS) {
    const link = normalizeSocialLink(id, input[id] ?? '');
    if (link === null) {
      errors[id] = `Enter the ${label} name, or paste a link to the account.`;
    } else if (link) {
      links[id] = link;
    }
  }

  return { links, errors };
};
