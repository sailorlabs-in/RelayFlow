import { createHash, randomBytes } from 'crypto';

export class CryptoUtil {
  /**
   * Hashes a password using SHA-256 with a random salt.
   * Returns salt:hash format.
   */
  static hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(salt + password)
      .digest('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a password against a salt:hash string.
   */
  static verifyPassword(password: string, storedValue: string): boolean {
    const parts = storedValue.split(':');
    if (parts.length !== 2) {
      return false;
    }
    const [salt, storedHash] = parts;
    const currentHash = createHash('sha256')
      .update(salt + password)
      .digest('hex');
    return storedHash === currentHash;
  }
}
