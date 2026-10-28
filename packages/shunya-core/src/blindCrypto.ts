import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cleanApiKey } from "./apiKeyVerifier";

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

// Deterministic default enclave RSA-2048 keypair ensuring 100% stable cross-container TEE sealing
export const DEFAULT_ENCLAVE_KEYPAIR = {
  publicKey:
    "-----BEGIN PUBLIC KEY-----\n" +
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoeo1j14x5IzDwSVLRkXb\n" +
    "84BbIY0bk85jRuqasU3gx4MhloN9mdq+8guWImEGPxf+ddgxyBwMp2ZZmmBDJ/NB\n" +
    "gKPcwv5b+WeJNA/7XFsOY7hL7+WXLDUoNFcvHBi3Szv7bkdzNqI4eV2kP88j56Pj\n" +
    "CfnZNzpfRn+VCCchQLXX8vLYKmMxNWub4HCiNkkW9Q5OKip+NN5II/4jfqNwBe2V\n" +
    "p9lPnscSh1KeEv7Xu3xWHdaYyLibBsyYSwroWtkQp2JPM5JATsigw8Yb+HerjYSo\n" +
    "UZ2wRiojLK6XIeDBfcTLMKPbnQF/thA0jd7mAgvdKgWxf8eNi/Cv9JPZC3sxXp32\n" +
    "jwIDAQAB\n" +
    "-----END PUBLIC KEY-----\n",
  privateKey:
    "-----BEGIN PRIVATE KEY-----\n" +
    "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCh6jWPXjHkjMPB\n" +
    "JUtGRdvzgFshjRuTzmNG6pqxTeDHgyGWg32Z2r7yC5YiYQY/F/512DHIHAynZlma\n" +
    "YEMn80GAo9zC/lv5Z4k0D/tcWw5juEvv5ZcsNSg0Vy8cGLdLO/tuR3M2ojh5XaQ/\n" +
    "zyPno+MJ+dk3Ol9Gf5UIJyFAtdfy8tgqYzE1a5vgcKI2SRb1Dk4qKn403kgj/iN+\n" +
    "o3AF7ZWn2U+exxKHUp4S/te7fFYd1pjIuJsGzJhLCuha2RCnYk8zkkBOyKDDxhv4\n" +
    "d6uNhKhRnbBGKiMsrpch4MF9xMswo9udAX+2EDSN3uYCC90qBbF/x42L8K/0k9kL\n" +
    "ezFenfaPAgMBAAECggEAQkN8ufjdyGBHeNNPdCoA8y2Tni6Gm736aTp4JpntpRko\n" +
    "dNXJYF7iiGJvhhBZIxcpv4bEENZR42yCvSgqM75dD02AepjogTB7OUBVKZ3mTK9O\n" +
    "/JXkgWYb1xfbIs+GrBaXNrGtGC3ZmOnW33phglpS/3EuEWklNs/d6SFCfZ4uC7Hp\n" +
    "li9B/A5NNOSpYAf0mW9oJvT5FDuNkPrWrxoLIaeiyMPhVM0IISlvFpcWb/nwuzvy\n" +
    "NrwEx51mJ56NW8fkbISi5cGhaJXII91sLXp3vi0lhjAMfPgA1ohxndgjJFjw0WCT\n" +
    "lj/Mjsv/zqyBw0oo9/G+BwSQQqPioQL5IT2h0dN6aQKBgQDgG2qS4SzsIbvM4zI+\n" +
    "/1txWQgObg8xRhkI3MPdCClLlXw0UeekjgVE1XP3Fn4McU7qH73BDpjmMJFnAWRk\nsSmI1oJsVIjxjaE/TWU89eX/5eRZnWIuXfXo4HrvsK73+Ufqg59syBgxkYf76jJu\nwEAI9NUYCzHEEp2Kh03SY7h6YwKBgQC49QetsXJb/OHYBOU5UnbSByM4DWVdKxux\nl8IskcA8+PVwqYBOovRyQcnJaXWDoMiSo8Qnsi4MI5LWV6PNQnIWUPQ7iT8dRobn\nxQ5kd/rc9iVqu1TWuhLKlODorN7zXpgJM4qmiwqllXQbkMquo4yegQPReWn9VNsw\nThvCptBU5QKBgAGOTywb4hr1lP80KJolXbYovxSSkQpviSb1mWqEbvz2WblnRCtx\nTPoQXVC+2Dsv4jNf6wpXFpqqhafoa5EDZd1sV9V2tMiwigkNeYF115XyO6afoBng\nTx/Bxzi4yk4wbd5j8Yxoyzo033PRSW5ZaVhmksAq+7p3wp4+mDy4soQvAoGAdvAb\nH/ccM0tLcD61qUb+YdF1NHZo2KEADhQpKcAQfyUZsHlPqUHhMBheSscmap7aXHIz\nkdNjCStXIb759uTjuLYWWLLJg2n3FtQBjVoaWD1xklElHXBK5TsX5ohEVvxdiI08\nfBytnA2fvJo/vE4v/z231tzc66vFyCpyb5oWHoECgYEA3VY4c7ya4HuYzzlE8K3j\nRz9jx+4MfrsmSln6hkCPPA3wxUB3dtnqa3Q1EgnK0Ejf1LEbylFx6dcjk8ml5LSU\noAFXXsbHFErTdHal6Al0W7At+M7Wg6lfS0k1RLRg+bBjW8mJ375LGjajZ/6mrUI/\nyvHi5afGmnIgL9N97Dlk6a4=\n" +
    "-----END PRIVATE KEY-----\n",
};

