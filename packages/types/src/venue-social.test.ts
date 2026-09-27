import { describe, expect, it } from 'vitest';
import { SOCIAL_PLATFORMS, normalizeSocialLink, validateSocialLinks } from './venue-social';

describe('normalizeSocialLink', () => {
  it('turns a handle into a link', () => {
    expect(normalizeSocialLink('instagram', '@transhavenct')).toBe(
      'https://www.instagram.com/transhavenct'
    );
    expect(normalizeSocialLink('instagram', 'transhavenct')).toBe(
      'https://www.instagram.com/transhavenct'
    );
    expect(normalizeSocialLink('tiktok', 'chezest')).toBe('https://www.tiktok.com/@chezest');
    expect(normalizeSocialLink('x', '@chezest')).toBe('https://x.com/chezest');
    expect(normalizeSocialLink('facebook', 'ChezEst')).toBe('https://www.facebook.com/ChezEst');
    expect(normalizeSocialLink('youtube', '@chezest')).toBe('https://www.youtube.com/@chezest');
  });

  it('keeps a link to the right site, tidied', () => {
    expect(normalizeSocialLink('instagram', 'https://instagram.com/transhavenct/?hl=en')).toBe(
      'https://www.instagram.com/transhavenct'
    );
    expect(normalizeSocialLink('facebook', 'facebook.com/ChezEst')).toBe(
      'https://www.facebook.com/ChezEst'
    );
    expect(normalizeSocialLink('facebook', 'https://www.facebook.com/profile.php?id=1000123')).toBe(
      'https://www.facebook.com/profile.php?id=1000123'
    );
    expect(normalizeSocialLink('x', 'https://twitter.com/chezest')).toBe('https://x.com/chezest');
    expect(normalizeSocialLink('youtube', 'https://www.youtube.com/channel/UC123abc')).toBe(
      'https://www.youtube.com/channel/UC123abc'
    );
  });

  it('is empty when nothing was entered', () => {
    expect(normalizeSocialLink('instagram', '  ')).toBe('');
  });

  it('turns away a link to a different site', () => {
    expect(normalizeSocialLink('instagram', 'https://facebook.com/ChezEst')).toBeNull();
    expect(normalizeSocialLink('facebook', 'https://evil.example/facebook.com/ChezEst')).toBeNull();
    expect(normalizeSocialLink('instagram', 'https://instagram.com.evil.example/x')).toBeNull();
  });

  it('turns away something that is not an account', () => {
    expect(normalizeSocialLink('instagram', 'two words')).toBeNull();
    expect(normalizeSocialLink('instagram', 'https://www.instagram.com/')).toBeNull();
    expect(normalizeSocialLink('instagram', 'javascript:alert(1)')).toBeNull();
  });
});

describe('validateSocialLinks', () => {
  it('returns the tidied links, leaving out the empty ones', () => {
    expect(validateSocialLinks({ instagram: '@transhavenct', facebook: '' })).toEqual({
      links: { instagram: 'https://www.instagram.com/transhavenct' },
      errors: {},
    });
  });

  it('names the ones that need fixing', () => {
    const { errors } = validateSocialLinks({ instagram: 'two words', x: '@ok' });
    expect(Object.keys(errors)).toEqual(['instagram']);
  });

  it('covers the platforms people use to find a night out', () => {
    expect(SOCIAL_PLATFORMS.map((platform) => platform.id)).toEqual([
      'instagram',
      'facebook',
      'tiktok',
      'x',
      'youtube',
    ]);
  });
});
