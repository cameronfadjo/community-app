import { describe, expect, it } from 'vitest';
import { fillBlanks, findBlanks, prepareDocument, stripDraftNotice } from './legal.mjs';

const values = {
  appName: 'Community',
  legalEntityName: 'Example LLC',
  contactEmail: 'hello@example.com',
  postalAddress: '',
};

describe('fillBlanks', () => {
  it('fills a blank that has a value', () => {
    expect(fillBlanks('Run by [legal entity name].', values)).toBe('Run by Example LLC.');
  });

  it('fills every copy of a blank', () => {
    expect(fillBlanks('[app name] and [app name]', values)).toBe('Community and Community');
  });

  it('leaves a blank that has no value yet', () => {
    expect(fillBlanks('Address: [postal address]', values)).toBe('Address: [postal address]');
    expect(fillBlanks('Effective date: [effective date]', values)).toBe(
      'Effective date: [effective date]'
    );
  });

  it('turns an email address into a link', () => {
    expect(fillBlanks('Contact: [contact email]', values)).toBe(
      'Contact: [hello@example.com](mailto:hello@example.com)'
    );
  });
});

describe('findBlanks', () => {
  it('lists what is still to be filled, once each', () => {
    expect(findBlanks('[postal address] then [Lawyer to draft.] then [postal address]')).toEqual([
      '[postal address]',
      '[Lawyer to draft.]',
    ]);
  });

  it('does not mistake a link for a blank', () => {
    expect(findBlanks('See [our terms](/terms) and [hello@example.com](mailto:hello@example.com).')).toEqual([]);
  });

  it('finds a blank that holds another blank', () => {
    expect(findBlanks('[Lawyer to draft: the laws of [state] apply.]')).toEqual([
      '[Lawyer to draft: the laws of [state] apply.]',
    ]);
  });
});

describe('stripDraftNotice', () => {
  it('removes the note to the owner at the top', () => {
    const source = '# Terms\n\n> **Draft. Do not publish.** A lawyer must review it.\n\nEffective date: today';
    expect(stripDraftNotice(source)).toBe('# Terms\n\nEffective date: today');
  });

  it('leaves other quotes alone', () => {
    const source = '# Terms\n\n> A quote that stays.';
    expect(stripDraftNotice(source)).toBe(source);
  });
});

describe('prepareDocument', () => {
  it('is final once nothing is left to fill', () => {
    const result = prepareDocument('# Terms\n\nRun by [legal entity name].', values);
    expect(result.isDraft).toBe(false);
    expect(result.blanks).toEqual([]);
    expect(result.markdown).toBe('# Terms\n\nRun by Example LLC.');
  });

  it('is a draft while anything is left to fill', () => {
    const result = prepareDocument('Address: [postal address]', values);
    expect(result.isDraft).toBe(true);
    expect(result.blanks).toEqual(['[postal address]']);
  });
});
