/**
 * Prepares the legal documents for the website. The documents live in
 * docs/legal as Markdown, with blanks in [square brackets] that are filled
 * from site.config.json. A page is a draft until no blanks are left.
 */

/** The blank in the documents that each setting fills */
const BLANKS = {
  '[app name]': 'appName',
  '[legal entity name]': 'legalEntityName',
  '[contact email]': 'contactEmail',
  '[postal address]': 'postalAddress',
  '[effective date]': 'effectiveDate',
  '[terms URL]': 'termsUrl',
  '[privacy policy URL]': 'privacyUrl',
  '[account deletion URL]': 'accountDeletionUrl',
  '[support URL]': 'supportUrl',
};

const asMarkdown = (setting, value) =>
  setting === 'contactEmail' ? `[${value}](mailto:${value})` : value;

/** Fills each blank that has a value. Blanks without one are left as they are. */
export const fillBlanks = (markdown, values) => {
  let filled = markdown;
  for (const [blank, setting] of Object.entries(BLANKS)) {
    const value = (values[setting] ?? '').trim();
    if (value) {
      filled = filled.split(blank).join(asMarkdown(setting, value));
    }
  }
  return filled;
};

/** Every blank still in the text, outermost only, in order, once each */
export const findBlanks = (markdown) => {
  const blanks = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < markdown.length; index += 1) {
    const character = markdown[index];
    if (character === '[') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === ']' && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        const isLink = markdown[index + 1] === '(';
        const text = markdown.slice(start, index + 1);
        if (!isLink && !blanks.includes(text)) {
          blanks.push(text);
        }
      }
    }
  }

  return blanks;
};

/** Removes the "Draft. Do not publish." note, which is addressed to the owner */
export const stripDraftNotice = (markdown) =>
  markdown.replace(/^> \*\*Draft\. Do not publish\.\*\*.*\n\n?/m, '');

export const prepareDocument = (source, values) => {
  const markdown = fillBlanks(stripDraftNotice(source), values).trim();
  const blanks = findBlanks(markdown);
  return { markdown, blanks, isDraft: blanks.length > 0 };
};
