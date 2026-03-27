import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { Asset } from "@prisma/client"

const ALGORITHM = "aes-256-gcm"
const ENC_PREFIX = "enc:"

function getKey(): Buffer | null {
  const key = process.env.DATA_ENCRYPTION_KEY
  if (!key) return null // local dev — no encryption
  const buf = Buffer.from(key, "hex")
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 64 hex chars (32 bytes)")
  return buf
}

function encryptString(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`
}

function decryptString(value: string, key: Buffer): string {
  if (!value.startsWith(ENC_PREFIX)) return value // plaintext (pre-encryption legacy data)
  const parts = value.slice(ENC_PREFIX.length).split(":")
  if (parts.length !== 3) return value
  const [ivB64, authTagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")
  const data = Buffer.from(dataB64, "base64")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data).toString("utf8") + decipher.final("utf8")
}

/** Encrypts a string field. Returns null for null/empty. No-op if DATA_ENCRYPTION_KEY not set. */
export function encryptField(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null
  const key = getKey()
  if (!key) return value
  return encryptString(value, key)
}

/** Decrypts a string field. Returns null for null. No-op if DATA_ENCRYPTION_KEY not set. */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null
  const key = getKey()
  if (!key) return value
  return decryptString(value, key)
}

/** Returns an asset with all sensitive fields decrypted (for API responses and emails). */
export function decryptAsset(asset: Asset): Asset {
  return {
    ...asset,
    name: decryptField(asset.name) ?? asset.name,
    description: decryptField(asset.description),
    value: decryptField(asset.value),
    notes: decryptField(asset.notes),
  }
}
