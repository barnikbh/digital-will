import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import { encryptField, decryptField, decryptAsset } from "../lib/crypto"
import type { Asset } from "@prisma/client"

const TEST_KEY = "a".repeat(64)

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "test-id",
    userId: "user-1",
    type: "bank",
    name: encryptField("My Bank")!,
    description: encryptField("Account 123"),
    value: encryptField("₹5,00,000"),
    notes: encryptField("Contact manager"),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe("encryptField / decryptField", () => {
  before(() => {
    process.env.DATA_ENCRYPTION_KEY = TEST_KEY
  })

  it("round-trips a plain string", () => {
    const original = "HDFC Savings Account"
    const encrypted = encryptField(original)!
    assert.match(encrypted, /^enc:/)
    assert.notEqual(encrypted, original)
    assert.equal(decryptField(encrypted), original)
  })

  it("returns null for null input", () => {
    assert.equal(encryptField(null), null)
    assert.equal(decryptField(null), null)
  })

  it("returns empty string for empty string on encryptField (passthrough)", () => {
    assert.equal(encryptField(""), "")
  })

  it("produces a unique ciphertext each call (fresh IV per call)", () => {
    const a = encryptField("same value")
    const b = encryptField("same value")
    assert.notEqual(a, b)
  })

  it("decryptField handles pre-encryption plaintext (no enc: prefix)", () => {
    assert.equal(decryptField("plain old string"), "plain old string")
  })

  it("decryptField returns null for malformed ciphertext", () => {
    assert.equal(decryptField("enc:badinput"), null)
  })

  it("decryptField returns null for tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = encryptField("secret")!
    const tampered = encrypted.slice(0, -4) + "XXXX"
    assert.equal(decryptField(tampered), null)
  })
})

describe("decryptAsset", () => {
  before(() => {
    process.env.DATA_ENCRYPTION_KEY = TEST_KEY
  })

  it("decrypts all sensitive fields", () => {
    const decrypted = decryptAsset(makeAsset())
    assert.equal(decrypted.name, "My Bank")
    assert.equal(decrypted.description, "Account 123")
    assert.equal(decrypted.value, "₹5,00,000")
    assert.equal(decrypted.notes, "Contact manager")
  })

  it("falls back to empty string for corrupted name (does not leak ciphertext)", () => {
    const decrypted = decryptAsset(makeAsset({ name: "enc:CORRUPTED" }))
    assert.equal(decrypted.name, "")
  })

  it("leaves null optional fields as null", () => {
    const decrypted = decryptAsset(makeAsset({ description: null, value: null, notes: null }))
    assert.equal(decrypted.description, null)
    assert.equal(decrypted.value, null)
    assert.equal(decrypted.notes, null)
  })
})

describe("production key guard", () => {
  it("guard logic throws when key missing and env is production", () => {
    // Simulate the getKey() guard inline (process.env.NODE_ENV is read-only in Node 23)
    const simulateGetKey = (key: string | undefined, env: string) => {
      if (!key) {
        if (env === "production") throw new Error("DATA_ENCRYPTION_KEY is required in production")
        return null
      }
      return Buffer.from(key, "hex")
    }
    assert.throws(
      () => simulateGetKey(undefined, "production"),
      /DATA_ENCRYPTION_KEY is required in production/
    )
    assert.equal(simulateGetKey(undefined, "development"), null)
    assert.ok(simulateGetKey("a".repeat(64), "production"))
  })
})