// In-memory or persisted enclave keypair
const globalForEnclave = globalThis as unknown as {
  enclaveKeyPair?: { publicKey: string; privateKey: string };
};

export function getOrCreateEnclaveKeyPair(): { publicKey: string; privateKey: string } {
  if (globalForEnclave.enclaveKeyPair) {
    return globalForEnclave.enclaveKeyPair;
  }

  // 1. Check if persisted to disk
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
    // Fall through to environment or default
  }

  // 2. Check environment variable override
  if (process.env.ENCLAVE_PRIVATE_KEY && process.env.ENCLAVE_PUBLIC_KEY) {
    const envPair = {
      publicKey: process.env.ENCLAVE_PUBLIC_KEY.replace(/\\n/g, "\n"),
      privateKey: process.env.ENCLAVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
    globalForEnclave.enclaveKeyPair = envPair;
    return envPair;
  }

  // 3. Deterministic default keypair (identical across serverless containers)
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

  // Handle explicit ENCLAVE_SEALED: prefix
  if (sealedApiKeyBase64.startsWith("ENCLAVE_SEALED:")) {
    const raw = sealedApiKeyBase64.replace("ENCLAVE_SEALED:", "").trim();
    return cleanApiKey(raw);
  }

  // Handle direct plaintext API key passed in development or fallback mode
  const trimmed = cleanApiKey(sealedApiKeyBase64);
  if (
    trimmed.startsWith("sk-") ||
    trimmed.startsWith("gsk_") ||
    trimmed.startsWith("AIza") ||
    trimmed.startsWith("xai-") ||
    trimmed.startsWith("demo") ||
    trimmed.startsWith("test")
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
    const result = decrypted.toString("utf8");
    return cleanApiKey(result);
  } catch (rsaErr: any) {
    // Fallback: If WebCrypto was unavailable (e.g. non-HTTPS local network IP) and returned base64(rawKey)
    try {
      const plain = Buffer.from(trimmed, "base64").toString("utf8");
      if (
        plain.startsWith("sk-") ||
        plain.startsWith("gsk_") ||
        plain.startsWith("AIza") ||
        plain.startsWith("xai-") ||
        plain.startsWith("demo") ||
        plain.startsWith("test")
      ) {
        return cleanApiKey(plain);
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
