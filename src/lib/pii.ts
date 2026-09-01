import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const algorithm = "aes-256-gcm";
const version = "v1";

function key() {
  return createHash("sha256").update(env.PII_ENCRYPTION_KEY || env.BETTER_AUTH_SECRET).digest();
}

export function encryptPii(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${version}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPii(value: string) {
  const [storedVersion, ivValue, tagValue, encryptedValue] = value.split(".");
  if (storedVersion !== version || !ivValue || !tagValue || !encryptedValue) return value;
  const decipher = createDecipheriv(algorithm, key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function maskAadhaar(value: string | null | undefined) {
  if (!value) return null;
  const digits = decryptPii(value).replace(/\D/g, "");
  return digits.length === 12 ? `XXXX-XXXX-${digits.slice(-4)}` : "Protected";
}

export function maskPan(value: string | null | undefined) {
  if (!value) return null;
  const pan = decryptPii(value).toUpperCase();
  return pan.length === 10 ? `${pan.slice(0, 2)}XXXXXX${pan.slice(-2)}` : "Protected";
}
