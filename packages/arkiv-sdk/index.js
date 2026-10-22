"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArkivClient = void 0;
exports.createPrivateClient = createPrivateClient;
const crypto = require("crypto");
class ArkivClient {
    rpcUrl;
    privateKey;
    static localEntities = new Map();
    static currentSimulatedBlock = 19482300n;
    constructor(config) {
        this.rpcUrl = config.rpcUrl;
        this.privateKey = config.privateKey;
    }
    async getBlockTiming() {
        try {
            if (this.rpcUrl && !this.rpcUrl.includes("localhost")) {
                const res = await fetch(this.rpcUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "arkiv_getBlockTiming", params: [], id: 1 }),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.result?.currentBlock) {
                        return {
                            currentBlock: BigInt(json.result.currentBlock),
                            blockTimeSeconds: json.result.blockTimeSeconds || 12,
                            timestamp: Date.now(),
                        };
                    }
                }
            }
        }
        catch {
            // Fallback to local deterministic block timing
        }
        return {
            currentBlock: ArkivClient.currentSimulatedBlock,
            blockTimeSeconds: 12,
            timestamp: Date.now(),
        };
    }
    async createEntity(params) {
        const key = `0xarkiv_${crypto.randomBytes(16).toString("hex")}`;
        const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
        const blockTiming = await this.getBlockTiming();
        const entity = {
            key,
            owner: this.privateKey ? `0x${crypto.createHash("sha256").update(this.privateKey).digest("hex").slice(0, 40)}` : "0x0000000000000000000000000000000000000000",
            payload: params.payload,
            contentType: params.contentType,
            attributes: { ...params.attributes },
            expirationBlock: params.expirationBlock,
            createdAtBlock: blockTiming.currentBlock,
            txHash,
        };
        ArkivClient.localEntities.set(key, entity);
        // Try remote Arkiv RPC if reachable
        try {
            if (this.rpcUrl && !this.rpcUrl.includes("localhost")) {
                await fetch(this.rpcUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "arkiv_createEntity",
                        params: [{ key, attributes: params.attributes, expirationBlock: params.expirationBlock.toString() }],
                        id: 2,
                    }),
                });
            }
        }
        catch {
            // Remote call ignored if offline
        }
        return { entity, txHash };
    }
    async patchEntity(key, patch) {
        const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
        const existing = ArkivClient.localEntities.get(key);
        if (existing) {
            existing.attributes = { ...existing.attributes, ...patch.attributes };
            ArkivClient.localEntities.set(key, existing);
        }
        try {
            if (this.rpcUrl && !this.rpcUrl.includes("localhost")) {
                await fetch(this.rpcUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "arkiv_patchEntity",
                        params: [key, patch.attributes],
                        id: 3,
                    }),
                });
            }
        }
        catch {
            // Offline fallback
        }
        return { success: true, txHash };
    }
    async fetchEntity(key) {
        const entity = ArkivClient.localEntities.get(key);
        if (!entity)
            return null;
        const blockTiming = await this.getBlockTiming();
        if (blockTiming.currentBlock >= entity.expirationBlock) {
            ArkivClient.localEntities.delete(key);
            return null;
        }
        return entity;
    }
    async queryEntities(filter) {
        const blockTiming = await this.getBlockTiming();
        const results = [];
        for (const [key, entity] of ArkivClient.localEntities.entries()) {
            if (blockTiming.currentBlock >= entity.expirationBlock) {
                ArkivClient.localEntities.delete(key);
                continue;
            }
            const attr = entity.attributes;
            if (filter.app && attr.app !== filter.app)
                continue;
            if (filter.entityType && attr.entityType !== filter.entityType)
                continue;
            if (filter.modelId && attr.modelId !== filter.modelId)
                continue;
            if (filter.minTokens && (attr.availableTokens ?? 0) < filter.minTokens)
                continue;
            results.push(entity);
        }
        // Sort by price ascending
        return results.sort((a, b) => (a.attributes.pricePer1kMicroUsdc ?? 0) - (b.attributes.pricePer1kMicroUsdc ?? 0));
    }
}
exports.ArkivClient = ArkivClient;
function createPrivateClient(config) {
    return new ArkivClient(config);
}
