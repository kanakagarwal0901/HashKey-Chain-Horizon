import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { MODEL_TOKEN_CATALOG, arkivDb, getModelMetadata } from "@shunya/core";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Gather all active listings from memory + disk mirror to ensure 100% real-time synchronization
  let allListings = arkivDb.getAllListings();

  try {
    const diskPath = path.join(process.cwd(), ".data", "arkiv_listings.json");
    if (fs.existsSync(diskPath)) {
      const diskRaw = fs.readFileSync(diskPath, "utf8");
      const diskList = JSON.parse(diskRaw);
      if (Array.isArray(diskList) && diskList.length > 0) {
        const idMap = new Map();
        for (const l of allListings) idMap.set(l.id, l);
        for (const l of diskList) {
          if (!idMap.has(l.id)) {
            idMap.set(l.id, l);
          }
        }
        allListings = Array.from(idMap.values());
      }
    }
  } catch (err) {
    console.warn("[arc-discovery] Failed to read disk mirror:", err);
  }

  // Deduplicate active listings by ENS domain
  const seenEns = new Set<string>();
  allListings = allListings.filter((l: any) => {
    if (!l.ensName) return true;
    const key = l.ensName.toLowerCase();
    if (seenEns.has(key)) return false;
    seenEns.add(key);
    return true;
  });

  const catalogEntries = Object.entries(MODEL_TOKEN_CATALOG);

  // Discover pools for each model
  const poolsByModel = catalogEntries.map(([catalogKey, bounds]) => {
    const normalizedModel = bounds.modelId.toLowerCase();

    // Find all active listings that can fulfill this model and bounds
    const eligibleListings = allListings.filter((listing: any) => {
      if (listing.status && listing.status !== "active") return false;
      const listingModel = (listing.model || "").toLowerCase();

      const isMatch =
        listingModel === normalizedModel ||
        (normalizedModel.includes("claude-3-7-sonnet") && listingModel.includes("claude-3-7-sonnet")) ||
        (normalizedModel.includes("claude-3-5-sonnet") && listingModel.includes("claude-3-5-sonnet")) ||
        (normalizedModel.includes("gemini-2.0-flash-thinking") && listingModel.includes("gemini-2.0-flash-thinking")) ||
        (normalizedModel === "gemini-2.0-flash" && listingModel === "gemini-2.0-flash") ||
        (normalizedModel.includes("gemini-1.5-pro") && listingModel.includes("gemini-1.5-pro")) ||
        (normalizedModel.includes("deepseek-r1") && listingModel.includes("deepseek-r1"));

      const available = Number(listing.availableTokens) || 0;
      return isMatch && available >= bounds.totalMaxTokens;
    });

    const cheapestRate =
      eligibleListings.length > 0
        ? Math.min(...eligibleListings.map((l: any) => l.pricePer1kMicroUsdc || 10000))
        : bounds.defaultPricePer1kMicroUsdc || 10000;

    const upfrontCharge = Math.ceil((bounds.totalMaxTokens / 1000) * cheapestRate);

    const modelMeta = getModelMetadata(bounds.modelId);
    const supportsVision =
      bounds.provider === "gemini" ||
      bounds.modelId.includes("gpt-4o") ||
      bounds.modelId.includes("claude-3-7") ||
      bounds.modelId.includes("claude-3-5");

    return {
      catalogKey: catalogKey || `${bounds.modelId}:${bounds.thinkingLevel}`,
      modelId: bounds.modelId,
      displayName: bounds.displayName,
      provider: bounds.provider,
      thinkingLevel: bounds.thinkingLevel,
      tMin: bounds.minRequiredTokens,
      tMax: bounds.totalMaxTokens,
      inputCap: bounds.maxInputAndFileTokens,
      thinkingBudget: bounds.thinkingBudgetTokens,
      outputCap: bounds.maxOutputTokens,
      contextWindow: bounds.contextWindow,
      supportsVision,
      availablePoolsCount: eligibleListings.length,
      cheapestRatePer1kMicroUsdc: cheapestRate,
      upfrontBuyerChargeMicroUsdc: upfrontCharge,
      activeSellers: eligibleListings.map((l: any) => ({
        entityKey: l.id,
        ensName: l.ensName || "anonymous.shunyagrid.eth",
        ownerAddress: l.ownerAddress,
        payoutAddress: l.hskPayoutAddress || l.ownerAddress,
        availableTokens: l.availableTokens,
        pricePer1kMicroUsdc: l.pricePer1kMicroUsdc,
        humanVerified: l.humanVerified ?? true,
      })),
    };
  });

  return NextResponse.json({
    schemaVersion: "arc.marketplace.discovery.v1",
    marketplace: {
      name: "ShunyaGrid",
      tagline: "The Blind, Zero-Cutoff AI API Token Exchange",
      arcStudioProjectUrl:
        process.env.NEXT_PUBLIC_ARC_STUDIO_PROJECT_URL || "https://github.com/kanakagarwal0901/HashKey-Chain-Horizon",
      arcRpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.io",
      settlementCurrencies: ["USDC", "EURC"],
      settlementChains: ["HashKey Chain Testnet (HSP)", "Ethereum Sepolia (USDC)"],
      privacyGuarantee: "EF-CROPS: Client-Side WebCrypto + Confidential Hardware TEE Enclave (Zero Plaintext to Sellers)",
      zeroCutoffGuarantee: "Deterministic Pre-Flight T_max Reservation",
    },
    totalSupportedModels: catalogEntries.length,
    pools: poolsByModel,
    discoveredAt: new Date().toISOString(),
  });
}
