import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface BlindBuyerEnvelope {
  wrappedKeysBase64: string;
  promptIvHex: string;
  promptAuthTagHex: string;
  encryptedPromptBase64: string;
  files?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    ivHex: string;
    authTagHex: string;
    ciphertextBase64?: string;
    storageTarget?: string;
    storageRefId?: string;
  }[];
  ephemeralBuyerFingerprint?: string;
}

export interface EnclaveAttestationReport {
  enclavePublicKeyPem: string;
  signingPublicKeyPem: string;
  measurementHash: string;
  bootedAtIso: string;
  teeProvider: "0G-Sealed-Compute-TEE-v1";
}

export interface SealedAiOutput {
  outIvHex: string;
  outAuthTagHex: string;
  encryptedOutputBase64: string;
  enclaveSignatureHex: string;
  measurementHash: string;
  usageMetadata?: any;
}

class EnclaveVaultSingleton {
  private static instance: EnclaveVaultSingleton;
  private rsaPublicKeyPem: string = "";
  private rsaPrivateKeyPem: string = "";
  private signingPublicKeyPem: string = "";
  private signingPrivateKeyPem: string = "";
  private measurementHash: string = "";
  private bootedAtIso: string = "";

  private constructor() {
    this.bootEnclave();
  }

  public static getInstance(): EnclaveVaultSingleton {
    if (!EnclaveVaultSingleton.instance) {
      EnclaveVaultSingleton.instance = new EnclaveVaultSingleton();
    }
    return EnclaveVaultSingleton.instance;
  }

  private bootEnclave(): void {
    this.bootedAtIso = new Date().toISOString();

    // Check for cached RSA keypair on disk
    const keyPath = path.join(process.cwd(), ".enclave_keypair.json");
    if (fs.existsSync(keyPath)) {
      try {
        const fileContent = fs.readFileSync(keyPath, "utf8");
        const json = JSON.parse(fileContent);
        if (json.publicKey && json.privateKey) {
          this.rsaPublicKeyPem = json.publicKey;
          this.rsaPrivateKeyPem = json.privateKey;
        }
      } catch (err) {
        console.warn("[EnclaveVault] Could not parse .enclave_keypair.json, generating new pair.");
      }
    }

    if (!this.rsaPublicKeyPem || !this.rsaPrivateKeyPem) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      this.rsaPublicKeyPem = publicKey;
      this.rsaPrivateKeyPem = privateKey;
      try {
        fs.writeFileSync(keyPath, JSON.stringify({ publicKey, privateKey }, null, 2));
      } catch {
        // Disk write fallback
      }
    }

    // ECDSA P-256 Attestation Signing Keypair
    const { publicKey: signPub, privateKey: signPriv } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    this.signingPublicKeyPem = signPub;
    this.signingPrivateKeyPem = signPriv;

