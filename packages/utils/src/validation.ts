/**
 * UUID v4 regex pattern.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern (RFC 5322 simplified).
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Phone number regex pattern.
 * Accepts international format with optional + prefix, digits, spaces, hyphens, and parentheses.
 * Requires at least 7 and at most 15 digits.
 */
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/;

/**
 * Validate whether a string is a valid UUID v4.
 *
 * @param value - The string to validate
 * @returns Whether the string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  if (!value) {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Validate whether a string is a valid email address.
 *
 * @param value - The string to validate
 * @returns Whether the string is a valid email address
 */
export function isValidEmail(value: string): boolean {
  if (!value) {
    return false;
  }
  if (value.length > 254) {
    return false;
  }
  return EMAIL_REGEX.test(value);
}

/**
 * Validate whether a string is a valid phone number.
 * Accepts international format (e.g., +1234567890, +44 20 7946 0958).
 *
 * @param value - The string to validate
 * @returns Whether the string is a valid phone number
 */
export function isValidPhone(value: string): boolean {
  if (!value) {
    return false;
  }

  // Check the format matches
  if (!PHONE_REGEX.test(value)) {
    return false;
  }

  // Count actual digits (must be between 7 and 15 per E.164)
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
}

/**
 * Validate whether a string is a non-empty string after trimming.
 *
 * @param value - The value to validate
 * @returns Whether the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate whether a value is a valid positive integer.
 *
 * @param value - The value to validate
 * @returns Whether the value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
