import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Derive a 256-bit encryption key from a passphrase using scrypt.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LENGTH) as Buffer;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Suitable for encrypting channel credentials and other sensitive configuration.
 *
 * The output format is: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + ciphertext
 * All encoded as a single base64 string.
 *
 * @param plaintext - The text to encrypt
 * @param passphrase - The passphrase used to derive the encryption key
 * @returns Base64-encoded encrypted string
 */
export function encrypt(plaintext: string, passphrase: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(passphrase, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine salt + iv + authTag + ciphertext into a single buffer
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 *
 * @param encryptedBase64 - Base64-encoded encrypted string (as produced by encrypt())
 * @param passphrase - The passphrase used to derive the encryption key
 * @returns The decrypted plaintext
 * @throws Error if decryption fails (wrong passphrase or tampered data)
 */
export function decrypt(encryptedBase64: string, passphrase: string): string {
  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(passphrase, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
