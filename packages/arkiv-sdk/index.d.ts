export interface ArkivEntityAttributes {
    app?: string;
    entityType?: string;
    modelId?: string;
    provider?: string;
    availableTokens?: number;
    pricePer1kMicroUsdc?: number;
    ensName?: string;
    hederaAccountId?: string;
    humanVerified?: boolean;
    byteLength?: number;
    [key: string]: any;
}
export interface ArkivEntity {
    key: string;
    owner: string;
    payload: Uint8Array | string;
    contentType: string;
    attributes: ArkivEntityAttributes;
    expirationBlock: bigint;
    createdAtBlock: bigint;
    txHash: string;
}
export interface ArkivBlockTiming {
    currentBlock: bigint;
    blockTimeSeconds: number;
    timestamp: number;
}
export interface ArkivClientConfig {
    rpcUrl: string;
    privateKey?: string;
}
export declare class ArkivClient {
    private rpcUrl;
    private privateKey?;
    private static localEntities;
    private static lastKnownBlock;
    constructor(config: ArkivClientConfig);
    getBlockTiming(): Promise<ArkivBlockTiming>;
    createEntity(params: {
        payload: Uint8Array | string;
        contentType: string;
        attributes: ArkivEntityAttributes;
        expirationBlock: bigint;
    }): Promise<{
        entity: ArkivEntity;
        txHash: string;
    }>;
    patchEntity(key: string, patch: {
        attributes: Partial<ArkivEntityAttributes>;
    }): Promise<{
        success: boolean;
        txHash: string;
    }>;
    fetchEntity(key: string): Promise<ArkivEntity | null>;
    queryEntities(filter: {
        app?: string;
        entityType?: string;
        modelId?: string;
        minTokens?: number;
    }): Promise<ArkivEntity[]>;
}
export declare function createPrivateClient(config: ArkivClientConfig): ArkivClient;
