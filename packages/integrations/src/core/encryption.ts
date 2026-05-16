import crypto from 'node:crypto';
import { EncryptionError } from './errors';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new EncryptionError('ENCRYPTION_KEY missing. Generate with: openssl rand -hex 32');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new EncryptionError('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  cachedKey = Buffer.from(raw, 'hex');
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const key = loadKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new EncryptionError('malformed ciphertext');
  const [ivHex, tagHex, dataHex] = parts;
  if (!ivHex || !tagHex || !dataHex) throw new EncryptionError('malformed ciphertext');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  if (iv.length !== IV_LEN) throw new EncryptionError('bad IV length');
  if (tag.length !== TAG_LEN) throw new EncryptionError('bad auth tag length');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(dataHex, 'hex'), decipher.final()]).toString('utf8');
}

export function maybeDecrypt(ciphertext: string | null): string | null {
  return ciphertext === null ? null : decrypt(ciphertext);
}
