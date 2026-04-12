/**
 * AES-256-GCM encryption for OAuth tokens stored at rest.
 * Key is loaded from ENCRYPTION_KEY env var (32 bytes, hex-encoded).
 *
 * Never log encrypted or decrypted tokens.
 * Never return tokens to the client.
 */

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length < 64) {
    // In development, generate a deterministic key from a placeholder
    if (process.env.NODE_ENV !== "production") {
      return crypto.scryptSync("dev-placeholder-key", "salt", 32);
    }
    throw new Error(
      "ENCRYPTION_KEY must be a 32-byte hex-encoded string (64 hex chars)",
    );
  }
  return Buffer.from(hex.slice(0, 64), "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