    // Measurement Hash (PCR0 equivalent)
    this.measurementHash = crypto
      .createHash("sha256")
      .update(this.rsaPublicKeyPem + this.signingPublicKeyPem + "0G_GALILEO_TEE_SHUNYAGRID_v1")
      .digest("hex");
  }

  public getAttestationReport(): EnclaveAttestationReport {
    return {
      enclavePublicKeyPem: this.rsaPublicKeyPem,
      signingPublicKeyPem: this.signingPublicKeyPem,
      measurementHash: this.measurementHash,
      bootedAtIso: this.bootedAtIso,
      teeProvider: "0G-Sealed-Compute-TEE-v1",
    };
  }

  public unwrapSellerApiKey(sealedApiKeyBase64: string): string {
    if (!sealedApiKeyBase64 || typeof sealedApiKeyBase64 !== "string") {
      throw new Error("Missing or invalid sealed API key payload");
    }

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
      } catch {}
      return raw;
    }

    const trimmed = sealedApiKeyBase64.trim();
    if (
      trimmed.startsWith("sk-") ||
      trimmed.startsWith("gsk_") ||
      trimmed.startsWith("AIza") ||
      trimmed.startsWith("xai-")
    ) {
      return trimmed;
    }

    try {
      const buffer = Buffer.from(trimmed, "base64");
      const decrypted = crypto.privateDecrypt(
        {
          key: this.rsaPrivateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        buffer
      );
      return decrypted.toString("utf8");
    } catch (err: any) {
      // In local development or direct unsealed scenarios, check if base64 decodes directly as plaintext
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
      } catch {}
      throw new Error(`Enclave RSA-OAEP unwrap failure: ${err.message}`);
    }
  }

  public unwrapBuyerEnvelope(envelope: BlindBuyerEnvelope): {
    kInputBuffer: Buffer;
    kReturnBuffer: Buffer;
    promptText: string;
  } {
    // 1. Unwrap wrappedKeys using SK_enclave
    let kInputHex = "";
    let kReturnHex = "";

    try {
      const wrappedBuf = Buffer.from(envelope.wrappedKeysBase64, "base64");
      const unwrappedRaw = crypto.privateDecrypt(
        {
          key: this.rsaPrivateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        wrappedBuf
      );
      const parsed = JSON.parse(unwrappedRaw.toString("utf8"));
      kInputHex = parsed.kInputHex;
      kReturnHex = parsed.kReturnHex;
    } catch (err: any) {
      // Direct JSON base64 fallback for testing
      try {
        const fallback = Buffer.from(envelope.wrappedKeysBase64, "base64").toString("utf8");
        const parsed = JSON.parse(fallback);
        kInputHex = parsed.kInputHex;
        kReturnHex = parsed.kReturnHex;
      } catch {
        throw new Error(`Failed to unwrap buyer keys in Enclave: ${err.message}`);
      }
    }

    const kInputBuffer = Buffer.from(kInputHex, "hex");
    const kReturnBuffer = Buffer.from(kReturnHex, "hex");

    // 2. Decrypt prompt text with kInputBuffer via AES-256-GCM
    const iv = Buffer.from(envelope.promptIvHex, "hex");
    const authTag = Buffer.from(envelope.promptAuthTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", kInputBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.encryptedPromptBase64, "base64")),
      decipher.final(),
    ]);

    let promptText = "";
    try {
      const parsedJson = JSON.parse(decrypted.toString("utf8"));
      promptText = parsedJson.promptText || decrypted.toString("utf8");
    } catch {
      promptText = decrypted.toString("utf8");
    }

    return { kInputBuffer, kReturnBuffer, promptText };
  }

  public sealAiOutputForBuyer(
    rawAiText: string,
    usageMetadata: any,
    kReturnBuffer: Buffer,
    context?: {
      modelId?: string;
      totalUsedTokens?: number;
      encryptedPromptBase64?: string;
    }
  ): SealedAiOutput {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", kReturnBuffer, iv);

    const payload = JSON.stringify({
      text: rawAiText,
      usage: usageMetadata,
      timestamp: Date.now(),
    });

    const encryptedOutput = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedOutputBase64 = encryptedOutput.toString("base64");

    // Sign execution proof with Enclave ECDSA key
    const signHash = crypto
      .createHash("sha256")
      .update(
        (context?.encryptedPromptBase64 || "") +
          encryptedOutputBase64 +
          (context?.modelId || "") +
          (context?.totalUsedTokens || 0)
      )
      .digest();

    const sign = crypto.createSign("SHA256");
    sign.update(signHash);
    sign.end();
    const enclaveSignatureHex = sign.sign(this.signingPrivateKeyPem, "hex");

    return {
      outIvHex: iv.toString("hex"),
      outAuthTagHex: authTag.toString("hex"),
      encryptedOutputBase64,
      enclaveSignatureHex,
      measurementHash: this.measurementHash,
      usageMetadata,
    };
  }
}

export const enclaveVault = EnclaveVaultSingleton.getInstance();

export function getEnclaveAttestationReport(): EnclaveAttestationReport {
  return enclaveVault.getAttestationReport();
}

export function unwrapSellerApiKeyInEnclave(sealedApiKeyBase64: string): string {
  return enclaveVault.unwrapSellerApiKey(sealedApiKeyBase64);
}

export function unwrapBuyerEnvelopeInEnclave(envelope: BlindBuyerEnvelope): {
  kInputBuffer: Buffer;
  kReturnBuffer: Buffer;
  promptText: string;
} {
  return enclaveVault.unwrapBuyerEnvelope(envelope);
}

export function sealAiOutputForBuyer(
  rawAiText: string,
  usageMetadata: any,
  kReturnBuffer: Buffer,
  context?: {
    modelId?: string;
    totalUsedTokens?: number;
    encryptedPromptBase64?: string;
  }
): SealedAiOutput {
  return enclaveVault.sealAiOutputForBuyer(rawAiText, usageMetadata, kReturnBuffer, context);
}
