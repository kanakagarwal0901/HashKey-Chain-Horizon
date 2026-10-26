export type ThinkingLevel = "none" | "low" | "medium" | "high";
export type SupportedProvider = "openai" | "anthropic" | "gemini" | "groq";

export interface ModelTokenBounds {
  catalogKey: string;
  modelId: string;
  displayName: string;
  provider: SupportedProvider;
  upstreamBaseUrl: string;
  thinkingLevel: ThinkingLevel;
  minRequiredTokens: number;     // T_min
  maxInputAndFileTokens: number; // T_input_cap
  thinkingBudgetTokens: number;  // T_thinking_budget
  maxOutputTokens: number;       // T_output_cap
  totalMaxTokens: number;        // T_max = T_input_cap + T_thinking_budget + T_output_cap
  supportsVision: boolean;
  defaultPricePer1kMicroUsdc?: number;
}

export const MODEL_TOKEN_CATALOG: Record<string, ModelTokenBounds> = {
  "gpt-4o-mini:none": {
    catalogKey: "gpt-4o-mini:none",
    modelId: "gpt-4o-mini",
    displayName: "OpenAI GPT-4o Mini",
    provider: "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 4000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 2000,
    totalMaxTokens: 6000,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 2000, // $0.002
  },
  "gpt-4o:none": {
    catalogKey: "gpt-4o:none",
    modelId: "gpt-4o",
    displayName: "OpenAI GPT-4o",
    provider: "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 8000, // $0.008
  },
  "o3-mini:low": {
    catalogKey: "o3-mini:low",
    modelId: "o3-mini",
    displayName: "OpenAI o3-mini (Low Reasoning)",
    provider: "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2000,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 10000, // $0.010
  },
  "o3-mini:medium": {
    catalogKey: "o3-mini:medium",
    modelId: "o3-mini",
    displayName: "OpenAI o3-mini (Medium Reasoning)",
    provider: "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8000,
    maxOutputTokens: 6000,
    totalMaxTokens: 22000,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 10000, // $0.010
  },
  "o3-mini:high": {
    catalogKey: "o3-mini:high",
    modelId: "o3-mini",
    displayName: "OpenAI o3-mini (High Reasoning)",
    provider: "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 10000, // $0.010
  },
  "claude-3-7-sonnet-20250219:low": {
    catalogKey: "claude-3-7-sonnet-20250219:low",
    modelId: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (Low Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000, // $0.012
  },
  "claude-3-7-sonnet-20250219:medium": {
    catalogKey: "claude-3-7-sonnet-20250219:medium",
    modelId: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (Medium Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 10000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 24192,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000, // $0.012
  },
  "claude-3-7-sonnet-20250219:high": {
    catalogKey: "claude-3-7-sonnet-20250219:high",
    modelId: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (High Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 40384,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000, // $0.012
  },
  // Alias for backward compatibility with 'claude-3-7-sonnet'
  "claude-3-7-sonnet:low": {
    catalogKey: "claude-3-7-sonnet:low",
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (Low Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000,
  },
  "claude-3-7-sonnet:medium": {
    catalogKey: "claude-3-7-sonnet:medium",
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (Medium Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 10000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 24192,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000,
  },
  "claude-3-7-sonnet:high": {
    catalogKey: "claude-3-7-sonnet:high",
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (High Thinking)",
    provider: "anthropic",
    upstreamBaseUrl: "https://api.anthropic.com/v1",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 40384,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000,
  },
  "llama-3.3-70b-versatile:none": {
    catalogKey: "llama-3.3-70b-versatile:none",
    modelId: "llama-3.3-70b-versatile",
    displayName: "Meta LLaMA 3.3 70B Versatile (Groq LPU)",
    provider: "groq",
    upstreamBaseUrl: "https://api.groq.com/openai/v1",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 2000,
    totalMaxTokens: 8000,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 2500, // $0.0025
  },
  "gemini-2.0-flash:none": {
    catalogKey: "gemini-2.0-flash:none",
    modelId: "gemini-2.0-flash",
    displayName: "Google Gemini 2.0 Flash",
    provider: "gemini",
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 4000, // $0.004
  },
  "gemini-2.0-flash-thinking:low": {
    catalogKey: "gemini-2.0-flash-thinking:low",
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Google Gemini 2.0 Flash Thinking (Low)",
    provider: "gemini",
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 6000, // $0.006
  },
  "gemini-2.0-flash-thinking:medium": {
    catalogKey: "gemini-2.0-flash-thinking:medium",
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Google Gemini 2.0 Flash Thinking (Medium)",
    provider: "gemini",
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 26192,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 8000, // $0.008
  },
  "gemini-2.0-flash-thinking:high": {
    catalogKey: "gemini-2.0-flash-thinking:high",
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Google Gemini 2.0 Flash Thinking (High)",
    provider: "gemini",
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 24576,
    maxOutputTokens: 8000,
    totalMaxTokens: 48576,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 12000, // $0.012
  },
  "gemini-1.5-pro:none": {
    catalogKey: "gemini-1.5-pro:none",
    modelId: "gemini-1.5-pro",
    displayName: "Google Gemini 1.5 Pro (2M Context)",
    provider: "gemini",
    upstreamBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 24192,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 10000, // $0.010
  },
  "deepseek-r1-distill-llama-70b:low": {
    catalogKey: "deepseek-r1-distill-llama-70b:low",
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (Low)",
    provider: "groq",
    upstreamBaseUrl: "https://api.groq.com/openai/v1",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 12048,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 5000,
  },
  "deepseek-r1-distill-llama-70b:medium": {
    catalogKey: "deepseek-r1-distill-llama-70b:medium",
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (Medium)",
    provider: "groq",
    upstreamBaseUrl: "https://api.groq.com/openai/v1",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 22192,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 7000,
  },
  "deepseek-r1-distill-llama-70b:high": {
    catalogKey: "deepseek-r1-distill-llama-70b:high",
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (High)",
    provider: "groq",
    upstreamBaseUrl: "https://api.groq.com/openai/v1",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 36384,
    supportsVision: false,
    defaultPricePer1kMicroUsdc: 9000,
  },
};

export function getModelTokenBounds(modelId: string, thinkingLevel: ThinkingLevel = "none"): ModelTokenBounds {
  const normalizedModel = modelId.toLowerCase();
  const key = `${normalizedModel}:${thinkingLevel}`;
  if (MODEL_TOKEN_CATALOG[key]) {
    return MODEL_TOKEN_CATALOG[key];
  }

  // Fallback match by base model name
  const candidate = Object.values(MODEL_TOKEN_CATALOG).find(
    (b) => (b.modelId === normalizedModel || normalizedModel.includes(b.modelId)) && b.thinkingLevel === thinkingLevel
  );
  if (candidate) return candidate;

  // Generic fallback if unknown
  return {
    catalogKey: key,
    modelId,
    displayName: modelId,
    provider: normalizedModel.includes("claude") ? "anthropic" : normalizedModel.includes("llama") ? "groq" : "openai",
    upstreamBaseUrl: "https://api.openai.com/v1",
    thinkingLevel,
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: thinkingLevel === "high" ? 16000 : thinkingLevel === "medium" ? 8000 : thinkingLevel === "low" ? 2000 : 0,
    maxOutputTokens: 4000,
    totalMaxTokens: thinkingLevel === "high" ? 28000 : thinkingLevel === "medium" ? 20000 : thinkingLevel === "low" ? 14000 : 12000,
    supportsVision: true,
    defaultPricePer1kMicroUsdc: 10000,
  };
}

export function evaluateSellerEligibility(
  availableTokens: number,
  modelId: string,
  thinkingLevel: ThinkingLevel
): {
  eligible: boolean;
  bounds: ModelTokenBounds;
  reason?: string;
  alternativeLevels: { thinkingLevel: ThinkingLevel; bounds: ModelTokenBounds }[];
} {
  const bounds = getModelTokenBounds(modelId, thinkingLevel);
  const eligible = availableTokens >= bounds.totalMaxTokens;

  // Find all levels for this model
  const levels: ThinkingLevel[] = ["none", "low", "medium", "high"];
  const alternativeLevels: { thinkingLevel: ThinkingLevel; bounds: ModelTokenBounds }[] = [];

  for (const lvl of levels) {
    if (lvl === thinkingLevel) continue;
    try {
      const altBounds = getModelTokenBounds(modelId, lvl);
      if (altBounds && availableTokens >= altBounds.totalMaxTokens) {
        alternativeLevels.push({ thinkingLevel: lvl, bounds: altBounds });
      }
    } catch {
      // Skip unsupported combinations
    }
  }

  if (!eligible) {
    return {
      eligible: false,
      bounds,
      reason: `Seller has ${availableTokens.toLocaleString()} tokens, but ${modelId} (${thinkingLevel} thinking) requires at least T_max = ${bounds.totalMaxTokens.toLocaleString()} tokens to guarantee zero mid-generation cutoff.`,
      alternativeLevels,
    };
  }

  return { eligible: true, bounds, alternativeLevels };
}

export function computeFinancialBreakdown(
  bounds: ModelTokenBounds,
  pricePer1kTokensMicroUsdc: number,
  actualTokensUsed?: number
): {
  upfrontBuyerChargeMicroUsdc: number;
  sellerPayoutMicroUsdc: number;
  webAppCommissionMicroUsdc: number;
  tokensToReleaseBackToSellerQuota: number;
} {
  const upfrontBuyerChargeMicroUsdc = Math.ceil((bounds.totalMaxTokens / 1000) * pricePer1kTokensMicroUsdc);

  if (actualTokensUsed === undefined) {
    return {
      upfrontBuyerChargeMicroUsdc,
      sellerPayoutMicroUsdc: 0,
      webAppCommissionMicroUsdc: 0,
      tokensToReleaseBackToSellerQuota: bounds.totalMaxTokens,
    };
  }

  const effectiveUsed = Math.min(Math.max(actualTokensUsed, 1), bounds.totalMaxTokens);
  const sellerPayoutMicroUsdc = Math.floor((effectiveUsed / 1000) * pricePer1kTokensMicroUsdc);
  const webAppCommissionMicroUsdc = upfrontBuyerChargeMicroUsdc - sellerPayoutMicroUsdc;
  const tokensToReleaseBackToSellerQuota = bounds.totalMaxTokens - effectiveUsed;

  return {
    upfrontBuyerChargeMicroUsdc,
    sellerPayoutMicroUsdc,
    webAppCommissionMicroUsdc,
    tokensToReleaseBackToSellerQuota,
  };
}
