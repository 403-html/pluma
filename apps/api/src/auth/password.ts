import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 's2';

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const hashPassword = (password: string, salt = randomBytes(16)) => {
  const derived = scryptSync(password, salt, 32);
  return `${SCRYPT_PREFIX}:${salt.toString('base64')}:${derived.toString('base64')}`;
};

export const verifyPassword = (password: string, stored: string) => {
  if (!stored) {
    return false;
  }

  if (!stored.startsWith(`${SCRYPT_PREFIX}:`)) {
    return safeEqual(password, stored);
  }

  const [, saltEncoded, hashEncoded] = stored.split(':');

  if (!saltEncoded || !hashEncoded) {
    return false;
  }

  const salt = Buffer.from(saltEncoded, 'base64');
  const expected = Buffer.from(hashEncoded, 'base64');
  const derived = scryptSync(password, salt, expected.length);

  return timingSafeEqual(derived, expected);
};
