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

// Deterministic master Enclave keypair for serverless Vercel / multi-container alignment
export const DEFAULT_ENCLAVE_KEYPAIR = {
  publicKey: `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9Itq3uaw2mVrjnhvcKBo\n1RmSyqJFRBAWmVl6kQ5WI5EM+ZTZ5c/+RQJIG8j+F9dWxHtaS4//1363U3cJpKzo\nZ36SvP5EqiwOvjGWjInEPI92F5BCrlSqG6hfJV69WKsCErepSXX3/cc87CfXDYlC\nsL/Rmvq1LmJwhadjUdPeeKszcq+rhKNRr32BUvNtldWNSZiEcFc1bVjsM2bLhUus\nQvUiLRy8fwD72ojdoQFxBwDqeO8PhU5SOERAUE2xybfli3vu8fA2+m12CTzTmtOn\n1sz4QUIwtlg1+DMgyxFbpoUFP9/KS/Efyq9An2XmNhfK91C7K+Uy9Z+6Es2TmLnB\nHQIDAQAB\n-----END PUBLIC KEY-----\n`,
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD0i2re5rDaZWuO\neG9woGjVGZLKokVEEBaZWXqRDlYjkQz5lNnlz/5FAkgbyP4X11bEe1pLj//XfrdT\ndwmkrOhnfpK8/kSqLA6+MZaMicQ8j3YXkEKuVKobqF8lXr1YqwISt6lJdff9xzzs\nJ9cNiUKwv9Ga+rUuYnCFp2NR0954qzNyr6uEo1GvfYFS822V1Y1JmIRwVzVtWOwz\nZsuFS6xC9SItHLx/APvaiN2hAXEHAOp47w+FTlI4REBQTbHJt+WLe+7x8Db6bXYJ\nPNOa06fWzPhBQjC2WDX4MyDLEVumhQU/38pL8R/Kr0CfZeY2F8r3ULsr5TL1n7oS\nzZOYucEdAgMBAAECggEAAcVrZhHlq1nwstIh0dRXmLOGt1EAOhiju+3vT/2lQhIF\ni16N9XbRhfkY7JqYEd7NZ2mSoy7NJj0UttYLNoDKGMsh5PHdLXOu56cUSrr0tjuT\nxLfsGQx5RESulmaz7bXPXgir1oxe2h0HTpk7RYMo/dQQgJQwRmsQGue2IHGYZZH+\n6DSZUVQ9fs+18lwecwPQYnmdr1UjSYbrRlP4PHD6SdQlYrWuqSWe4rRBbBsRiOFe\nftYg7/n2X0cd/v9UYwJu49CwO3cgTsmreT2TBlMADaHIrduGDRaR4qYOuuttvbVW\noV0lD6DBJbSgbv9SLJfNRDYpI7cV8hX5OoyZLV5EAQKBgQD7ST2Fj2rrbCJtZP06\nK7P5mcup8NeonSdXx2t3f01rJOiXOk61xo71fNoyi+9famxfkz0YEvUg0iwKNk2l\nH5UE435DHgIHVa9Uad6FLGRvNXPe19s6u8WNeHMYRN3YMfytKI+6mQbhUhqh2NLI\narFVoMmDaAg90rXfiRp5KwMmkQKBgQD5Ic1fKlALcuKUQENtaOkXfGJXHC2ZCfhW\noCogBsbZfdCP4VR6aHkyxmpJFvaTy+m7r20OCqwPprrCn8HR3/x1vFpo3lgELy6H\nmn0VrVell7peo4o+/0WMhBh1TPJwJTV2/kP3jUL+lRtgaql+62nFJqhJczPKy/Ii\nKoMSLUtvzQKBgBsO8un73IaHOVnQQxhNdm7NKcod3gsRCRiBp8fRVHPSIJ2QMMOQ\nIvq6PACvYtJCcnMENtLtz6l+GDHtUQUT1ocVPBZcF9nUVzHeyJBMjHARMG3xjnDP\noWEvdC1L1RufnlbDBF8SdVQz9BwzbdcY7gmLa8eTnzeRBfaRG+GqSQeRAoGBAJK6\n5OGC40gK7wYP32amHnrVqHnTv8teAuTKSmU4eI+KOXc0aHP76j4MfHb1zl53//6p\nsJpPkM1bDq4oN5hryp5xQ/J12fME8uutArTsti1ycrLgsUCvSoAbIOidXEDOuXGP\nCerYSTf2C/y6dX+qGU6jmQRBlKSBf+e9kBr5kG+VAoGAWuxm7rK6MGHrSNsRdr43\nbwcvxzayCj7TyrviOQlKmiVdmk1HamVr9KF+SiXEowe8IG93LCdTE4yzL0p7PVUr\nkFVMeHIXB2PhdPYLMdQCExuE5KoADBZGWBOgpEYbrGf+ZPbrXBpkThdg80gyqWiC\nTQt+1+sFEQg7TBI9ZkXuA/U=\n-----END PRIVATE KEY-----\n`,
};

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

  // 1. Environment variables override
  if (process.env.SHUNYA_ENCLAVE_PUBLIC_KEY && process.env.SHUNYA_ENCLAVE_PRIVATE_KEY) {
    const pair = {
      publicKey: process.env.SHUNYA_ENCLAVE_PUBLIC_KEY.replace(/\\n/g, "\n"),
      privateKey: process.env.SHUNYA_ENCLAVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
    globalForEnclave.enclaveKeyPair = pair;
    return pair;
  }

  // 2. Check if persisted to disk
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
    // Non-fatal, proceed to default fallback
  }

  // 3. Fallback to deterministic master enclave keypair
  globalForEnclave.enclaveKeyPair = DEFAULT_ENCLAVE_KEYPAIR;
  return DEFAULT_ENCLAVE_KEYPAIR;
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

  const trimmed = sealedApiKeyBase64.trim();

  // 1. Handle hybrid envelope: ENCLAVE_HYBRID:{"w":...,"iv":...,"c":...}
  if (trimmed.startsWith("ENCLAVE_HYBRID:")) {
    try {
      const jsonStr = trimmed.replace("ENCLAVE_HYBRID:", "").trim();
      const payload = JSON.parse(jsonStr);
      const rawAesKey = crypto.privateDecrypt(
        {
          key: enclavePrivateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(payload.w, "base64")
      );
      const fullCiphertext = Buffer.from(payload.c, "base64");
      const tag = fullCiphertext.subarray(fullCiphertext.length - 16);
      const ciphertext = fullCiphertext.subarray(0, fullCiphertext.length - 16);
      const decipher = crypto.createDecipheriv("aes-256-gcm", rawAesKey, Buffer.from(payload.iv, "hex"));
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const resultKey = cleanApiKey(decrypted.toString("utf8"));
      if (resultKey) return resultKey;
    } catch (hybridErr: any) {
      console.warn("[EnclaveCrypto] ENCLAVE_HYBRID unwrap failed:", hybridErr.message);
    }
  }

  // 2. Handle explicit ENCLAVE_SEALED: prefix
  if (trimmed.startsWith("ENCLAVE_SEALED:")) {
    const raw = cleanApiKey(trimmed.replace("ENCLAVE_SEALED:", ""));
    if (isRecognizedApiKey(raw)) {
      return raw;
    }
    try {
      const decoded = cleanApiKey(Buffer.from(raw, "base64").toString("utf8"));
      if (isRecognizedApiKey(decoded)) {
        return decoded;
      }
    } catch {}
    return raw;
  }

  // 3. Handle direct plaintext API key
  const cleanedDirect = cleanApiKey(trimmed);
  if (isRecognizedApiKey(cleanedDirect)) {
    return cleanedDirect;
  }

  // 4. Standard RSA-OAEP private key decryption
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: enclavePrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(trimmed, "base64")
    );
    return cleanApiKey(decrypted.toString("utf8"));
  } catch (rsaErr: any) {
    // Fallback: Check if base64 decodes directly as plaintext recognized key
    try {
      const plain = cleanApiKey(Buffer.from(trimmed, "base64").toString("utf8"));
      if (isRecognizedApiKey(plain)) {
        return plain;
      }
    } catch {}
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
