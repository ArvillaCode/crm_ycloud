/**
 * Helper to normalize phone numbers to E.164 format (e.g. remove spaces, dashes, prepend + if needed)
 * @param {string} phone
 * @returns {string} Normalized phone number
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  // Simple regex cleaning
  let cleaned = phone.replace(/\D/g, '');
  // If it doesn't start with +, add it (mock behavior)
  return `+${cleaned}`;
}

module.exports = {
  normalizePhoneNumber,
};
