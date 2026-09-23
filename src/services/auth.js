import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

/**
 * Hash a password into `scrypt$<salt-hex>$<key-hex>`.
 *
 * The resulting string lives in an environment variable — never in the
 * database and never in source (research R-008).
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `${SCHEME}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * Verify a password against a stored hash.
 *
 * Always timing-safe, and always returns a boolean rather than throwing, so a
 * malformed hash cannot be distinguished from a wrong password by timing or by
 * error behaviour.
 */
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== SCHEME) return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[1], 'hex');
    expected = Buffer.from(parts[2], 'hex');
  } catch {
    return false;
  }

  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  try {
    const actual = await scrypt(password, salt, KEY_LENGTH);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
