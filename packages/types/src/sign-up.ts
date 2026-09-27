/**
 * Rules for creating an account, and where the legal documents live.
 * Shared so the app and any future sign-up surface agree.
 */

/** The app is for adults */
export const MINIMUM_USER_AGE = 18;

const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 6;

export interface SignUpForm {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** The person has confirmed they are 18 or older */
  isAdult: boolean;
}

export type SignUpErrors = Partial<Record<keyof SignUpForm, string>>;

/** Returns a message per invalid field. An empty object means the form is valid. */
export const validateSignUp = (form: SignUpForm): SignUpErrors => {
  const errors: SignUpErrors = {};

  if (!form.displayName) {
    errors.displayName = 'Enter a name';
  } else if (form.displayName.length < MIN_NAME_LENGTH) {
    errors.displayName = `Use at least ${MIN_NAME_LENGTH} characters`;
  }

  if (!form.email) {
    errors.email = 'Enter your email';
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = "That doesn't look like an email address";
  }

  if (!form.password) {
    errors.password = 'Choose a password';
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Enter your password again';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "The passwords don't match";
  }

  if (!form.isAdult) {
    errors.isAdult = `You need to be ${MINIMUM_USER_AGE} or older to create an account.`;
  }

  return errors;
};

export type LegalDocument = 'terms' | 'privacy';

export const LEGAL_TITLES: Record<LegalDocument, string> = {
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
};

export interface LegalLink {
  title: string;
  /** Null until the document has been published */
  url: string | null;
}

const isSecureWebAddress = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** The title and published address of a legal document, from the app's settings */
export const getLegalLink = (
  document: LegalDocument,
  addresses: Partial<Record<LegalDocument, string | undefined>>
): LegalLink => {
  const address = addresses[document]?.trim() ?? '';
  return {
    title: LEGAL_TITLES[document],
    url: isSecureWebAddress(address) ? address : null,
  };
};

/** Screens that can be read before confirming: the welcome screen and what it links to */
const OPEN_BEFORE_CONFIRMING = ['welcome', 'legal'];

export interface AgeConfirmationCheck {
  /** The person has confirmed on this device that they are 18 or older */
  confirmed: boolean;
  /** The first part of the screen's path, e.g. `event` for `/event/123` */
  firstSegment: string | undefined;
}

/** True when the person must be sent to the welcome screen first */
export const needsAgeConfirmation = ({ confirmed, firstSegment }: AgeConfirmationCheck): boolean =>
  !confirmed && !OPEN_BEFORE_CONFIRMING.includes(firstSegment ?? '');
