import { NextResponse } from "next/server";
import { MODEL_TOKEN_CATALOG } from "@/lib/tokenBoundsCatalog";
import { queryEligibleSellerPools } from "@/lib/arkivQuotaAndFileDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalogEntries = Object.values(MODEL_TOKEN_CATALOG);
  
  // Discover pools for each model
  const poolsByModel = await Promise.all(
    catalogEntries.map(async (bounds) => {
      const eligiblePools = await queryEligibleSellerPools(bounds.modelId, bounds.totalMaxTokens);
      return {
        catalogKey: bounds.catalogKey,
        modelId: bounds.modelId,
        displayName: bounds.displayName,
        provider: bounds.provider,
        thinkingLevel: bounds.thinkingLevel,
        tMin: bounds.minRequiredTokens,
        tMax: bounds.totalMaxTokens,
        inputCap: bounds.maxInputAndFileTokens,
        thinkingBudget: bounds.thinkingBudgetTokens,
        outputCap: bounds.maxOutputTokens,
        supportsVision: bounds.supportsVision,
        availablePoolsCount: eligiblePools.length,
        cheapestRatePer1kMicroUsdc: eligiblePools.length > 0
          ? Math.min(...eligiblePools.map(p => p.attributes.pricePer1kMicroUsdc ?? 10000))
          : 10000,
        upfrontBuyerChargeMicroUsdc: Math.ceil(
          (bounds.totalMaxTokens / 1000) *
          (eligiblePools.length > 0
            ? Math.min(...eligiblePools.map(p => p.attributes.pricePer1kMicroUsdc ?? 10000))
            : 10000)
        ),
        activeSellers: eligiblePools.map(p => ({
          entityKey: p.key,
          ensName: p.attributes.ensName || "anonymous.shunyagrid.eth",
          hederaAccountId: p.attributes.hederaAccountId,
          availableTokens: p.attributes.availableTokens,
          pricePer1kMicroUsdc: p.attributes.pricePer1kMicroUsdc,
          humanVerified: p.attributes.humanVerified ?? true,
        })),
      };
    })
  );

  return NextResponse.json({
    schemaVersion: "arc.marketplace.discovery.v1",
    marketplace: {
      name: "ShunyaGrid",
      tagline: "The Blind, Zero-Cutoff AI API Token Exchange",
      arcStudioProjectUrl: process.env.NEXT_PUBLIC_ARC_STUDIO_PROJECT_URL || "https://studio.arc.com/projects/shunyagrid-mumbai",
      arcRpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.io",
      settlementCurrencies: ["USDC", "EURC"],
      settlementChains: ["Hedera Testnet (HTS)", "Arc (Circle CCTP)"],
      privacyGuarantee: "EF-CROPS: Client-Side WebCrypto + 0G TEE Enclave (Zero Plaintext to Sellers)",
      zeroCutoffGuarantee: "Deterministic Pre-Flight T_max Reservation",
    },
    totalSupportedModels: catalogEntries.length,
    pools: poolsByModel,
    discoveredAt: new Date().toISOString(),
  });
}
