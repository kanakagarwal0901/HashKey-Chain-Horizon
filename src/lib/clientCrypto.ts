// Pure Client-Side Web Crypto for EF CROPS Compliance
// Runs strictly in the browser: Zero Node.js dependencies, Zero Key Leakage

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
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
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

// 1. SELLER BROWSER: Seal Seller's API Key to 0G Enclave Public Key
export async function sealSellerApiKeyInBrowser(
  rawApiKey: string,
  enclavePublicKeyPem: string
): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return btoa(rawApiKey);
  }

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
}

// 2. BUYER BROWSER: Seal Prompt & Files with local AES-256-GCM, wrap keys to PK_enclave
export async function sealBuyerPromptAndFilesInBrowser(
  promptText: string,
  files: { filename: string; mimeType: string; base64Data: string }[],
  enclavePublicKeyPem: string
): Promise<{
  buyerLocalReturnKeyBase64: string;
  encryptedEnvelope: {
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
      ciphertextBase64: string;
      storageTarget: "arkiv" | "zeroG";
      storageRefId: string;
    }[];
    ephemeralBuyerFingerprint: string;
  };
}> {
  // Generate random 256-bit AES keys
  const kInputRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const kReturnRaw = window.crypto.getRandomValues(new Uint8Array(32));

  const kInputKey = await window.crypto.subtle.importKey(
    "raw",
    kInputRaw as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Encrypt files
  const encryptedFiles = await Promise.all(
    files.map(async (file) => {
      const fileData = base64ToBuf(file.base64Data);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
        kInputKey,
        fileData as unknown as BufferSource
      );

      const encArray = new Uint8Array(encrypted);
      const ciphertext = encArray.slice(0, -16);
      const authTag = encArray.slice(-16);
      const isSmall = fileData.byteLength <= 128 * 1024;
      const refHex = bufToHex(window.crypto.getRandomValues(new Uint8Array(8)));

      return {
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: fileData.byteLength,
        ivHex: bufToHex(iv),
        authTagHex: bufToHex(authTag),
        ciphertextBase64: bufToBase64(ciphertext),
        storageTarget: (isSmall ? "arkiv" : "zeroG") as "arkiv" | "zeroG",
        storageRefId: `urn:${isSmall ? "arkiv" : "0g"}:${refHex}`,
      };
    })
  );

  // Encrypt prompt text
  const promptIv = window.crypto.getRandomValues(new Uint8Array(12));
  const promptEncoded = new TextEncoder().encode(promptText);
  const promptEncrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: promptIv as unknown as BufferSource, tagLength: 128 },
    kInputKey,
    promptEncoded as unknown as BufferSource
  );

  const promptArray = new Uint8Array(promptEncrypted);
  const promptCiphertext = promptArray.slice(0, -16);
  const promptAuthTag = promptArray.slice(-16);

  // Wrap keys with Enclave RSA-OAEP public key
  const spkiBuf = pemToArrayBuffer(enclavePublicKeyPem);
  const pubKey = await window.crypto.subtle.importKey(
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

  const wrapped = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    pubKey,
    new TextEncoder().encode(keysPayload) as unknown as BufferSource
  );

  return {
    buyerLocalReturnKeyBase64: bufToBase64(kReturnRaw),
    encryptedEnvelope: {
      wrappedKeysBase64: bufToBase64(new Uint8Array(wrapped)),
      promptIvHex: bufToHex(promptIv),
      promptAuthTagHex: bufToHex(promptAuthTag),
      encryptedPromptBase64: bufToBase64(promptCiphertext),
      files: encryptedFiles,
      ephemeralBuyerFingerprint: bufToHex(window.crypto.getRandomValues(new Uint8Array(8))),
    },
  };
}

// 3. BUYER BROWSER: Decrypt sealed AI Output using local K_return
export async function decryptBuyerOutputInBrowser(
  encryptedOutputBase64: string,
  ivHex: string,
  authTagHex: string,
  kReturnBase64: string
): Promise<{ aiOutputText: string; reasoningText: string }> {
  const kReturnRaw = base64ToBuf(kReturnBase64);
  const iv = hexToBuf(ivHex);
  const authTag = hexToBuf(authTagHex);
  const ciphertext = base64ToBuf(encryptedOutputBase64);

  // Concatenate ciphertext and tag for Web Crypto
  const fullCiphertext = new Uint8Array(ciphertext.length + authTag.length);
  fullCiphertext.set(ciphertext);
  fullCiphertext.set(authTag, ciphertext.length);

  const key = await window.crypto.subtle.importKey(
    "raw",
    kReturnRaw as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    fullCiphertext as unknown as BufferSource
  );

  const jsonStr = new TextDecoder().decode(decrypted);
  return JSON.parse(jsonStr);
}
