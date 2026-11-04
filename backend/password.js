const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || '');
  if (stored.startsWith('scrypt$')) {
    const [, encodedSalt, encodedHash, extra] = stored.split('$');
    if (!encodedSalt || !encodedHash || extra !== undefined) return false;
    try {
      const salt = Buffer.from(encodedSalt, 'base64url');
      const expectedHash = Buffer.from(encodedHash, 'base64url');
      if (salt.length !== 16 || expectedHash.length !== 64) return false;
      const actualHash = crypto.scryptSync(String(password), salt, expectedHash.length);
      return crypto.timingSafeEqual(actualHash, expectedHash);
    } catch (error) {
      return false;
    }
  }

  const actualHash = crypto.createHash('sha256').update(String(password), 'utf8').digest('hex');
  const actualBytes = Buffer.from(actualHash);
  const storedBytes = Buffer.from(stored.toLowerCase());
  if (actualBytes.length === storedBytes.length && crypto.timingSafeEqual(actualBytes, storedBytes)) {
    return true;
  }

  const rawBytes = Buffer.from(String(password));
  return rawBytes.length === Buffer.byteLength(stored)
    && crypto.timingSafeEqual(rawBytes, Buffer.from(stored));
}

module.exports = { hashPassword, verifyPassword };
