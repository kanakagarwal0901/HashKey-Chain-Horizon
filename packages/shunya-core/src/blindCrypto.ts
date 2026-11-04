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

export function cleanApiKey(key: string): string {
  if (!key || typeof key !== "string") return "";
  let cleaned = key.trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.toLowerCase().startsWith("bearer ")) {
    cleaned = cleaned.slice(7).trim();
  }
  return cleaned;
}

export function isRecognizedApiKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const k = cleanApiKey(key);
  return (
    k.startsWith("sk-") ||
    k.startsWith("gsk_") ||
    k.startsWith("AIza") ||
    k.startsWith("AQ.") ||
    k.startsWith("xai-") ||
    k.includes("test_seller_key") ||
    k.includes("demo-token-key") ||
    k.includes("top_secret")
  );
}

export function getOrCreateEnclaveKeyPair(): { publicKey: string; privateKey: string } {
  if (globalForEnclave.enclaveKeyPair) {
    return globalForEnclave.enclaveKeyPair;
  }

  const pubKeyEnv = process.env.SHUNYA_ENCLAVE_PUBLIC_KEY;
  const privKeyEnv = process.env.SHUNYA_ENCLAVE_PRIVATE_KEY;

  if (!pubKeyEnv || !privKeyEnv) {
    throw new Error(
      "Missing required enclave keypair in environment. Please set SHUNYA_ENCLAVE_PUBLIC_KEY and SHUNYA_ENCLAVE_PRIVATE_KEY."
    );
  }

  const pair = {
    publicKey: pubKeyEnv.replace(/\\n/g, "\n").trim(),
    privateKey: privKeyEnv.replace(/\\n/g, "\n").trim(),
  };

  globalForEnclave.enclaveKeyPair = pair;
  return pair;
}

// SELLER BROWSER: Seal Seller's raw API key so only the Enclave can unwrap it
export function sealSellerApiKeyToEnclave(rawApiKey: string, enclavePublicKeyPem: string): string {
  const rawBuf = Buffer.from(rawApiKey, "utf8");
  if (rawBuf.length <= 180) {
    const encrypted = crypto.publicEncrypt(
      {
        key: enclavePublicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      rawBuf
    );
    return encrypted.toString("base64");
  }

  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(rawBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  const wrappedKey = crypto.publicEncrypt(
    {
      key: enclavePublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );
  return `ENCLAVE_HYBRID:${JSON.stringify({
    w: wrappedKey.toString("base64"),
    iv: iv.toString("hex"),
    c: Buffer.concat([ciphertext, tag]).toString("base64"),
  })}`;
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

  const trimmed = sealedApiKeyBase64.trim();

  // 1. Handle hybrid envelope: ENCLAVE_HYBRID:{"w":...,"iv":...,"c":...}
  if (trimmed.startsWith("ENCLAVE_HYBRID:")) {
    const jsonStr = trimmed.replace("ENCLAVE_HYBRID:", "").trim();
    let payload: { w: string; iv: string; c: string };
    try {
      payload = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      throw new Error(`Invalid ENCLAVE_HYBRID payload JSON: ${parseErr.message}`);
    }

    if (!payload.w || !payload.iv || !payload.c) {
      throw new Error("Malformed ENCLAVE_HYBRID payload: missing w, iv, or c");
    }

    const rawAesKey = crypto.privateDecrypt(
      {
        key: enclavePrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(payload.w, "base64")
    );
    const fullCiphertext = Buffer.from(payload.c, "base64");
    if (fullCiphertext.length < 16) {
      throw new Error("Malformed ENCLAVE_HYBRID ciphertext: length too short for auth tag");
    }
    const tag = fullCiphertext.subarray(fullCiphertext.length - 16);
    const ciphertext = fullCiphertext.subarray(0, fullCiphertext.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", rawAesKey, Buffer.from(payload.iv, "hex"));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const resultKey = cleanApiKey(decrypted.toString("utf8"));
    if (!resultKey) {
      throw new Error("Decrypted API key is empty");
    }
    return resultKey;
  }

  // Reject explicit plaintext prefixes or recognized plaintext keys
  if (trimmed.startsWith("ENCLAVE_SEALED:")) {
    throw new Error("Plaintext sealing format ENCLAVE_SEALED is rejected");
  }
  if (isRecognizedApiKey(trimmed)) {
    throw new Error("Plaintext API key is rejected; must be RSA-OAEP sealed");
  }

  // 2. Standard RSA-OAEP private key decryption
  const decrypted = crypto.privateDecrypt(
    {
      key: enclavePrivateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(trimmed, "base64")
  );
  const resultKey = cleanApiKey(decrypted.toString("utf8"));
  if (!resultKey) {
    throw new Error("Decrypted API key is empty");
  }
  return resultKey;
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
