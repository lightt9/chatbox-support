/**
 * Map of HTML entities to their character representations for decoding.
 */
const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
};

/**
 * Map of special characters to their HTML entity representations for encoding.
 */
const CHAR_TO_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Sanitize an HTML string by removing all tags and decoding entities.
 * This is a basic regex-based approach suitable for preventing XSS in
 * user-generated content from messaging channels.
 *
 * NOTE: For production use with untrusted HTML, consider a dedicated library
 * like DOMPurify or sanitize-html for more robust sanitization.
 *
 * @param input - The potentially unsafe HTML string
 * @returns A sanitized plain-text string
 */
export function sanitizeHtml(input: string): string {
  if (!input) {
    return '';
  }

  // Remove script tags and their contents
  let result = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their contents
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all HTML tags
  result = result.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  result = result.replace(
    /&(?:amp|lt|gt|quot|#039|#x27|#x2F);/g,
    (match) => HTML_ENTITY_MAP[match] ?? match,
  );

  // Trim whitespace
  result = result.trim();

  return result;
}

/**
 * Escape special HTML characters in a string.
 * Use this when you need to safely embed user content within HTML.
 *
 * @param input - The string to escape
 * @returns The HTML-escaped string
 */
export function escapeHtml(input: string): string {
  if (!input) {
    return '';
  }

  return input.replace(/[&<>"'/]/g, (match) => CHAR_TO_ENTITY_MAP[match] ?? match);
}

/**
 * Strip all non-printable and control characters from a string.
 * Useful for sanitizing message content from messaging platforms.
 *
 * @param input - The string to clean
 * @returns The cleaned string with only printable characters
 */
export function stripControlCharacters(input: string): string {
  if (!input) {
    return '';
  }

  // Keep printable ASCII, newlines, tabs, and common Unicode ranges
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
