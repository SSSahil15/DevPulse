const crypto = require("crypto");

const config = require("../config/env");

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  return crypto
    .createHash("sha256")
    .update(config.tokenEncryptionSecret)
    .digest()
    .subarray(0, KEY_LENGTH);
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

function decryptText(payload) {
  const [iv, authTag, encrypted] = String(payload).split(".");

  if (!iv || !authTag || !encrypted) {
    throw new Error("Encrypted payload format is invalid.");
  }

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64url")
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  decryptText,
  encryptText
};

