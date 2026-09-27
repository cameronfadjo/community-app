import { LegalDocument, LegalLink, getLegalLink } from '../types';

// Set in .env and in the EAS build settings once each page is published
const ADDRESSES: Partial<Record<LegalDocument, string | undefined>> = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL,
};

export const legalLink = (document: LegalDocument): LegalLink => getLegalLink(document, ADDRESSES);
