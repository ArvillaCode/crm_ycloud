const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard length for GCM

/**
 * Normalizes the encryption key to exactly 32 bytes using SHA-256
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || 'default_dev_key_must_be_32_bytes_long';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a UTF-8 string
 * @param {string} text - Plain text
 * @returns {string} iv:authTag:encryptedText in hex format
 */
function encrypt(text) {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted hex string
 * @param {string} cipherText - iv:authTag:encryptedText
 * @returns {string} Plain text
 */
function decrypt(cipherText) {
  if (!cipherText) return '';
  
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Fallback: If not encrypted (e.g. legacy/seed data), return as is
      return cipherText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, return as is (could be legacy plaintext)
    return cipherText;
  }
}

module.exports = {
  encrypt,
  decrypt,
};
