#!/usr/bin/env node
/**
 * Verify encryptSai/decryptSai round-trip. Run from repo root with .env loaded.
 * Usage: node --env-file=../../.env packages/database/scripts/verify-encryption.mjs
 *    or: cd packages/database && node --env-file=../../.env scripts/verify-encryption.mjs
 */
import { encryptSai, decryptSai } from "../dist/encryption.js";

const testValues = [-1500, 0, 5000, 999999];
let failed = 0;

for (const val of testValues) {
  try {
    const enc = encryptSai(val);
    const dec = decryptSai(enc);
    if (dec === val) {
      console.log(`✓ encrypt/decrypt ${val} → OK`);
    } else {
      console.error(`✗ encrypt/decrypt ${val} → got ${dec}`);
      failed++;
    }
  } catch (err) {
    console.error(`✗ encrypt/decrypt ${val} → ${err.message}`);
    failed++;
  }
}

// Legacy plaintext
const leg = decryptSai("12345");
if (leg === 12345) {
  console.log("✓ legacy plaintext '12345' → OK");
} else {
  console.error(`✗ legacy plaintext → got ${leg}`);
  failed++;
}

process.exit(failed > 0 ? 1 : 0);
