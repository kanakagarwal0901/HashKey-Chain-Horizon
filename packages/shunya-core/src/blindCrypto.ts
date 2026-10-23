import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface EncryptedFilePayload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  ivHex: string;
  authTagHex: string;
  ciphertextBase64: string;
  storageTarget: "arkiv" | "zeroG";
  storageRefId?: string;
}

export interface BuyerEncryptedEnvelope {
  wrappedKeysBase64: string;
  promptIvHex: string;
  promptAuthTagHex: string;
  encryptedPromptBase64: string;
  files: EncryptedFilePayload[];
  ephemeralBuyerFingerprint: string;
}

// In-memory or persisted enclave keypair for the prototype
const globalForEnclave = globalThis as unknown as {
  enclaveKeyPair?: { publicKey: string; privateKey: string };
};

export function getOrCreateEnclaveKeyPair(): { publicKey: string; privateKey: string } {
  if (globalForEnclave.enclaveKeyPair) {
    return globalForEnclave.enclaveKeyPair;
  }

  // Check if persisted to disk
  try {
    const keyFilePath = path.join(process.cwd(), ".enclave_keypair.json");
    if (fs.existsSync(keyFilePath)) {
      const saved = JSON.parse(fs.readFileSync(keyFilePath, "utf8"));
      if (saved.publicKey && saved.privateKey) {
        globalForEnclave.enclaveKeyPair = saved;
        return saved;
      }
    }
  } catch {
    // Fall through to generate
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const pair = { publicKey, privateKey };
  try {
    const keyFilePath = path.join(process.cwd(), ".enclave_keypair.json");
    fs.writeFileSync(keyFilePath, JSON.stringify(pair, null, 2), "utf8");
  } catch {
    // Non-fatal if filesystem is read-only
  }

  globalForEnclave.enclaveKeyPair = pair;
  return pair;
}

// SELLER BROWSER: Seal Seller's raw API key so only the Enclave can unwrap it
export function sealSellerApiKeyToEnclave(rawApiKey: string, enclavePublicKeyPem: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: enclavePublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(rawApiKey, "utf8")
  );
  return encrypted.toString("base64");
}

// BUYER BROWSER: Encrypt arbitrary attached files + prompt + K_return key
export function sealBuyerPromptAndFiles(
  promptText: string,
  files: { filename: string; mimeType: string; data: Buffer }[],
  enclavePublicKeyPem: string
): {
  buyerLocalReturnKey: Buffer;
  buyerLocalReturnKeyBase64: string;
  encryptedEnvelope: BuyerEncryptedEnvelope;
} {
  const kInput = crypto.randomBytes(32);  // AES-256 key for Buyer prompt & attached files
  const kReturn = crypto.randomBytes(32); // Used by Enclave to encrypt AI output

  // Encrypt each attached file locally before upload to Arkiv (<=128KB) or 0G Storage (>128KB)
  const encryptedFiles: EncryptedFilePayload[] = files.map((f) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", kInput, iv);
    const ciphertext = Buffer.concat([cipher.update(f.data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const isSmall = f.data.byteLength <= 128 * 1024;
    return {
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: f.data.byteLength,
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
      ciphertextBase64: ciphertext.toString("base64"),
      storageTarget: isSmall ? "arkiv" : "zeroG",
      storageRefId: `urn:${isSmall ? "arkiv" : "0g"}:${crypto.randomBytes(8).toString("hex")}`,
    };
  });

  // Encrypt prompt text
  const promptIv = crypto.randomBytes(12);
  const promptCipher = crypto.createCipheriv("aes-256-gcm", kInput, promptIv);
  const encryptedPrompt = Buffer.concat([
    promptCipher.update(promptText, "utf8"),
    promptCipher.final(),
  ]);
  const promptAuthTag = promptCipher.getAuthTag();

  // Wrap kInput and kReturn to Enclave Public Key
  const wrappedKeys = crypto.publicEncrypt(
    {
      key: enclavePublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(
      JSON.stringify({
        kInputHex: kInput.toString("hex"),
        kReturnHex: kReturn.toString("hex"),
      })
    )
  );

  return {
    buyerLocalReturnKey: kReturn,
    buyerLocalReturnKeyBase64: kReturn.toString("base64"),
    encryptedEnvelope: {
      wrappedKeysBase64: wrappedKeys.toString("base64"),
      promptIvHex: promptIv.toString("hex"),
      promptAuthTagHex: promptAuthTag.toString("hex"),
      encryptedPromptBase64: encryptedPrompt.toString("base64"),
      files: encryptedFiles,
      ephemeralBuyerFingerprint: crypto.randomBytes(8).toString("hex"),
    },
  };
}

// ENCLAVE RAM: Unwrap Seller API key
export function unwrapSellerApiKey(sealedApiKeyBase64: string, enclavePrivateKeyPem: string): string {
  if (!sealedApiKeyBase64 || typeof sealedApiKeyBase64 !== "string") {
    throw new Error("Missing or invalid sealed API key payload");
  }

  // Handle explicit ENCLAVE_SEALED: prefix
  if (sealedApiKeyBase64.startsWith("ENCLAVE_SEALED:")) {
    const raw = sealedApiKeyBase64.replace("ENCLAVE_SEALED:", "").trim();
    if (
      raw.startsWith("sk-") ||
      raw.startsWith("gsk_") ||
      raw.startsWith("AIza") ||
      raw.startsWith("xai-")
    ) {
      return raw;
    }
    // Only attempt base64 decode if raw does not already start with known API key prefixes
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      if (
        decoded.startsWith("sk-") ||
        decoded.startsWith("gsk_") ||
        decoded.startsWith("AIza") ||
        decoded.startsWith("xai-")
      ) {
        return decoded;
      }
    } catch {
      // not base64
    }
    return raw;
  }

  // Handle direct plaintext API key passed in development or fallback mode
  const trimmed = sealedApiKeyBase64.trim();
  if (
    trimmed.startsWith("sk-") ||
    trimmed.startsWith("gsk_") ||
    trimmed.startsWith("AIza") ||
    trimmed.startsWith("xai-")
  ) {
    return trimmed;
  }

  // Try standard RSA-OAEP private key decryption
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: enclavePrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(trimmed, "base64")
    );
    return decrypted.toString("utf8");
  } catch (rsaErr: any) {
    // Fallback: If WebCrypto was unavailable (e.g. non-HTTPS local network IP) and returned base64(rawKey)
    try {
      const plain = Buffer.from(trimmed, "base64").toString("utf8");
      if (
        plain.startsWith("sk-") ||
        plain.startsWith("gsk_") ||
        plain.startsWith("AIza") ||
        plain.startsWith("xai-") ||
        plain.length >= 15
      ) {
        return plain;
      }
    } catch {
      // not valid utf8 base64
    }
    throw new Error(`Enclave RSA-OAEP unwrap failure: ${rsaErr.message}`);
  }
}

