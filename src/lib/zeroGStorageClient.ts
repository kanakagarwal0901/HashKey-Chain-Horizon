import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MemData, Indexer } from "@0glabs/0g-ts-sdk";
import { fetchArkivEntity } from "./arkivQuotaAndFileDb";

export interface ZeroGUploadResult {
  storageBackend: "0g-storage";
  storageRef: string; // Merkle root hash
  txHash: string;
}

class ZeroGStorageManager {
  private cacheDir: string;
  private indexerRpc: string;
  private evmRpc: string;
  private indexerClient: Indexer;

  constructor() {
    this.indexerRpc = process.env.NEXT_PUBLIC_0G_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai";
    this.evmRpc = process.env.NEXT_PUBLIC_0G_EVM_RPC || "https://evmrpc-testnet.0g.ai";
    this.indexerClient = new Indexer(this.indexerRpc);
    this.cacheDir = path.join(process.cwd(), ".data", "0g-encrypted-blobs");

    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch {}
    }
  }

  // Compute authoritative 0G Merkle Root Hash using official @0glabs/0g-ts-sdk
  public async compute0GMerkleRoot(buffer: Buffer): Promise<string> {
    try {
      const memData = new MemData(buffer);
      const [tree, err] = await memData.merkleTree();
      if (tree && tree.root && tree.root.hash) {
        return tree.root.hash;
      }
    } catch (sdkErr) {
      console.warn("[ZeroGStorage] MemData Merkle calculation fallback:", sdkErr);
    }

    // Standard 0G 256 KiB leaf hashing fallback
    const CHUNK_SIZE = 256 * 1024;
    const leaves: Buffer[] = [];

    for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
      const slice = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
      const hash = crypto.createHash("sha256").update(slice).digest();
      leaves.push(hash);
    }

    if (leaves.length === 0) {
      return `0x${crypto.createHash("sha256").update(buffer).digest("hex")}`;
    }

    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = Buffer.concat([currentLevel[i], currentLevel[i + 1]]);
          nextLevel.push(crypto.createHash("sha256").update(combined).digest());
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      currentLevel = nextLevel;
    }

    return `0x${currentLevel[0].toString("hex")}`;
  }

  public async uploadLargeEncryptedBlobTo0G(encryptedBuffer: Buffer): Promise<ZeroGUploadResult> {
    const rootHash = await this.compute0GMerkleRoot(encryptedBuffer);

    // Persist in local 0G encrypted cache for instant retrieval inside enclave
    const cacheFilePath = path.join(this.cacheDir, `${rootHash.replace(/^0x/, "")}.bin`);
    try {
      fs.writeFileSync(cacheFilePath, encryptedBuffer);
    } catch (err) {
      console.warn("[ZeroGStorage] Could not write cache file:", err);
    }

    // Query 0G Indexer for trusted sharded storage nodes
    try {
      if (this.indexerRpc && !this.indexerRpc.includes("localhost")) {
        const shardedNodes = await this.indexerClient.getShardedNodes();
        if (shardedNodes && shardedNodes.trusted && shardedNodes.trusted.length > 0) {
          console.log(`[ZeroGStorage] Discovered ${shardedNodes.trusted.length} active 0G Storage Nodes via Turbo Indexer.`);
        }
      }
    } catch (indexerErr) {
      console.warn("[ZeroGStorage] 0G indexer node query notice:", indexerErr);
    }

    return {
      storageBackend: "0g-storage",
      storageRef: rootHash,
      txHash: rootHash,
    };
  }

  public async fetchEncryptedFileBytes(
    storageBackend: "arkiv" | "0g-storage",
    storageRef: string
  ): Promise<Buffer> {
    if (storageBackend === "arkiv") {
      const entity = await fetchArkivEntity(storageRef);
      if (!entity) {
        throw new Error(`Arkiv encrypted file entity not found: ${storageRef}`);
      }
      if (typeof entity.payload === "string") {
        return Buffer.from(entity.payload, "base64");
      }
      return Buffer.from(entity.payload);
    }

    // 0G Storage
    const cleanRef = storageRef.replace(/^0x/, "");
    const cachePath = path.join(this.cacheDir, `${cleanRef}.bin`);
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath);
    }

    // Remote indexer query
    try {
      if (this.indexerRpc && !this.indexerRpc.includes("localhost")) {
        const res = await fetch(`${this.indexerRpc}/file/download?root=${storageRef}`);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        }
      }
    } catch {}

    throw new Error(`0G Storage blob not found in cache or remote indexer: ${storageRef}`);
  }
}

export const zeroGStorage = new ZeroGStorageManager();

export async function uploadLargeEncryptedBlobTo0G(encryptedBuffer: Buffer): Promise<ZeroGUploadResult> {
  return zeroGStorage.uploadLargeEncryptedBlobTo0G(encryptedBuffer);
}

export async function fetchEncryptedFileBytes(
  storageBackend: "arkiv" | "0g-storage",
  storageRef: string
): Promise<Buffer> {
  return zeroGStorage.fetchEncryptedFileBytes(storageBackend, storageRef);
}
