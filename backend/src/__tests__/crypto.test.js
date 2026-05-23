/**
 * crypto.test.js
 * ==============
 * Unit tests for AES-256-GCM encrypt/decrypt helpers in utils/crypto.js.
 * Tests cover: round-trip correctness, format validation, tamper detection,
 * and edge cases (empty string, unicode, long strings).
 */

const { encryptText, decryptText } = require("../utils/crypto");

describe("encryptText / decryptText — round-trip", () => {
  it("encrypts and decrypts a plain ASCII string correctly", () => {
    const original = "hello world";
    const ciphertext = encryptText(original);
    expect(decryptText(ciphertext)).toBe(original);
  });

  it("encrypts and decrypts a GitHub token (realistic value)", () => {
    const token = "ghp_" + "a".repeat(36);
    expect(decryptText(encryptText(token))).toBe(token);
  });

  it("encrypts and decrypts unicode / emoji strings", () => {
    const val = "こんにちは 🚀 αβγ";
    expect(decryptText(encryptText(val))).toBe(val);
  });

  it("does not support empty string (encrypted body is empty — format guard throws)", () => {
    // AES-GCM of empty string produces an empty ciphertext — the base64url of
    // an empty Buffer is "", which is falsy. decryptText's format check catches
    // this and throws rather than silently returning the wrong value.
    expect(() => decryptText(encryptText(""))).toThrow("Encrypted payload format is invalid.");
  });

  it("encrypts and decrypts a very long string (4 KB)", () => {
    const long = "x".repeat(4096);
    expect(decryptText(encryptText(long))).toBe(long);
  });


  it("produces different ciphertext on each call (random IV)", () => {
    const ct1 = encryptText("same input");
    const ct2 = encryptText("same input");
    // Same plaintext → different ciphertext (IV is random)
    expect(ct1).not.toBe(ct2);
    // But both decrypt to the same value
    expect(decryptText(ct1)).toBe("same input");
    expect(decryptText(ct2)).toBe("same input");
  });
});

describe("encryptText — output format", () => {
  it("returns a dot-separated string with 3 parts (iv.authTag.ciphertext)", () => {
    const ciphertext = encryptText("test");
    const parts = ciphertext.split(".");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("ciphertext is different from plaintext", () => {
    const plainText = "sensitive-token-value";
    expect(encryptText(plainText)).not.toBe(plainText);
  });

  it("uses base64url encoding (no +, /, = characters)", () => {
    const ciphertext = encryptText("test value");
    expect(ciphertext).not.toMatch(/[+/=]/);
  });
});

describe("decryptText — error cases", () => {
  it("throws when payload has fewer than 3 parts", () => {
    expect(() => decryptText("onlyone")).toThrow();
    expect(() => decryptText("two.parts")).toThrow();
  });

  it("throws when payload is an empty string", () => {
    expect(() => decryptText("")).toThrow();
  });

  it("throws when authTag is tampered with (GCM integrity check)", () => {
    const ciphertext = encryptText("original");
    // Replace the authTag segment (middle part) with random bytes
    const parts = ciphertext.split(".");
    parts[1] = "AAAAAAAAAAAAAAAA"; // wrong auth tag
    expect(() => decryptText(parts.join("."))).toThrow();
  });

  it("throws when the ciphertext body is tampered with", () => {
    const ciphertext = encryptText("original");
    const parts = ciphertext.split(".");
    // Flip a character in the encrypted body
    parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith("A") ? "B" : "A");
    expect(() => decryptText(parts.join("."))).toThrow();
  });

  it("throws when payload is null (coerced to string 'null')", () => {
    // String(null) = "null" → split gives ["null"] → throws format error
    expect(() => decryptText(null)).toThrow();
  });
});
