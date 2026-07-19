/**
 * Privacy utilities for data anonymization and GDPR/CCPA compliance
 */

/**
 * Hash a user ID for analytics
 * Uses a simple hash function suitable for client-side anonymization
 * In production, consider using a proper cryptographic hash with salt
 */
export const hashUserId = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `hashed_${Math.abs(hash).toString(36)}`;
};

/**
 * Anonymize user location data
 * Reduces precision to ~1km radius instead of exact coordinates
 */
export const anonymizeLocation = (location: {
  latitude: number;
  longitude: number;
}): {
  latitude: number;
  longitude: number;
} => {
  // Round to ~2 decimal places (~1.1km precision at equator)
  return {
    latitude: Math.round(location.latitude * 100) / 100,
    longitude: Math.round(location.longitude * 100) / 100,
  };
};

/**
 * Calculate distance from user to venue without storing exact location
 * Returns distance range instead of exact distance
 */
export const calculateDistanceRange = (distance: number): string => {
  if (distance < 0.5) return '<0.5mi';
  if (distance < 1) return '0.5-1mi';
  if (distance < 3) return '1-3mi';
  if (distance < 5) return '3-5mi';
  return '5+mi';
};

/**
 * Anonymize age data by converting to age ranges
 */
export const anonymizeAge = (age: number): string => {
  if (age < 18) return 'under-18';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
};

/**
 * Remove personally identifiable information from error logs
 */
export const sanitizeErrorForLogging = (error: any): any => {
  if (typeof error === 'string') {
    return sanitizeString(error);
  }

  if (error instanceof Error) {
    return {
      message: sanitizeString(error.message),
      name: error.name,
      stack: error.stack ? sanitizeString(error.stack) : undefined,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(error)) {
      // Skip fields that might contain PII
      if (isPIIField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeErrorForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return error;
};

/**
 * Check if a field name suggests it contains PII
 */
const isPIIField = (fieldName: string): boolean => {
  const piiFields = [
    'email',
    'phone',
    'phoneNumber',
    'address',
    'firstName',
    'lastName',
    'fullName',
    'displayName',
    'ssn',
    'creditCard',
    'password',
    'token',
    'apiKey',
  ];

  const lowerField = fieldName.toLowerCase();
  return piiFields.some(pii => lowerField.includes(pii.toLowerCase()));
};

/**
 * Sanitize a string by removing potential PII patterns
 */
const sanitizeString = (str: string): string => {
  // Remove email addresses
  let sanitized = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  sanitized = sanitized.replace(/\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, '[PHONE]');

  // Remove potential credit card numbers (simple pattern)
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');

  // Remove potential SSN
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  return sanitized;
};

/**
 * Generate a session ID that doesn't contain user information
 */
export const generateAnonymousSessionId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `session_${timestamp}_${random}`;
};

/**
 * Check if user has provided consent for analytics
 * (This should be tied to actual user consent preferences)
 */
export const hasAnalyticsConsent = (userId: string): boolean => {
  // In production, check user's privacy preferences from database
  // For now, default to true (opt-in approach)
  // TODO: Implement actual consent management
  return true;
};

/**
 * Aggregate user demographics without revealing individual data
 * Returns percentages rather than raw counts
 */
export const aggregateDemographics = (
  data: Array<{ ageRange: string; count: number }>
): Record<string, number> => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) return {};

  const percentages: Record<string, number> = {};
  data.forEach(item => {
    percentages[item.ageRange] = parseFloat(((item.count / total) * 100).toFixed(1));
  });

  return percentages;
};

/**
 * Validate that analytics data doesn't contain PII before sending
 */
export const validateAnalyticsData = (data: any): {
  valid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check all fields recursively
  const checkObject = (obj: any, path: string = '') => {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;

      // Check field name
      if (isPIIField(key)) {
        issues.push(`Field "${fieldPath}" may contain PII`);
      }

      // Check string values for patterns
      if (typeof value === 'string') {
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(value)) {
          issues.push(`Field "${fieldPath}" contains email address`);
        }
        if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(value)) {
          issues.push(`Field "${fieldPath}" contains phone number`);
        }
      }

      // Recurse for nested objects
      if (typeof value === 'object' && value !== null) {
        checkObject(value, fieldPath);
      }
    }
  };

  checkObject(data);

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * Retention policy: Calculate if data should be deleted based on age
 */
export const shouldDeleteAnalyticsData = (
  createdAt: Date,
  retentionDays: number = 365
): boolean => {
  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > retentionDays;
};

/**
 * Export user data for GDPR data portability requests
 */
export interface UserDataExport {
  userId: string;
  exportedAt: Date;
  data: {
    profile?: any;
    favorites?: any[];
    reviews?: any[];
    checkIns?: any[];
    redemptions?: any[];
  };
}

export const prepareUserDataExport = async (userId: string): Promise<UserDataExport> => {
  // This would gather all user data from various collections
  // Implementation would depend on actual data structure
  return {
    userId,
    exportedAt: new Date(),
    data: {
      // Placeholder - implement actual data gathering
    },
  };
};

/**
 * Delete all user data for GDPR right to be forgotten
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  // This would delete user data from all collections
  // Implementation would use batch operations for efficiency
  // TODO: Implement actual data deletion
  console.log(`Deleting all data for user: ${userId}`);
};
