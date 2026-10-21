export type ThinkingLevel = "none" | "low" | "medium" | "high";

export interface ModelTokenBounds {
  modelId: string;
  displayName: string;
  provider: "openai" | "anthropic" | "gemini" | "groq";
  thinkingLevel: ThinkingLevel;
  minRequiredTokens: number;     // T_min
  maxInputAndFileTokens: number; // T_input_cap
  thinkingBudgetTokens: number;  // T_thinking_budget
  maxOutputTokens: number;       // T_output_cap
  totalMaxTokens: number;        // T_max = T_input_cap + T_thinking_budget + T_output_cap
  defaultPricePer1kMicroUsdc: number; // default $0.01 per 1k = 10,000 microUSDC
}

export const MODEL_TOKEN_CATALOG: Record<string, ModelTokenBounds> = {
  "gpt-4o-mini:none": {
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "openai",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 4000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 2000,
    totalMaxTokens: 6000,
    defaultPricePer1kMicroUsdc: 2000, // $0.002
  },
  "gpt-4o:none": {
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    defaultPricePer1kMicroUsdc: 10000, // $0.010
  },
  "o3-mini:low": {
    modelId: "o3-mini",
    displayName: "o3-mini (Low Thinking)",
    provider: "openai",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2000,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    defaultPricePer1kMicroUsdc: 8000,
  },
  "o3-mini:medium": {
    modelId: "o3-mini",
    displayName: "o3-mini (Medium Thinking)",
    provider: "openai",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8000,
    maxOutputTokens: 6000,
    totalMaxTokens: 22000,
    defaultPricePer1kMicroUsdc: 10000,
  },
  "o3-mini:high": {
    modelId: "o3-mini",
    displayName: "o3-mini (High Thinking)",
    provider: "openai",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
    defaultPricePer1kMicroUsdc: 12000,
  },
  "claude-3-7-sonnet:low": {
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (Low Thinking)",
    provider: "anthropic",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
    defaultPricePer1kMicroUsdc: 12000,
  },
  "claude-3-7-sonnet:medium": {
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (Medium Thinking)",
    provider: "anthropic",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 10000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 24192,
    defaultPricePer1kMicroUsdc: 15000,
  },
  "claude-3-7-sonnet:high": {
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (High Thinking)",
    provider: "anthropic",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 40384,
    defaultPricePer1kMicroUsdc: 20000,
  },
};

// Unique models list
export const SUPPORTED_MODELS = [
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet (Anthropic)", provider: "anthropic", supportsThinking: true },
  { id: "o3-mini", name: "o3-mini Reasoning (OpenAI)", provider: "openai", supportsThinking: true },
  { id: "gpt-4o", name: "GPT-4o Omnimodal (OpenAI)", provider: "openai", supportsThinking: false },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (OpenAI)", provider: "openai", supportsThinking: false },
] as const;

export function getModelTokenBounds(modelId: string, thinkingLevel: ThinkingLevel): ModelTokenBounds {
  const key = `${modelId}:${thinkingLevel}`;
  const bounds = MODEL_TOKEN_CATALOG[key];
  if (!bounds) {
    // Fallback if thinking level is incompatible (e.g. gpt-4o requested with thinking)
    const fallbackKey = `${modelId}:none`;
    if (MODEL_TOKEN_CATALOG[fallbackKey]) {
      return MODEL_TOKEN_CATALOG[fallbackKey];
    }
    // Default fallback
    return MODEL_TOKEN_CATALOG["claude-3-7-sonnet:medium"];
  }
  return bounds;
}

// 1. Verify Seller has enough tokens to prevent mid-generation cutoff
export function canSellerFulfillPrompt(
  sellerAvailableTokens: number,
  modelId: string,
  thinkingLevel: ThinkingLevel
): { eligible: boolean; bounds: ModelTokenBounds; reason?: string; alternativeSuggestion?: string } {
  const bounds = getModelTokenBounds(modelId, thinkingLevel);
  if (sellerAvailableTokens < bounds.totalMaxTokens) {
    // Check if a lower thinking level would work
    let suggestion: string | undefined;
    if (thinkingLevel === "high") {
      const medBounds = getModelTokenBounds(modelId, "medium");
      if (sellerAvailableTokens >= medBounds.totalMaxTokens) {
        suggestion = `Consider switching to Thinking Level = medium (requires ${medBounds.totalMaxTokens} tokens).`;
      }
    } else if (thinkingLevel === "medium") {
      const lowBounds = getModelTokenBounds(modelId, "low");
      if (sellerAvailableTokens >= lowBounds.totalMaxTokens) {
        suggestion = `Consider switching to Thinking Level = low (requires ${lowBounds.totalMaxTokens} tokens).`;
      }
    }

    return {
      eligible: false,
      bounds,
      reason: `Seller has ${sellerAvailableTokens.toLocaleString()} tokens, but ${modelId} (${thinkingLevel}) requires at least T_max = ${bounds.totalMaxTokens.toLocaleString()} tokens to guarantee zero mid-generation cutoff.`,
      alternativeSuggestion: suggestion,
    };
  }
  return { eligible: true, bounds };
}

// 2. Calculate Upfront Buyer Charge (governed by T_max)
export function calculateUpfrontBuyerChargeMicroUsdc(
  bounds: ModelTokenBounds,
  sellerPricePer1kTokensMicroUsdc: number
): number {
  return Math.ceil((bounds.totalMaxTokens / 1000) * sellerPricePer1kTokensMicroUsdc);
}

// 3. Calculate Seller Payout (governed by T_used) & Web App Commission (governed by T_max - T_used)
export function calculatePostExecutionSplitMicroUsdc(
  bounds: ModelTokenBounds,
  actualTokensUsed: number,
  sellerPricePer1kTokensMicroUsdc: number
): {
  tMaxTokens: number;
  actualTokensUsed: number;
  cappedUsedTokens: number;
  buyerChargedMicroUsdc: number;
  buyerChargedUsdc: number;
  sellerPayoutMicroUsdc: number;
  sellerPayoutUsdc: number;
  webAppCommissionMicroUsdc: number;
  webAppCommissionUsdc: number;
  unusedTokensReturnedToSellerQuota: number;
} {
  const cappedUsedTokens = Math.min(Math.max(actualTokensUsed, bounds.minRequiredTokens), bounds.totalMaxTokens);
  const buyerChargedMicroUsdc = calculateUpfrontBuyerChargeMicroUsdc(bounds, sellerPricePer1kTokensMicroUsdc);
  const sellerPayoutMicroUsdc = Math.floor((cappedUsedTokens / 1000) * sellerPricePer1kTokensMicroUsdc);
  const webAppCommissionMicroUsdc = Math.max(0, buyerChargedMicroUsdc - sellerPayoutMicroUsdc);
  const unusedTokensReturnedToSellerQuota = bounds.totalMaxTokens - cappedUsedTokens;

  return {
    tMaxTokens: bounds.totalMaxTokens,
    actualTokensUsed,
    cappedUsedTokens,
    buyerChargedMicroUsdc,
    buyerChargedUsdc: buyerChargedMicroUsdc / 1_000_000,
    sellerPayoutMicroUsdc,
    sellerPayoutUsdc: sellerPayoutMicroUsdc / 1_000_000,
    webAppCommissionMicroUsdc,
    webAppCommissionUsdc: webAppCommissionMicroUsdc / 1_000_000,
    unusedTokensReturnedToSellerQuota,
  };
}
