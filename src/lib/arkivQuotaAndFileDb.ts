import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createPrivateClient, ArkivClient, ArkivEntity } from "@arkiv/sdk";

export interface CreateSellerPoolInput {
  sellerWallet: string;
  ensName: string;
  hederaAccountId: string;
  provider: string;
  modelId: string;
  availableTokens: number;
  pricePer1kMicroUsdc: number;
  sealedApiKeyBase64: string;
  worldIdNullifierHash: string;
  ttlBlocks?: bigint;
}

export interface EncryptedFileMetadata {
  filenameHash: string;
  ivHex: string;
  authTagHex: string;
  mimeType?: string;
  filename?: string;
}

class ArkivQuotaAndFileDbManager {
  private client: ArkivClient;
  private mirrorPath: string;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_ARKIV_RPC_URL || "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
    const privateKey = process.env.ARKIV_SERVER_PRIVATE_KEY;
    this.client = createPrivateClient({ rpcUrl, privateKey });
    this.mirrorPath = path.join(process.cwd(), ".data", "arkiv-entities-mirror.json");

    // Ensure mirror directory exists
    const dir = path.dirname(this.mirrorPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }

  private readMirror(): Record<string, any> {
    try {
      if (fs.existsSync(this.mirrorPath)) {
        return JSON.parse(fs.readFileSync(this.mirrorPath, "utf8"));
      }
    } catch {}
    return {};
  }

  private writeMirror(key: string, data: any) {
    try {
      const mirror = this.readMirror();
      mirror[key] = data;
      fs.writeFileSync(this.mirrorPath, JSON.stringify(mirror, null, 2));
    } catch {}
  }

  public async createSellerTokenPoolEntity(input: CreateSellerPoolInput): Promise<{
    entityKey: string;
    expirationBlock: bigint;
    txHash: string;
  }> {
    const timing = await this.client.getBlockTiming();
    const ttl = input.ttlBlocks ?? 300n; // ~1 hour
    const expirationBlock = timing.currentBlock + ttl;

    const payload = JSON.stringify({
      sealedApiKeyBase64: input.sealedApiKeyBase64,
      worldIdNullifierHash: input.worldIdNullifierHash,
      sellerWallet: input.sellerWallet,
      createdAtIso: new Date().toISOString(),
    });

    const attributes = {
      app: "shunyagrid",
      entityType: "seller_token_pool",
      modelId: input.modelId,
      provider: input.provider,
      availableTokens: input.availableTokens,
      pricePer1kMicroUsdc: input.pricePer1kMicroUsdc,
      ensName: input.ensName,
      hederaAccountId: input.hederaAccountId,
      humanVerified: true,
      ownerWallet: input.sellerWallet,
    };

    const { entity, txHash } = await this.client.createEntity({
      payload,
      contentType: "application/json",
      attributes,
      expirationBlock,
    });

    this.writeMirror(entity.key, {
      ...entity,
      expirationBlock: expirationBlock.toString(),
      createdAtBlock: timing.currentBlock.toString(),
    });

    return {
      entityKey: entity.key,
      expirationBlock,
      txHash,
    };
  }

  public async queryEligibleSellerPools(
    modelId: string,
    requiredTMax: number
  ): Promise<ArkivEntity[]> {
    const normalizedModel = modelId.toLowerCase();
    
    // First query via Arkiv client
    const entities = await this.client.queryEntities({
      app: "shunyagrid",
      entityType: "seller_token_pool",
    });

    const filtered = entities.filter((e) => {
      const attr = e.attributes;
      const modelMatch =
        attr.modelId === normalizedModel ||
        attr.modelId === modelId ||
        (normalizedModel.includes("claude") && attr.modelId?.includes("claude")) ||
        (normalizedModel.includes("o3") && attr.modelId?.includes("o3")) ||
        (normalizedModel.includes("gemini") && attr.modelId?.includes("gemini")) ||
        (normalizedModel.includes("deepseek") && attr.modelId?.includes("deepseek")) ||
        (normalizedModel.includes("llama") && attr.modelId?.includes("llama"));
      return modelMatch && (attr.availableTokens ?? 0) >= requiredTMax;
    });

    return filtered;
  }

