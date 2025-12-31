/**
 * Escapes HTML special characters to prevent XSS vulnerabilities in email templates
 * @param value - The string to escape
 * @returns The escaped string safe for HTML insertion
 */
export const escapeHtml = (value: string): string => {
  if (typeof value !== 'string' || !value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
