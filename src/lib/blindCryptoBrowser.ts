// Browser-safe Web Crypto operations for EF CROPS and 0G Sealed Enclave Privacy

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^\n]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^0x/, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bufToBase64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.byteLength; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const clean = (b64 || "").replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface EncryptedBrowserFile {
  filename: string;
  mimeType: string;
  originalSizeBytes: number;
  ivHex: string;
  authTagHex: string;
  encryptedBytes: Uint8Array;
  ciphertextBase64: string;
}

export interface BlindBrowserEnvelope {
  wrappedKeysBase64: string;
  promptIvHex: string;
  promptAuthTagHex: string;
  encryptedPromptBase64: string;
  files: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    ivHex: string;
    authTagHex: string;
    storageTarget?: string;
    storageRefId?: string;
  }[];
  ephemeralBuyerFingerprint: string;
}

// 1. SELLER BROWSER: Seal raw API key to Enclave RSA-OAEP Public Key
export async function sealSellerApiKeyInBrowser(
  rawApiKey: string,
  enclavePublicKeyPem: string
): Promise<string> {
  if (!rawApiKey) return "";

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return `ENCLAVE_SEALED:${rawApiKey}`;
  }

  try {
    const spkiBuf = pemToArrayBuffer(enclavePublicKeyPem);
    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      spkiBuf,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    const encoded = new TextEncoder().encode(rawApiKey);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      encoded as unknown as BufferSource
    );

    return bufToBase64(new Uint8Array(encrypted));
  } catch (err) {
    console.warn("[BlindCryptoBrowser] Sealing fallback:", err);
    return `ENCLAVE_SEALED:${rawApiKey}`;
  }
}

// 2. BUYER BROWSER: Encrypt files & prompt, wrap keys to Enclave Public Key
export async function encryptBuyerFilesAndPromptInBrowser(
  promptText: string,
  files: File[],
  enclavePublicKeyPem: string
): Promise<{
  kReturnCryptoKey: CryptoKey;
  kInputHexPreview: string;
  kReturnHexPreview: string;
  encryptedFiles: EncryptedBrowserFile[];
  encryptedEnvelope: BlindBrowserEnvelope;
}> {
  // Generate random 256-bit AES keys
  const kInputRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const kReturnRaw = window.crypto.getRandomValues(new Uint8Array(32));

  const kInputKey = await window.crypto.subtle.importKey(
    "raw",
    kInputRaw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  const kReturnCryptoKey = await window.crypto.subtle.importKey(
    "raw",
    kReturnRaw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );

  // Encrypt all attached files locally in RAM
  const encryptedFiles: EncryptedBrowserFile[] = [];
  const fileManifestForEnvelope: any[] = [];

  for (const file of files) {
    const fileBytes = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedWithTag = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      kInputKey,
      fileBytes
    );

    const fullEncryptedBytes = new Uint8Array(encryptedWithTag);
    // Split WebCrypto trailing 16-byte tag
    const ciphertext = fullEncryptedBytes.slice(0, -16);
    const authTag = fullEncryptedBytes.slice(-16);

    const ivHex = bufToHex(iv);
    const authTagHex = bufToHex(authTag);
    const ciphertextBase64 = bufToBase64(ciphertext);

    encryptedFiles.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      originalSizeBytes: file.size,
      ivHex,
      authTagHex,
      encryptedBytes: fullEncryptedBytes,
      ciphertextBase64,
    });

    fileManifestForEnvelope.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      ivHex,
      authTagHex,
      storageTarget: file.size <= 120 * 1024 ? "arkiv" : "0g-storage",
    });
  }

  // Encrypt the prompt text and file metadata manifest
  const promptIv = window.crypto.getRandomValues(new Uint8Array(12));
  const promptPayload = JSON.stringify({
    promptText,
    files: fileManifestForEnvelope,
    clientTimestamp: Date.now(),
  });

  const promptEncoded = new TextEncoder().encode(promptPayload);
  const promptEncryptedWithTag = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: promptIv, tagLength: 128 },
    kInputKey,
    promptEncoded
  );

  const fullPromptBytes = new Uint8Array(promptEncryptedWithTag);
  const promptCiphertext = fullPromptBytes.slice(0, -16);
  const promptAuthTag = fullPromptBytes.slice(-16);

  // Wrap { kInputHex, kReturnHex } using Enclave RSA-OAEP Public Key
  const spkiBuf = pemToArrayBuffer(enclavePublicKeyPem);
  const enclavePubKey = await window.crypto.subtle.importKey(
    "spki",
    spkiBuf,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const keysPayload = JSON.stringify({
    kInputHex: bufToHex(kInputRaw),
    kReturnHex: bufToHex(kReturnRaw),
  });

  const wrappedKeysArrayBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    enclavePubKey,
    new TextEncoder().encode(keysPayload)
  );

  const wrappedKeysBase64 = bufToBase64(new Uint8Array(wrappedKeysArrayBuffer));
  const buyerFingerprint = `0x${bufToHex(kReturnRaw).slice(0, 16)}`;

  return {
    kReturnCryptoKey,
    kInputHexPreview: bufToHex(kInputRaw),
    kReturnHexPreview: bufToHex(kReturnRaw),
    encryptedFiles,
    encryptedEnvelope: {
      wrappedKeysBase64,
      promptIvHex: bufToHex(promptIv),
      promptAuthTagHex: bufToHex(promptAuthTag),
      encryptedPromptBase64: bufToBase64(promptCiphertext),
      files: fileManifestForEnvelope,
      ephemeralBuyerFingerprint: buyerFingerprint,
    },
  };
}

// 3. BUYER BROWSER: Decrypt Sealed AI Output using ephemeral K_return
export async function decryptSealedAiOutputInBrowser(
  sealedOutput: {
    outIvHex: string;
    outAuthTagHex: string;
    encryptedOutputBase64: string;
  },
  kReturnCryptoKey: CryptoKey
): Promise<string> {
  const iv = hexToBuf(sealedOutput.outIvHex);
  const ciphertextBytes = base64ToBuf(sealedOutput.encryptedOutputBase64);
  const tagBytes = hexToBuf(sealedOutput.outAuthTagHex);

  // Concatenate ciphertext + tag for Web Crypto subtle.decrypt
  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
    kReturnCryptoKey,
    combined as unknown as BufferSource
  );

  const decryptedText = new TextDecoder().decode(decryptedBuffer);

  try {
    const parsed = JSON.parse(decryptedText);
    return parsed.text || decryptedText;
  } catch {
    return decryptedText;
  }
}
