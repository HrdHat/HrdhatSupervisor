/**
 * Input Sanitization Utilities
 * 
 * Uses DOMPurify to sanitize user inputs before storing in the database.
 * This provides defense-in-depth against XSS attacks, even though React
 * already escapes JSX content by default.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize a string input, removing any HTML tags and dangerous content.
 * Returns the sanitized string, or the original value if not a string.
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  if (typeof input !== 'string') {
    return String(input);
  }

  // Strip all HTML tags - we don't allow any HTML in user inputs
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content even when stripping tags
  });
}

/**
 * Sanitize a string but preserve it as nullable.
 * Use this for optional fields where null/undefined should remain as-is.
 */
export function sanitizeNullableString(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  return sanitizeString(input);
}

/**
 * Sanitize all string values in an object (shallow).
 * Useful for sanitizing form data or metadata objects.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  
  return result;
}

/**
 * Sanitize an array of strings.
 */
export function sanitizeStringArray(arr: string[] | null | undefined): string[] {
  if (!arr || !Array.isArray(arr)) {
    return [];
  }
  return arr.map(sanitizeString);
}