  public async fetchEntity(entityKey: string): Promise<ArkivEntity | null> {
    const entity = await this.client.fetchEntity(entityKey);
    if (entity) return entity;

    // Check mirror fallback
    const mirror = this.readMirror();
    const mirrored = mirror[entityKey];
    if (mirrored) {
      return {
        ...mirrored,
        expirationBlock: BigInt(mirrored.expirationBlock || "0"),
        createdAtBlock: BigInt(mirrored.createdAtBlock || "0"),
      };
    }

    return null;
  }

  public async deductUsedTokensFromSellerEntity(
    entityKey: string,
    actualTokensUsed: number
  ): Promise<{ success: boolean; remainingTokens: number; txHash: string }> {
    const entity = await this.fetchEntity(entityKey);
    if (!entity) {
      throw new Error(`Seller pool entity not found on Arkiv: ${entityKey}`);
    }

    const previousAvailable = entity.attributes.availableTokens ?? 0;
    const newAvailable = Math.max(0, previousAvailable - actualTokensUsed);

    const { success, txHash } = await this.client.patchEntity(entityKey, {
      attributes: { availableTokens: newAvailable },
    });

    this.writeMirror(entityKey, {
      ...entity,
      attributes: { ...entity.attributes, availableTokens: newAvailable },
      expirationBlock: entity.expirationBlock.toString(),
      createdAtBlock: entity.createdAtBlock.toString(),
    });

    return {
      success,
      remainingTokens: newAvailable,
      txHash,
    };
  }

  public async storeSmallEncryptedFileOnArkiv(
    encryptedBytes: Uint8Array,
    metadata: EncryptedFileMetadata
  ): Promise<{
    storageBackend: "arkiv";
    storageRef: string;
    expirationBlock: bigint;
    txHash: string;
  }> {
    if (encryptedBytes.byteLength > 120 * 1024) {
      throw new Error(`File size (${encryptedBytes.byteLength} bytes) exceeds Arkiv 120 KiB ceiling.`);
    }

    const timing = await this.client.getBlockTiming();
    const expirationBlock = timing.currentBlock + 50n; // ~10 minutes

    const { entity, txHash } = await this.client.createEntity({
      payload: encryptedBytes,
      contentType: "application/octet-stream",
      attributes: {
        app: "shunyagrid",
        entityType: "blind_file_chunk",
        byteLength: encryptedBytes.byteLength,
        filenameHash: metadata.filenameHash,
        ivHex: metadata.ivHex,
        authTagHex: metadata.authTagHex,
      },
      expirationBlock,
    });

    this.writeMirror(entity.key, {
      ...entity,
      payload: Buffer.from(encryptedBytes).toString("base64"),
      expirationBlock: expirationBlock.toString(),
      createdAtBlock: timing.currentBlock.toString(),
    });

    return {
      storageBackend: "arkiv",
      storageRef: entity.key,
      expirationBlock,
      txHash,
    };
  }
}

export const arkivManager = new ArkivQuotaAndFileDbManager();

export async function createSellerTokenPoolEntity(input: CreateSellerPoolInput) {
  return arkivManager.createSellerTokenPoolEntity(input);
}

export async function queryEligibleSellerPools(modelId: string, requiredTMax: number) {
  return arkivManager.queryEligibleSellerPools(modelId, requiredTMax);
}

export async function fetchArkivEntity(entityKey: string) {
  return arkivManager.fetchEntity(entityKey);
}

export async function deductUsedTokensFromSellerEntity(entityKey: string, actualTokensUsed: number) {
  return arkivManager.deductUsedTokensFromSellerEntity(entityKey, actualTokensUsed);
}

export async function storeSmallEncryptedFileOnArkiv(
  encryptedBytes: Uint8Array,
  metadata: EncryptedFileMetadata
) {
  return arkivManager.storeSmallEncryptedFileOnArkiv(encryptedBytes, metadata);
}
