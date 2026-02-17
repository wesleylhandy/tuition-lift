/**
 * Application-level encryption for financial profile fields (SAI).
 * Per FR-014: All financial data at rest MUST be encrypted.
 * Uses AES-256-GCM; key from ENCRYPTION_KEY env (32-byte base64).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

const SAI_MIN = -1500;
const SAI_MAX = 999999;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || typeof raw !== "string") {
    throw new Error(
      "@repo/db: ENCRYPTION_KEY required for SAI encryption. Set a 32-byte base64 key."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error(
      `@repo/db: ENCRYPTION_KEY must be 32 bytes (base64). Got ${key.length} bytes.`
    );
  }
  cachedKey = key;
  return key;
}

/**
 * Encrypts plain SAI for storage. Use before inserting/updating profiles.sai.
 */
export function encryptSai(plainSai: number): string {
  if (plainSai < SAI_MIN || plainSai > SAI_MAX) {
    throw new RangeError(
      `SAI must be ${SAI_MIN}..${SAI_MAX}; got ${plainSai}`
    );
  }
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plain = Buffer.from(String(plainSai), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

/**
 * Decrypts stored SAI. Use when reading profiles.sai.
 * Supports legacy plaintext integers (pre-migration) for backward compatibility.
 */
export function decryptSai(
  stored: string | number | null | undefined
): number | null {
  if (stored === null || stored === undefined) return null;
  const trimmed = String(stored).trim();
  if (trimmed === "") return null;

  try {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length < IV_LEN + TAG_LEN) {
      return tryLegacyInt(trimmed);
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(-TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN, -TAG_LEN);
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const num = Number(decrypted.toString("utf8"));
    if (Number.isNaN(num) || num < SAI_MIN || num > SAI_MAX) {
      return tryLegacyInt(trimmed);
    }
    return num;
  } catch {
    return tryLegacyInt(trimmed);
  }
}

function tryLegacyInt(stored: string): number | null {
  const num = Number.parseInt(stored, 10);
  if (Number.isNaN(num) || num < SAI_MIN || num > SAI_MAX) return null;
  return num;
}

/**
 * Prepares profile upsert/insert payload: encrypts sai when present.
 * Use before .from('profiles').upsert() or .insert().
 */
export function withEncryptedSai<T extends { sai?: number | null }>(
  payload: T
): Omit<T, "sai"> & { sai?: string | null } {
  if (payload.sai === null || payload.sai === undefined) {
    return payload as Omit<T, "sai"> & { sai?: string | null };
  }
  return {
    ...payload,
    sai: encryptSai(payload.sai),
  };
}
