import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { MODEL_TOKEN_CATALOG, arkivDb, getModelMetadata } from "@shunya/core";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await arkivDb.syncWithRemote();
  } catch (syncErr) {
    console.warn("[arc-discovery] Cloud orderbook sync notice:", syncErr);
  }
  // 1. Gather all active listings from synchronized memory + persistence cache
  let allListings = arkivDb.getAllListings();

  // Ensure unique active listings by entity ID
  const seenIds = new Set<string>();
  allListings = allListings.filter((l: any) => {
    if (!l.id) return true;
    if (seenIds.has(l.id)) return false;
    seenIds.add(l.id);
    return true;
  });

  const catalogEntries = Object.entries(MODEL_TOKEN_CATALOG);

  const seedIds = new Set([
    "arkiv_entity_gemini_2_flash_thinking",
    "arkiv_entity_gemini_2_pro",
    "arkiv_entity_gemini_15_pro",
    "arkiv_entity_claude_37_sonnet",
    "arkiv_entity_claude_opus_4",
    "arkiv_entity_o3_mini",
    "arkiv_entity_o3_flagship",
    "arkiv_entity_gpt_45",
    "arkiv_entity_groq_deepseek_r1",
    "arkiv_entity_deepseek_r1_full",
    "arkiv_entity_deepseek_v3",
    "arkiv_entity_llama_33_70b",
    "arkiv_entity_llama_31_405b",
    "arkiv_entity_grok_3",
    "arkiv_entity_grok_2",
  ]);

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
        (normalizedModel.includes("claude-opus-4") && listingModel.includes("claude-opus-4")) ||
        (normalizedModel.includes("gemini-2.0-flash-thinking") && listingModel.includes("gemini-2.0-flash-thinking")) ||
        (normalizedModel === "gemini-2.0-flash" && listingModel === "gemini-2.0-flash") ||
        (normalizedModel.includes("gemini-2.0-pro") && listingModel.includes("gemini-2.0-pro")) ||
        (normalizedModel.includes("gemini-1.5-pro") && listingModel.includes("gemini-1.5-pro")) ||
        (normalizedModel === "o3" && listingModel === "o3") ||
        (normalizedModel.includes("o3-mini") && listingModel.includes("o3-mini")) ||
        (normalizedModel.includes("gpt-4.5") && listingModel.includes("gpt-4.5")) ||
        (normalizedModel.includes("deepseek-r1-distill") && listingModel.includes("deepseek-r1-distill")) ||
        (normalizedModel === "deepseek-r1" && listingModel === "deepseek-r1") ||
        (normalizedModel.includes("deepseek-v3") && listingModel.includes("deepseek-v3")) ||
        (normalizedModel.includes("llama-3.1-405b") && listingModel.includes("llama-3.1-405b")) ||
        (normalizedModel.includes("grok-3") && listingModel.includes("grok-3")) ||
        (normalizedModel.includes("grok-2") && listingModel.includes("grok-2"));

      const available = Number(listing.availableTokens) || 0;
      return isMatch && available >= bounds.totalMaxTokens;
    });

    // Prioritize user-created active listings over seed demo entities
    const sortedEligible = [...eligibleListings].sort((a: any, b: any) => {
      const aIsSeed = seedIds.has(a.id) ? 1 : 0;
      const bIsSeed = seedIds.has(b.id) ? 1 : 0;
      if (aIsSeed !== bIsSeed) return aIsSeed - bIsSeed;
      return (a.pricePer1kMicroUsdc || 10000) - (b.pricePer1kMicroUsdc || 10000);
    });

    const cheapestRate =
      sortedEligible.length > 0
        ? Math.min(...sortedEligible.map((l: any) => l.pricePer1kMicroUsdc || 10000))
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
      availablePoolsCount: sortedEligible.length,
      cheapestRatePer1kMicroUsdc: cheapestRate,
      upfrontBuyerChargeMicroUsdc: upfrontCharge,
      activeSellers: sortedEligible.map((l: any) => ({
        entityKey: l.id,
        ensName: l.ensName || "anonymous.shunyagrid.eth",
        ownerAddress: l.ownerAddress,
        payoutAddress: l.payoutAddress || l.hskPayoutAddress || l.ownerAddress,
        availableTokens: l.availableTokens,
        pricePer1kMicroUsdc: l.pricePer1kMicroUsdc,
        humanVerified: l.humanVerified ?? true,
      })),
    };
  });

  return NextResponse.json(
    {
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
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