// ENCLAVE RAM: Unwrap Buyer Prompt & Files
export function unwrapBuyerEnvelopeInEnclave(
  envelope: BuyerEncryptedEnvelope,
  enclavePrivateKeyPem: string
): {
  promptText: string;
  files: { filename: string; mimeType: string; data: Buffer }[];
  kReturn: Buffer;
} {
  // 1. Decrypt ephemeral symmetric keys
  const decryptedKeysJson = crypto.privateDecrypt(
    {
      key: enclavePrivateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(envelope.wrappedKeysBase64, "base64")
  ).toString("utf8");

  const { kInputHex, kReturnHex } = JSON.parse(decryptedKeysJson);
  const kInput = Buffer.from(kInputHex, "hex");
  const kReturn = Buffer.from(kReturnHex, "hex");

  // 2. Decrypt prompt text
  const promptIv = Buffer.from(envelope.promptIvHex, "hex");
  const promptAuthTag = Buffer.from(envelope.promptAuthTagHex, "hex");
  const promptDecipher = crypto.createDecipheriv("aes-256-gcm", kInput, promptIv);
  promptDecipher.setAuthTag(promptAuthTag);
  const promptDecrypted = Buffer.concat([
    promptDecipher.update(Buffer.from(envelope.encryptedPromptBase64, "base64")),
    promptDecipher.final(),
  ]).toString("utf8");

  // 3. Decrypt files
  const files = (envelope.files || []).map((f) => {
    const fileIv = Buffer.from(f.ivHex, "hex");
    const fileAuthTag = Buffer.from(f.authTagHex, "hex");
    const fileDecipher = crypto.createDecipheriv("aes-256-gcm", kInput, fileIv);
    fileDecipher.setAuthTag(fileAuthTag);
    const decryptedData = Buffer.concat([
      fileDecipher.update(Buffer.from(f.ciphertextBase64, "base64")),
      fileDecipher.final(),
    ]);
    return {
      filename: f.filename,
      mimeType: f.mimeType,
      data: decryptedData,
    };
  });

  return {
    promptText: promptDecrypted,
    files,
    kReturn,
  };
}

// ENCLAVE RAM: Encrypt AI output using Buyer's local K_return
export function encryptAiOutputWithReturnKey(
  aiOutputText: string,
  reasoningText: string,
  kReturn: Buffer
): {
  ivHex: string;
  authTagHex: string;
  encryptedOutputBase64: string;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", kReturn, iv);
  const payload = JSON.stringify({ aiOutputText, reasoningText });
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex"),
    encryptedOutputBase64: ciphertext.toString("base64"),
  };
}

// BUYER BROWSER: Decrypt sealed AI output locally
export function decryptBuyerOutput(
  encryptedOutputBase64: string,
  ivHex: string,
  authTagHex: string,
  kReturnInput: string | Buffer
): { aiOutputText: string; reasoningText: string } {
  const kReturn = Buffer.isBuffer(kReturnInput)
    ? kReturnInput
    : Buffer.from(kReturnInput, "base64");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", kReturn, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedOutputBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(decrypted);
}
