import { describe, expect, it } from 'vitest';
import {
  MINIMUM_USER_AGE,
  getLegalLink,
  needsAgeConfirmation,
  validateSignUp,
} from './sign-up';

const valid = {
  displayName: 'Sam',
  email: 'sam@example.com',
  password: 'secret1',
  confirmPassword: 'secret1',
  isAdult: true,
};

describe('validateSignUp', () => {
  it('accepts a complete form', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  it('asks the person to confirm they are an adult', () => {
    expect(validateSignUp({ ...valid, isAdult: false }).isAdult).toBe(
      `You need to be ${MINIMUM_USER_AGE} or older to create an account.`
    );
  });

  it('checks the name, email, and password', () => {
    expect(validateSignUp({ ...valid, displayName: '' }).displayName).toBe('Enter a name');
    expect(validateSignUp({ ...valid, displayName: 'S' }).displayName).toBe(
      'Use at least 2 characters'
    );
    expect(validateSignUp({ ...valid, email: '' }).email).toBe('Enter your email');
    expect(validateSignUp({ ...valid, email: 'sam' }).email).toBe(
      "That doesn't look like an email address"
    );
    expect(validateSignUp({ ...valid, password: '' }).password).toBe('Choose a password');
    expect(validateSignUp({ ...valid, password: 'abc', confirmPassword: 'abc' }).password).toBe(
      'Use at least 6 characters'
    );
  });

  it('checks the password was typed the same twice', () => {
    expect(validateSignUp({ ...valid, confirmPassword: '' }).confirmPassword).toBe(
      'Enter your password again'
    );
    expect(validateSignUp({ ...valid, confirmPassword: 'secret2' }).confirmPassword).toBe(
      "The passwords don't match"
    );
  });
});

describe('getLegalLink', () => {
  it('names each document', () => {
    expect(getLegalLink('terms', {}).title).toBe('Terms of Use');
    expect(getLegalLink('privacy', {}).title).toBe('Privacy Policy');
  });

  it('uses the published address when there is one', () => {
    const link = getLegalLink('terms', { terms: 'https://example.com/terms' });
    expect(link.url).toBe('https://example.com/terms');
  });

  it('has no address until the document is published', () => {
    expect(getLegalLink('privacy', { terms: 'https://example.com/terms' }).url).toBeNull();
    expect(getLegalLink('privacy', { privacy: '   ' }).url).toBeNull();
  });

  it('ignores an address that is not a secure web address', () => {
    expect(getLegalLink('terms', { terms: 'http://example.com/terms' }).url).toBeNull();
    expect(getLegalLink('terms', { terms: 'javascript:alert(1)' }).url).toBeNull();
    expect(getLegalLink('terms', { terms: '[TERMS URL]' }).url).toBeNull();
  });
});

describe('needsAgeConfirmation', () => {
  it('holds every screen back until the person has confirmed their age', () => {
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: '(tabs)' })).toBe(true);
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: 'event' })).toBe(true);
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: 'auth' })).toBe(true);
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: undefined })).toBe(true);
  });

  it('leaves the welcome screen and the legal pages open', () => {
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: 'welcome' })).toBe(false);
    expect(needsAgeConfirmation({ confirmed: false, firstSegment: 'legal' })).toBe(false);
  });

  it('asks only once', () => {
    expect(needsAgeConfirmation({ confirmed: true, firstSegment: '(tabs)' })).toBe(false);
  });
});
