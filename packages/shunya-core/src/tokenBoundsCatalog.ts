export type ThinkingLevel = "none" | "low" | "medium" | "high";
export type SupportedProvider = "openai" | "anthropic" | "gemini" | "groq" | "xai";

export interface ModelTokenBounds {
  modelId: string;
  displayName: string;
  provider: SupportedProvider;
  thinkingLevel: ThinkingLevel;
  minRequiredTokens: number;     // T_min
  maxInputAndFileTokens: number; // T_input_cap
  thinkingBudgetTokens: number;  // T_thinking_budget
  maxOutputTokens: number;       // T_output_cap
  totalMaxTokens: number;        // T_max = T_input_cap + T_thinking_budget + T_output_cap
  defaultPricePer1kMicroUsdc: number; // default microUSDC per 1k tokens
  contextWindow: number;         // Total context window in tokens
  maxCompletionTokens: number;   // Official provider maximum generation tokens
}

export interface ModelMetadata {
  id: string;
  name: string;
  provider: SupportedProvider;
  supportsThinking: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  description: string;
}

// Complete Provider-Specific Model Catalog with Authentic Token Specifications
export const MODEL_TOKEN_CATALOG: Record<string, ModelTokenBounds> = {
  // ==========================================
  // ANTHROPIC (Claude Family)
  // ==========================================
  "claude-3-7-sonnet:none": {
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet (Standard)",
    provider: "anthropic",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 16192,
    defaultPricePer1kMicroUsdc: 10000,
    contextWindow: 200000,
    maxCompletionTokens: 64000,
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
    contextWindow: 200000,
    maxCompletionTokens: 64000,
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
    contextWindow: 200000,
    maxCompletionTokens: 64000,
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
    contextWindow: 200000,
    maxCompletionTokens: 64000,
  },
  "claude-3-5-sonnet:none": {
    modelId: "claude-3-5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 16192,
    defaultPricePer1kMicroUsdc: 8000,
    contextWindow: 200000,
    maxCompletionTokens: 8192,
  },
  "claude-3-5-haiku:none": {
    modelId: "claude-3-5-haiku",
    displayName: "Claude 3.5 Haiku",
    provider: "anthropic",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 4000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4096,
    totalMaxTokens: 8096,
    defaultPricePer1kMicroUsdc: 3000,
    contextWindow: 200000,
    maxCompletionTokens: 8192,
  },
  "claude-opus-4:none": {
    modelId: "claude-opus-4",
    displayName: "Claude Opus 4 (Standard)",
    provider: "anthropic",
    thinkingLevel: "none",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 20192,
    defaultPricePer1kMicroUsdc: 25000,
    contextWindow: 200000,
    maxCompletionTokens: 32768,
  },
  "claude-opus-4:low": {
    modelId: "claude-opus-4",
    displayName: "Claude Opus 4 (Low Thinking)",
    provider: "anthropic",
    thinkingLevel: "low",
    minRequiredTokens: 3000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 4000,
    maxOutputTokens: 6000,
    totalMaxTokens: 22000,
    defaultPricePer1kMicroUsdc: 30000,
    contextWindow: 200000,
    maxCompletionTokens: 32768,
  },
  "claude-opus-4:medium": {
    modelId: "claude-opus-4",
    displayName: "Claude Opus 4 (Medium Thinking)",
    provider: "anthropic",
    thinkingLevel: "medium",
    minRequiredTokens: 6000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 12000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
    defaultPricePer1kMicroUsdc: 35000,
    contextWindow: 200000,
    maxCompletionTokens: 32768,
  },
  "claude-opus-4:high": {
    modelId: "claude-opus-4",
    displayName: "Claude Opus 4 (High Thinking)",
    provider: "anthropic",
    thinkingLevel: "high",
    minRequiredTokens: 12000,
    maxInputAndFileTokens: 20000,
    thinkingBudgetTokens: 24000,
    maxOutputTokens: 12000,
    totalMaxTokens: 56000,
    defaultPricePer1kMicroUsdc: 45000,
    contextWindow: 200000,
    maxCompletionTokens: 32768,
  },

  // ==========================================
  // OPENAI (o3-mini, o1, GPT-4o)
  // ==========================================
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
    contextWindow: 200000,
    maxCompletionTokens: 100000,
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
    contextWindow: 200000,
    maxCompletionTokens: 100000,
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
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "o1:low": {
    modelId: "o1",
    displayName: "o1 Reasoning (Low Thinking)",
    provider: "openai",
    thinkingLevel: "low",
    minRequiredTokens: 3000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 4000,
    maxOutputTokens: 6000,
    totalMaxTokens: 18000,
    defaultPricePer1kMicroUsdc: 15000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "o1:medium": {
    modelId: "o1",
    displayName: "o1 Reasoning (Medium Thinking)",
    provider: "openai",
    thinkingLevel: "medium",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
    defaultPricePer1kMicroUsdc: 25000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "o1:high": {
    modelId: "o1",
    displayName: "o1 Reasoning (High Thinking)",
    provider: "openai",
    thinkingLevel: "high",
    minRequiredTokens: 16000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 32000,
    maxOutputTokens: 16000,
    totalMaxTokens: 64000,
    defaultPricePer1kMicroUsdc: 40000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "gpt-4o:none": {
    modelId: "gpt-4o",
    displayName: "GPT-4o Omnimodal",
    provider: "openai",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    defaultPricePer1kMicroUsdc: 10000,
    contextWindow: 128000,
    maxCompletionTokens: 16384,
  },
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
    defaultPricePer1kMicroUsdc: 2000,
    contextWindow: 128000,
    maxCompletionTokens: 16384,
  },
  "o3:low": {
    modelId: "o3",
    displayName: "o3 Reasoning Flagship (Low)",
    provider: "openai",
    thinkingLevel: "low",
    minRequiredTokens: 3000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 4000,
    maxOutputTokens: 6000,
    totalMaxTokens: 18000,
    defaultPricePer1kMicroUsdc: 20000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "o3:medium": {
    modelId: "o3",
    displayName: "o3 Reasoning Flagship (Medium)",
    provider: "openai",
    thinkingLevel: "medium",
    minRequiredTokens: 6000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
    defaultPricePer1kMicroUsdc: 30000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "o3:high": {
    modelId: "o3",
    displayName: "o3 Reasoning Flagship (High)",
    provider: "openai",
    thinkingLevel: "high",
    minRequiredTokens: 12000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 32000,
    maxOutputTokens: 16000,
    totalMaxTokens: 64000,
    defaultPricePer1kMicroUsdc: 45000,
    contextWindow: 200000,
    maxCompletionTokens: 100000,
  },
  "gpt-4.5:none": {
    modelId: "gpt-4.5",
    displayName: "GPT-4.5 Knowledge Flagship",
    provider: "openai",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 20192,
    defaultPricePer1kMicroUsdc: 25000,
    contextWindow: 128000,
    maxCompletionTokens: 16384,
  },

  // ==========================================
  // GOOGLE GEMINI (2.0 Flash Thinking, 2.0 Flash, 1.5 Pro)
  // ==========================================
  "gemini-2.0-flash-thinking:low": {
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Gemini 2.0 Flash Thinking (Low)",
    provider: "gemini",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
    defaultPricePer1kMicroUsdc: 6000,
    contextWindow: 1048576,
    maxCompletionTokens: 65536,
  },
  "gemini-2.0-flash-thinking:medium": {
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Gemini 2.0 Flash Thinking (Medium)",
    provider: "gemini",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 26192,
    defaultPricePer1kMicroUsdc: 8000,
    contextWindow: 1048576,
    maxCompletionTokens: 65536,
  },
  "gemini-2.0-flash-thinking:high": {
    modelId: "gemini-2.0-flash-thinking",
    displayName: "Gemini 2.0 Flash Thinking (High)",
    provider: "gemini",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 24576,
    maxOutputTokens: 8000,
    totalMaxTokens: 48576,
    defaultPricePer1kMicroUsdc: 12000,
    contextWindow: 1048576,
    maxCompletionTokens: 65536,
  },
  "gemini-2.0-flash:none": {
    modelId: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    provider: "gemini",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
    defaultPricePer1kMicroUsdc: 4000,
    contextWindow: 1048576,
    maxCompletionTokens: 8192,
  },
    "gemini-2.0-pro:none": {
    modelId: "gemini-2.0-pro",
    displayName: "Gemini 2.0 Pro Experimental",
    provider: "gemini",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 24192,
    defaultPricePer1kMicroUsdc: 10000,
    contextWindow: 2097152,
    maxCompletionTokens: 8192,
  },
  "gemini-1.5-pro:none": {
    modelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro (2M Context)",
    provider: "gemini",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 24192,
    defaultPricePer1kMicroUsdc: 10000,
    contextWindow: 2097152,
    maxCompletionTokens: 8192,
  },

  // ==========================================
  // GROQ LPU (DeepSeek R1 Distill, Llama 3.3 70B)
  // ==========================================
  "deepseek-r1-distill-llama-70b:low": {
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (Low)",
    provider: "groq",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 12048,
    defaultPricePer1kMicroUsdc: 5000,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
  },
  "deepseek-r1-distill-llama-70b:medium": {
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (Medium)",
    provider: "groq",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 22192,
    defaultPricePer1kMicroUsdc: 7000,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
  },
  "deepseek-r1-distill-llama-70b:high": {
    modelId: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 (70B) on Groq (High)",
    provider: "groq",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 36384,
    defaultPricePer1kMicroUsdc: 9000,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
  },
  "llama-3.3-70b-versatile:none": {
    modelId: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B Versatile (Groq)",
    provider: "groq",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4096,
    totalMaxTokens: 12096,
    defaultPricePer1kMicroUsdc: 4000,
    contextWindow: 131072,
    maxCompletionTokens: 32768,
  },
  "llama-3.1-405b-reasoning:none": {
    modelId: "llama-3.1-405b-reasoning",
    displayName: "Llama 3.1 405B Reasoning (Groq)",
    provider: "groq",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 8192,
    totalMaxTokens: 20192,
    defaultPricePer1kMicroUsdc: 15000,
    contextWindow: 131072,
    maxCompletionTokens: 16384,
  },
  "deepseek-r1:low": {
    modelId: "deepseek-r1",
    displayName: "DeepSeek R1 (671B Full MoE - Low)",
    provider: "groq",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 12048,
    defaultPricePer1kMicroUsdc: 4000,
    contextWindow: 128000,
    maxCompletionTokens: 32768,
  },
  "deepseek-r1:medium": {
    modelId: "deepseek-r1",
    displayName: "DeepSeek R1 (671B Full MoE - Medium)",
    provider: "groq",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 22192,
    defaultPricePer1kMicroUsdc: 6000,
    contextWindow: 128000,
    maxCompletionTokens: 32768,
  },
  "deepseek-r1:high": {
    modelId: "deepseek-r1",
    displayName: "DeepSeek R1 (671B Full MoE - High)",
    provider: "groq",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 36384,
    defaultPricePer1kMicroUsdc: 8000,
    contextWindow: 128000,
    maxCompletionTokens: 32768,
  },
  "deepseek-v3:none": {
    modelId: "deepseek-v3",
    displayName: "DeepSeek V3 (671B MoE Standard)",
    provider: "groq",
    thinkingLevel: "none",
    minRequiredTokens: 500,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4096,
    totalMaxTokens: 12096,
    defaultPricePer1kMicroUsdc: 2500,
    contextWindow: 128000,
    maxCompletionTokens: 8192,
  },

  // ==========================================
  // xAI (Grok 3 / Grok 2)
  // ==========================================
  "grok-3:low": {
    modelId: "grok-3",
    displayName: "Grok 3 (Big Brain - Low)",
    provider: "xai",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 4000,
    maxOutputTokens: 4000,
    totalMaxTokens: 16000,
    defaultPricePer1kMicroUsdc: 15000,
    contextWindow: 1000000,
    maxCompletionTokens: 32768,
  },
  "grok-3:medium": {
    modelId: "grok-3",
    displayName: "Grok 3 (Big Brain - Medium)",
    provider: "xai",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 12000,
    maxOutputTokens: 8000,
    totalMaxTokens: 32000,
    defaultPricePer1kMicroUsdc: 20000,
    contextWindow: 1000000,
    maxCompletionTokens: 32768,
  },
  "grok-3:high": {
    modelId: "grok-3",
    displayName: "Grok 3 (Big Brain - High)",
    provider: "xai",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 24000,
    maxOutputTokens: 12000,
    totalMaxTokens: 52000,
    defaultPricePer1kMicroUsdc: 30000,
    contextWindow: 1000000,
    maxCompletionTokens: 32768,
  },
  "grok-2:none": {
    modelId: "grok-2",
    displayName: "Grok 2 Vision / Chat",
    provider: "xai",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4096,
    totalMaxTokens: 12096,
    defaultPricePer1kMicroUsdc: 8000,
    contextWindow: 128000,
    maxCompletionTokens: 8192,
  },
};

// Rich Structured List of All Supported Models with Verified Provider Metadata
export const SUPPORTED_MODELS: ModelMetadata[] = [
  // Anthropic
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet (Anthropic)",
    provider: "anthropic",
    supportsThinking: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    description: "Hybrid reasoning flagship with extended thinking up to 64k tokens.",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet (Anthropic)",
    provider: "anthropic",
    supportsThinking: false,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    description: "Frontier reasoning and coding standard with 8,192 max output tokens.",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku (Anthropic)",
    provider: "anthropic",
    supportsThinking: false,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    description: "Ultra-fast lightweight Anthropic model with 200k context.",
  },
  {
    id: "claude-opus-4",
    name: "Claude Opus 4 (Anthropic)",
    provider: "anthropic",
    supportsThinking: true,
    contextWindow: 200000,
    maxOutputTokens: 32768,
    description: "Pinnacle reasoning and autonomous agent architecture with extended cognitive depth.",
  },

  // OpenAI
  {
    id: "o3-mini",
    name: "o3-mini Reasoning (OpenAI)",
    provider: "openai",
    supportsThinking: true,
    contextWindow: 200000,
    maxOutputTokens: 100000,
    description: "Frontier reasoning model with low, medium, and high reasoning efforts.",
  },
  {
    id: "o3",
    name: "o3 Reasoning Flagship (OpenAI)",
    provider: "openai",
    supportsThinking: true,
    contextWindow: 200000,
    maxOutputTokens: 100000,
    description: "OpenAI's highest benchmark test-time reasoning model for science, math, and code.",
  },
  {
    id: "o1",
    name: "o1 Deep Reasoning (OpenAI)",
    provider: "openai",
    supportsThinking: true,
    contextWindow: 200000,
    maxOutputTokens: 100000,
    description: "OpenAI's multi-step problem solving model (100k generation cap).",
  },
  {
    id: "gpt-4.5",
    name: "GPT-4.5 Knowledge Flagship (OpenAI)",
    provider: "openai",
    supportsThinking: false,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    description: "Vast parameter pre-trained flagship with supreme world knowledge and creative nuance.",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o Omnimodal (OpenAI)",
    provider: "openai",
    supportsThinking: false,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    description: "Omnimodal flagship model for text, images, and files with 16k output tokens.",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (OpenAI)",
    provider: "openai",
    supportsThinking: false,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    description: "Affordable, fast intelligence for low-latency tasks.",
  },

  // Google Gemini
  {
    id: "gemini-2.0-flash-thinking",
    name: "Gemini 2.0 Flash Thinking (Google)",
    provider: "gemini",
    supportsThinking: true,
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    description: "1M context window reasoning model with 65k maximum output tokens.",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash (Google)",
    provider: "gemini",
    supportsThinking: false,
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    description: "Next-gen fast multimodal with 1 million token context.",
  },
  {
    id: "gemini-2.0-pro",
    name: "Gemini 2.0 Pro Experimental (Google)",
    provider: "gemini",
    supportsThinking: false,
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    description: "Premier late-2026 reasoning and coding model with 2M token context window.",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro (Google)",
    provider: "gemini",
    supportsThinking: false,
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    description: "Industry-leading 2M token context window for massive file and codebase analysis.",
  },

  // Groq & Open Weights
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 (70B) (Groq LPU)",
    provider: "groq",
    supportsThinking: true,
    contextWindow: 131072,
    maxOutputTokens: 32768,
    description: "Ultra-fast open weights reasoning model with native thinking scratchpad on Groq.",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile (Groq LPU)",
    provider: "groq",
    supportsThinking: false,
    contextWindow: 131072,
    maxOutputTokens: 32768,
    description: "Meta's flagship open-weights model accelerated on Groq LPU hardware.",
  },
  {
    id: "llama-3.1-405b-reasoning",
    name: "Llama 3.1 405B Reasoning (Groq LPU)",
    provider: "groq",
    supportsThinking: false,
    contextWindow: 131072,
    maxOutputTokens: 16384,
    description: "Meta's largest open-weights 405B titan model with near-frontier analytical capability.",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1 (671B Full MoE)",
    provider: "groq",
    supportsThinking: true,
    contextWindow: 128000,
    maxOutputTokens: 32768,
    description: "Full-scale 671B reasoning model with uncensored, transparent chain-of-thought tokens.",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3 (671B MoE)",
    provider: "groq",
    supportsThinking: false,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    description: "Hyper-efficient 671B MoE flagship with unmatched economics and coding performance.",
  },

  // xAI (Grok)
  {
    id: "grok-3",
    name: "Grok 3 (xAI Big Brain)",
    provider: "xai",
    supportsThinking: true,
    contextWindow: 1000000,
    maxOutputTokens: 32768,
    description: "xAI's flagship 1M context reasoning model with Big Brain mode and real-time knowledge synthesis.",
  },
  {
    id: "grok-2",
    name: "Grok 2 Vision (xAI)",
    provider: "xai",
    supportsThinking: false,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    description: "State-of-the-art vision and chat model with high visual comprehension and real-time retrieval.",
  },
];

// Provider Definitions
export const PROVIDERS = [
  { id: "anthropic", name: "Anthropic (Claude)", keyPrefix: "sk-ant-", keyPlaceholder: "sk-ant-api03-..." },
  { id: "openai", name: "OpenAI (o3 / o1 / GPT-4.5 / GPT-4o)", keyPrefix: "sk-", keyPlaceholder: "sk-proj-... or sk-..." },
  { id: "gemini", name: "Google Gemini", keyPrefix: "AIza / AQ.", keyPlaceholder: "AQ.Ab8... or AIzaSy..." },
  { id: "groq", name: "Groq High-Speed LPU", keyPrefix: "gsk_", keyPlaceholder: "gsk_..." },
  { id: "xai", name: "xAI (Grok 3 / Grok 2)", keyPrefix: "xai-", keyPlaceholder: "xai-..." },
] as const;

// Helper: Filter models strictly by AI provider
export function getModelsByProvider(provider: string): ModelMetadata[] {
  return SUPPORTED_MODELS.filter((m) => m.provider.toLowerCase() === provider.toLowerCase());
}

// Helper: Get Model Metadata by ID
export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  return SUPPORTED_MODELS.find((m) => m.id === modelId);
}

// Helper: Get supported thinking levels for a given model
export function getSupportedThinkingLevels(modelId: string): ThinkingLevel[] {
  const meta = getModelMetadata(modelId);
  if (!meta || !meta.supportsThinking) {
    return ["none"];
  }
  return ["low", "medium", "high"];
}

// Helper: Get minimum quota required to list a model (T_max of its lowest tier)
export function getMinimumListingQuotaForModel(modelId: string): number {
  const meta = getModelMetadata(modelId);
  if (!meta) return 6000;
  if (!meta.supportsThinking) {
    const b = getModelTokenBounds(modelId, "none");
    return b ? b.totalMaxTokens : 6000;
  }
  const lowB = getModelTokenBounds(modelId, "low");
  return lowB ? lowB.totalMaxTokens : 12000;
}

// Helper: Get bounds for a model and thinking level
export function getModelTokenBounds(modelId: string, thinkingLevel: ThinkingLevel): ModelTokenBounds {
  const key = `${modelId}:${thinkingLevel}`;
  const bounds = MODEL_TOKEN_CATALOG[key];
  if (!bounds) {
    // If thinking level is not supported, try "none"
    const fallbackKey = `${modelId}:none`;
    if (MODEL_TOKEN_CATALOG[fallbackKey]) {
      return MODEL_TOKEN_CATALOG[fallbackKey];
    }
    // If "none" requested on reasoning model, try "low" or "medium"
    const mediumKey = `${modelId}:medium`;
    if (MODEL_TOKEN_CATALOG[mediumKey]) {
      return MODEL_TOKEN_CATALOG[mediumKey];
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
    let suggestion: string | undefined;
    if (thinkingLevel === "high") {
      const medBounds = getModelTokenBounds(modelId, "medium");
      if (sellerAvailableTokens >= medBounds.totalMaxTokens) {
        suggestion = `Consider switching to Thinking Level = medium (requires ${medBounds.totalMaxTokens.toLocaleString()} tokens).`;
      }
    } else if (thinkingLevel === "medium") {
      const lowBounds = getModelTokenBounds(modelId, "low");
      if (sellerAvailableTokens >= lowBounds.totalMaxTokens) {
        suggestion = `Consider switching to Thinking Level = low (requires ${lowBounds.totalMaxTokens.toLocaleString()} tokens).`;
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
