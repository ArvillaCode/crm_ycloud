/**
 * Format a phone number into readable format +XX X XXXX XXXX
 * @param {string} phone
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return '';
  // Match standard numbers and group them for formatting representation
  return phone.replace(/(\+\d{2})(\d{2})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

/**
 * Limit characters and append an ellipsis
 * @param {string} text
 * @param {number} limit
 * @returns {string} Truncated text
 */
export function truncateText(text, limit = 40) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return `${text.substring(0, limit)}...`;
}
