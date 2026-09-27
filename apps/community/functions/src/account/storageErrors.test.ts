import { describe, expect, it } from 'vitest';
import { isStorageNotSetUp } from './storageErrors';

describe('isStorageNotSetUp', () => {
  it('recognizes a bucket that does not exist', () => {
    expect(isStorageNotSetUp({ code: 404, message: 'The specified bucket does not exist.' })).toBe(true);
  });

  it('recognizes a project with no default bucket configured', () => {
    expect(
      isStorageNotSetUp(new Error('Bucket name not specified or invalid. Specify a valid bucket name'))
    ).toBe(true);
  });

  it('does not excuse other failures, which should stop the deletion', () => {
    expect(isStorageNotSetUp({ code: 503, message: 'Service unavailable' })).toBe(false);
    expect(isStorageNotSetUp({ code: 403, message: 'Forbidden' })).toBe(false);
    expect(isStorageNotSetUp(new Error('socket hang up'))).toBe(false);
    expect(isStorageNotSetUp(undefined)).toBe(false);
  });
});
