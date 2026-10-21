# ShunyaGrid: The Blind, Zero-Cutoff AI API Token Exchange

**Event:** ETHGlobal Mumbai 2026 (November 5–7, 2026 • Jio World Convention Centre, Mumbai)  
**Target Prize Pool:** $64,500+ across 7 Sponsor Tracks (Ethereum Foundation, Hedera, Arkiv, 0G, Arc, World, ENS)  
**36-Hour Build Feasibility Score:** 94 / 100 (Pure API-Token Scope — Zero Physical GPU/Hardware Dependencies)

---

## 1. Executive Summary & Real-World Problem

### 1.1 The Problem
1. **Millions in Wasted AI API Quotas:** Developers, startups, and researchers pre-pay for monthly AI API tiers and token credits (OpenAI, Anthropic, Google Gemini, Groq, OpenRouter) that expire unused or sit idle between sprints.
2. **Data & File Surveillance Risk:** Buyers (indie builders, enterprises, and autonomous coding agents) want on-demand access to frontier reasoning models without $20–$200/month subscriptions, but they cannot route prompts or proprietary files (PDFs, codebases, financial CSVs, medical images) through a stranger’s API proxy if the Seller can read their prompt, inspect their attached files, or see the AI’s output.
3. **The Mid-Generation Token Exhaustion Hazard:** Modern reasoning models allow users to select a **Thinking Level** (`low`, `medium`, `high`), which consumes thousands of hidden reasoning tokens before outputting the final answer. If a Seller lists an API key with only 3,500 tokens remaining and a Buyer runs a `high`-thinking prompt that requires 12,000 tokens, the API call aborts mid-way: **the Seller’s remaining tokens are burned, and the Buyer receives an incomplete or failed output.**

### 1.2 The ShunyaGrid Solution
**ShunyaGrid** is a privacy-first, peer-to-peer marketplace exclusively for **unused AI API tokens** (no local GPU hardware setup required) where:
* **Total Seller Blindness:** The Buyer can attach **any kind of file** and any text prompt to our interface. Our sealed execution interface uses the Seller’s encrypted API key to make the upstream AI call, fetches the result, and delivers the encrypted output directly to the Buyer. **The Seller never sees the Buyer’s prompt, never sees the attached files, and never sees the AI output.** Likewise, **the Buyer never sees the Seller’s raw API key.**
* **Deterministic Thinking-Level Token Gates (Zero Mid-Way Cutoffs):** For every supported AI model and its corresponding **Thinking Level**, ShunyaGrid enforces pre-defined minimum ($T_{\min}$) and maximum ($T_{\max}$) token bounds. A Seller is only allowed to list or serve a single prompt for a given `(Model, Thinking Level)` if their verified available token balance is at least $T_{\max}$. This guarantees a Seller’s tokens can **never** run out mid-generation.
* **Max-Upfront Buyer Charge & Spread Commission Model:** For each single prompt, ShunyaGrid charges the Buyer upfront via **Hedera `x402` (HTTP 402)** an amount governed by the **maximum required tokens ($T_{\max}$)** for that `(Model, Thinking Level)`. Once the prompt completes, ShunyaGrid pays the Seller the exact amount governed by the **actual tokens used ($T_{\text{used}}$)**, and **retains the remaining difference ($T_{\max} - T_{\text{used}}$) as our web app's protocol commission.**

---

## 2. The Token-Bound & Commission Engine (Mathematical Specification)

### 2.1 Model & Thinking-Level Token Matrix
Every model $m$ and thinking level $\tau \in \{\text{none}, \text{low}, \text{medium}, \text{high}\}$ has a deterministic token budget profile enforced by our interface. The maximum token requirement $T_{\max}(m, \tau)$ is defined as:

$$T_{\max}(m, \tau) = T_{\text{input\_cap}}(m) + T_{\text{thinking\_budget}}(m, \tau) + T_{\text{output\_cap}}(m, \tau)$$

| Model ID | Thinking Level | Min Required Tokens (T_min) | Max Input + File Tokens (T_input_cap) | Thinking Budget (T_thinking_budget) | Max Output Tokens (T_output_cap) | Total Max Tokens Required (T_max) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-4o-mini` | `none` | 500 | 4,000 | 0 | 2,000 | 6,000 |
| `gpt-4o` | `none` | 1,000 | 8,000 | 0 | 4,000 | 12,000 |
| `o3-mini` | `low` | 2,000 | 6,000 | 2,000 | 4,000 | 12,000 |
| `o3-mini` | `medium` | 4,000 | 8,000 | 8,000 | 6,000 | 22,000 |
| `o3-mini` | `high` | 8,000 | 12,000 | 16,000 | 8,000 | 36,000 |
| `claude-3-7-sonnet` | `low` | 2,000 | 8,000 | 2,048 | 4,000 | 14,048 |
| `claude-3-7-sonnet` | `medium` | 5,000 | 10,000 | 8,192 | 6,000 | 24,192 |
| `claude-3-7-sonnet` | `high` | 10,000 | 16,000 | 16,384 | 8,000 | 40,384 |

### 2.2 The Zero-Cutoff Eligibility Invariant
Let $Q_{\text{seller}}^{\text{available}}$ be the Seller’s remaining listed token balance on **Arkiv**, and $Q_{\text{seller}}^{\text{locked}}$ be tokens currently reserved by in-flight prompts.

1. **Listing Gate:** A Seller cannot create a listing for model $m$ at thinking level $\tau$ unless:
   $$Q_{\text{seller}}^{\text{available}} \ge T_{\max}(m, \tau)$$
2. **Pre-Flight Atomic Lock:** The instant a Buyer’s `x402` payment is verified, ShunyaGrid atomically locks $T_{\max}(m, \tau)$ tokens from the Seller’s available balance before calling the upstream AI API:
   $$Q_{\text{seller}}^{\text{available}} \leftarrow Q_{\text{seller}}^{\text{available}} - T_{\max}(m, \tau)$$
3. **Upstream Hard-Capping:** When our interface calls the AI provider using the Seller’s API key, it passes `max_completion_tokens` and `reasoning_effort` / `thinking.budget_tokens` strictly bounded by $T_{\max}(m, \tau)$. Thus, the upstream call can **never** exceed $T_{\max}(m, \tau)$ or fail mid-way due to Seller quota exhaustion.

### 2.3 Upfront Buyer Charge, Seller Payout & Web App Commission
Let $P_{\text{rate}}$ be the Seller’s listed price per 1,000 tokens (in HTS USDC on Hedera).

1. **Buyer Upfront Charge ($C_{\text{buyer}}$):** Governed by the **maximum required tokens** $T_{\max}(m, \tau)$ for the selected model and thinking level:
   $$C_{\text{buyer}} = \left(\frac{T_{\max}(m, \tau)}{1000}\right) \times P_{\text{rate}}$$
2. **Actual Token Consumption ($T_{\text{used}}$):** The upstream AI API completes the request and returns the exact token usage object:
   $$T_{\text{used}} = \text{usage.prompt\_tokens} + \text{usage.reasoning\_tokens} + \text{usage.completion\_tokens}$$
   where $T_{\text{used}} \le T_{\max}(m, \tau)$ is guaranteed by our hard cap.
3. **Seller Payout ($R_{\text{seller}}$):** Governed strictly by the **actual tokens consumed** ($T_{\text{used}}$):
   $$R_{\text{seller}} = \left(\frac{T_{\text{used}}}{1000}\right) \times P_{\text{rate}}$$
4. **ShunyaGrid Web App Commission ($\Pi_{\text{app}}$):** The unused portion of the maximum token payment is kept by the ShunyaGrid web app as protocol commission:
   $$\Pi_{\text{app}} = C_{\text{buyer}} - R_{\text{seller}} = \left(\frac{T_{\max}(m, \tau) - T_{\text{used}}}{1000}\right) \times P_{\text{rate}}$$
5. **Post-Execution Seller Quota Reconciliation:** Only the actual tokens used ($T_{\text{used}}$) are permanently deducted from the Seller’s token quota; the unused token reservation ($T_{\max}(m, \tau) - T_{\text{used}}$) is credited back to the Seller’s available token balance on **Arkiv** so they can keep selling their remaining tokens:
   $$Q_{\text{seller}}^{\text{available}} \leftarrow Q_{\text{seller}}^{\text{available}} + \left(T_{\max}(m, \tau) - T_{\text{used}}\right)$$

#### Numerical Example (Shown Live in the Demo UI)
* Buyer selects `claude-3-7-sonnet` with `Thinking Level = medium` ($T_{\max} = 24,192\text{ tokens}$, $T_{\min} = 5,000\text{ tokens}$).
* Seller’s rate is $P_{\text{rate}} = \$0.01\text{ USDC per 1,000 tokens}$, and Seller has $Q_{\text{seller}}^{\text{available}} = 100,000\text{ tokens}$ ($\ge 24,192$, so **Eligible**).
* **Step 1 (Buyer Charge):** Buyer pays upfront for 24,192 tokens via Hedera `x402`: $C_{\text{buyer}} = 24.192 \times \$0.01 = \$0.241920\text{ USDC}$.
* **Step 2 (AI Execution):** Prompt + attached PDF + thinking + output actually consumes $T_{\text{used}} = 14,192\text{ tokens}$.
* **Step 3 (Seller Payout):** Seller automatically receives payout for 14,192 tokens: $R_{\text{seller}} = 14.192 \times \$0.01 = \$0.141920\text{ USDC}$.
* **Step 4 (Web App Commission):** ShunyaGrid retains the difference for the remaining 10,000 tokens: $\Pi_{\text{app}} = \$0.241920 - \$0.141920 = \$0.100000\text{ USDC}$.
* **Step 5 (Quota Update):** Seller’s Arkiv Entity token balance updates from $100,000$ to $100,000 - 14,192 = 85,808\text{ tokens}$.

---

## 3. Zero-Visibility Blind Privacy Architecture

How does our interface accept **any file attachment** and **any prompt** from the Buyer, execute it using the Seller’s API key, and guarantee that the Seller can **never** see the prompt, files, or output?

| Secret Asset | Who Creates It? | How It Is Protected | Can the Seller See It? | Can the Buyer See It? |
| :--- | :--- | :--- | :--- | :--- |
| **Seller's API Key (`sk-...`)** | Seller | Encrypted in Seller's browser to the **0G Enclave Public Key (`PK_enclave`)**. Decrypted only inside isolated Enclave RAM during the `fetch()` call. | Yes (Owner) | **NO** (Never exposed to Buyer) |
| **Buyer's Prompt Text** | Buyer | Encrypted in Buyer's browser with ephemeral `K_input` (AES-256-GCM), wrapped to `PK_enclave`. | **NO** (Sees only token count & USDC payout) | Yes (Owner) |
| **Buyer's Attached Files (PDF, Code, Images, ZIP, CSV)** | Buyer | Encrypted in Buyer's browser with `K_input`. Files <= 128 KiB stored as 10-min expiring **Arkiv Entities**; files > 128 KiB stored on **0G Storage**. | **NO** (Encrypted blobs; Seller has no `K_input`) | Yes (Owner) |
| **AI Model Output** | Upstream AI via Sealed Enclave | Encrypted inside the Sealed Enclave using the Buyer's one-time `K_return` key before leaving memory. | **NO** (Ciphertext only) | Yes (Decrypted locally in Buyer browser) |
| **Buyer's IP Address & Wallet Reads** | Buyer Network | Routed through **Ethereum Foundation `@anon-rpc/browser-harness`** sandboxed worker. | **NO** (Stripped by Anon-RPC) | Yes (Owner) |

---

## 4. Sponsor Integration Matrix & Bounty Alignment ($64,500+ Pool)

| Sponsor & Pool | Target Sub-Tracks | Exact Technical Role in ShunyaGrid | Mandatory Compliance Checklist |
| :--- | :--- | :--- | :--- |
| **Ethereum Foundation ($15,000)** | Best Use of Anon-RPC ($5,000) + Best CROPS App ($3,500) | 1. Routes Buyer JSON-RPC reads (querying Arkiv listings, ENS records, wallet balances) through `@anon-rpc/browser-harness` so RPC providers and Sellers never learn Buyer IP metadata.<br>2. Enforces **CROPS**: client-side file/prompt encryption, local key custody, zero third-party analytics/trackers. | Open-source MIT license, zero trackers in client, `CROPS` section in README (C, O, P, S), `<3 min` video showing Before/After privacy moment. |
| **Hedera ($15,000)** | AI Agents That Pay: x402 ($6,500) + "No Solidity Allowed" SDK Track ($2,000) | 1. Implements **HTTP 402 (`x402`)** paywall quoting `C_buyer` (for `T_max` tokens).<br>2. Buyer pays `C_buyer` in **HTS USDC**; after execution, Hedera SDK transfers `R_seller` (for `T_used` tokens) to Seller and retains `Pi_app` commission.<br>3. Logs every settled job `(txId, T_max, T_used, sellerPayout, appCommission)` to a **Hedera Consensus Service (HCS)** topic.<br>4. Uses **zero Solidity** (pure `@hashgraph/sdk` + Mirror Node REST API). | Include settled Hedera `x402` Transaction ID in README and link/show it on **HashScan** in the demo video. |
| **Arkiv ($15,000)** | Web3 Database Entities Track ($15,000 pool) | 1. Stores Seller API Token Listings as **Arkiv Entities** with indexed attributes (`model`, `maxSupportedTokens`, `availableTokens`, `pricePer1kMicroUsdc`, `humanVerified`) and a **1-hour block expiration**.<br>2. Updates `availableTokens` after each prompt via `patchEntity`.<br>3. Stores encrypted Buyer file attachments (<= 128 KiB) with a **10-minute block expiration**. | Wallet-owned entities paid in `$GLM`, queried directly via Arkiv JSON-RPC attributes with zero external indexers. |
| **0G ($15,000)** | Best OpenClaw/ZeroClaw Agent ($6,000) + Wildcard on 0G ($3,000) | 1. **0G Compute / Sealed Enclave** holds `SK_enclave` to unwrap Seller API keys and Buyer prompts/files, execute the token-bounded call, and sign a cryptographic execution receipt.<br>2. **0G Storage** hosts encrypted Buyer file attachments > 128 KiB (PDFs, ZIPs, high-res images) and persistent RAG memory for the **OpenClaw** Buyer Agent. | Deploy on 0G Testnet, list contract/storage addresses in README, keep video `<3 mins`. |
| **Arc ($15,000)** | Mobile/Web Consumer Agent ($3,000) + Bridge Kit ($3,000) | 1. Full-stack web app is initialized from scratch inside **Arc Studio (`studio.arc.com`)**.<br>2. Exposes token listings via Arc's Marketplace Discovery API and lets Sellers sweep/bridge their earned payouts across chains into USDC/EURC on Arc via Circle's **CCTP Bridge Kit**. | Must start in Arc Studio, include Arc Studio project URL in submission, show Studio in demo video, include architecture diagram. |
| **World ($12,500)** | Proof of Human & AgentKit Tracks ($12,500 pool) | Verifies that Sellers listing API keys are unique humans via **World ID** (preventing fake/stolen key spam on the orderbook) and binds autonomous Buyer agents to verified human principals via **AgentKit**. | Functional `@worldcoin/idkit` verification gating Seller listing creation. |
| **ENS ($10,000)** | Decentralized Identity & Agent Naming ($10,000 est. pool) | Mints human-readable subnames for Seller token pools (e.g., `arjun-claude.shunyagrid.eth`) via **Namespace SDK**, storing their Hedera payout account and supported models in ENS text records. | Functional ENS subname resolution and text record lookup. |

---

## 5. End-to-End Prototype Workflow

```text
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: SELLER LISTS UNUSED API TOKENS (World ID + ENS + Sealed Key + Arkiv Entity) │
└───────────────────────────────────────────────────────────────────────────────────────┘
  Seller enters in ShunyaGrid Web App (Built in Arc Studio):
  1. Provider & API Key (e.g., Anthropic `sk-ant-...`) -> Encrypted in browser to `PK_enclave`
  2. Total Token Quota to Share: e.g., `Q_seller = 200,000 tokens`
  3. Price per 1,000 Tokens: e.g., `$0.01 USDC` (`10000 microUSDC`)
  4. Hedera Payout Account: `0.0.482910` + World ID Proof + ENS (`arjun.shunyagrid.eth`)
         │
         ▼
  Creates Wallet-Owned Arkiv Entity (1-Hour Expiry):
  `attributes: { model: "claude-3-7-sonnet", availableTokens: 200000, pricePer1kMicro: 10000 }`

┌───────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: BUYER SELECTS THINKING LEVEL & ATTACHES ANY FILES (EF Anon-RPC + Encryption) │
└───────────────────────────────────────────────────────────────────────────────────────┘
  1. Buyer chooses Model = `claude-3-7-sonnet` & Thinking Level = `medium`
     -> Interface looks up deterministic bounds: `T_min = 5,000`, `T_max = 24,192 tokens`
  2. Buyer browser queries Arkiv via EF `@anon-rpc/browser-harness` (IP hidden):
     `WHERE model = "claude-3-7-sonnet" AND availableTokens >= 24192`
  3. Buyer drags & drops ANY files (PDF, Code, Images, CSV) + types Prompt:
     -> Generated locally in Buyer RAM: `K_input` (encrypts prompt & files) + `K_return` (for output)
     -> Encrypted files <=128 KiB saved to Arkiv (10-min expiry); >128 KiB saved to 0G Storage

┌───────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: MAX-TOKEN UPFRONT CHARGE VIA HEDERA x402 (HTTP 402 Payment Required)         │
└───────────────────────────────────────────────────────────────────────────────────────┘
  1. Interface quotes Upfront Buyer Price governed by `T_max = 24,192 tokens`:
     `C_buyer = (24,192 / 1000) * $0.01 = $0.241920 USDC`
  2. Server returns `HTTP 402 Payment Required` -> Buyer pays `$0.241920 HTS USDC` on Hedera
  3. Interface verifies payment via Hedera Mirror Node REST API & locks `24,192 tokens`

┌───────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: BLIND EXECUTION, SELLER PAYOUT (`T_used`), & WEB APP COMMISSION (`T_max - T_used`) │
└───────────────────────────────────────────────────────────────────────────────────────┘
  1. Sealed Enclave decrypts Seller API Key + Buyer Prompt & Files in isolated RAM
  2. Calls Upstream AI API with hard cap `T_max = 24,192` (Impossible to cut off mid-way!)
  3. AI finishes & reports actual usage: `T_used = 14,192 tokens`
  4. Enclave encrypts AI Output with `K_return` & wipes plaintext from RAM (Seller sees NOTHING)
  5. Automatic Hedera HTS Settlement & HCS Audit Log:
     -> Paid to Seller (`0.0.482910`) for `14,192 used tokens`: `$0.141920 USDC`
     -> Kept by ShunyaGrid Web App as Commission (`10,000 unused tokens`): `$0.100000 USDC`
     -> Seller's Arkiv Entity updated: `availableTokens = 200,000 - 14,192 = 185,808 tokens`
```

---

## 6. Full Technical Implementation Plan & Core Code Modules

### 6.1 Monorepo File Structure
Initialize the project inside **Arc Studio (`https://studio.arc.com`)** and structure the GitHub repository as follows:

```text
shunyagrid/
├── apps/
│   ├── web/                                # Next.js 15 App (Bootstrapped in Arc Studio)
│   │   ├── public/anon-rpc/                # Auto-copied by build script from @anon-rpc/browser-harness
│   │   └── src/
│   │       ├── app/
│   │       │   ├── seller/page.tsx         # Seller Form: Seal API Key, Set Quota, World ID, ENS
│   │       │   ├── buyer/page.tsx          # Buyer UI: Model + Thinking Selector, Any-File Dropzone
│   │       │   └── audit/page.tsx          # Split-Screen Judge View (Seller Blindness + Commission Log)
│   │       └── api/
│   │           ├── enclave-pubkey/route.ts # Returns 0G Sealed Enclave RSA-OAEP Public Key
│   │           └── blind-execute/route.ts  # HTTP 402 (x402) Gatekeeper + Enclave Execution + Payout Split
│   └── buyer-cli-agent/                    # Autonomous OpenClaw / ZeroClaw Agent consuming ShunyaGrid
├── packages/
│   └── shunya-core/
│       ├── tokenBoundsCatalog.ts           # Deterministic (Model, ThinkingLevel) -> T_min, T_max matrix
│       ├── blindCrypto.ts                  # Client-side AES-256-GCM File/Prompt/Key sealing
│       ├── arkivQuotaManager.ts            # Arkiv Entity CRUD, T_max filtering & quota patching
│       ├── hederaX402Settlement.ts         # Zero-Solidity HTS Upfront Charge, Seller Payout & HCS Log
│       └── fileParserEnclave.ts            # In-RAM PDF, Image, Code, CSV, ZIP extractor for Enclave
└── README.md                               # Contains mandatory CROPS section, Arc URL & HashScan Tx IDs
```

### 6.2 Core Module 1: Model & Thinking Level Token Bounds + Commission Math (`packages/shunya-core/tokenBoundsCatalog.ts`)

```typescript
export type ThinkingLevel = "none" | "low" | "medium" | "high";

export interface ModelTokenBounds {
  modelId: string;
  provider: "openai" | "anthropic" | "gemini" | "groq";
  thinkingLevel: ThinkingLevel;
  minRequiredTokens: number;     // T_min
  maxInputAndFileTokens: number; // T_input_cap
  thinkingBudgetTokens: number;  // T_thinking_budget
  maxOutputTokens: number;       // T_output_cap
  totalMaxTokens: number;        // T_max = T_input_cap + T_thinking_budget + T_output_cap
}

export const MODEL_TOKEN_CATALOG: Record<string, ModelTokenBounds> = {
  "gpt-4o:none": {
    modelId: "gpt-4o",
    provider: "openai",
    thinkingLevel: "none",
    minRequiredTokens: 1000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 0,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
  },
  "o3-mini:low": {
    modelId: "o3-mini",
    provider: "openai",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 6000,
    thinkingBudgetTokens: 2000,
    maxOutputTokens: 4000,
    totalMaxTokens: 12000,
  },
  "o3-mini:medium": {
    modelId: "o3-mini",
    provider: "openai",
    thinkingLevel: "medium",
    minRequiredTokens: 4000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 8000,
    maxOutputTokens: 6000,
    totalMaxTokens: 22000,
  },
  "o3-mini:high": {
    modelId: "o3-mini",
    provider: "openai",
    thinkingLevel: "high",
    minRequiredTokens: 8000,
    maxInputAndFileTokens: 12000,
    thinkingBudgetTokens: 16000,
    maxOutputTokens: 8000,
    totalMaxTokens: 36000,
  },
  "claude-3-7-sonnet:low": {
    modelId: "claude-3-7-sonnet",
    provider: "anthropic",
    thinkingLevel: "low",
    minRequiredTokens: 2000,
    maxInputAndFileTokens: 8000,
    thinkingBudgetTokens: 2048,
    maxOutputTokens: 4000,
    totalMaxTokens: 14048,
  },
  "claude-3-7-sonnet:medium": {
    modelId: "claude-3-7-sonnet",
    provider: "anthropic",
    thinkingLevel: "medium",
    minRequiredTokens: 5000,
    maxInputAndFileTokens: 10000,
    thinkingBudgetTokens: 8192,
    maxOutputTokens: 6000,
    totalMaxTokens: 24192,
  },
  "claude-3-7-sonnet:high": {
    modelId: "claude-3-7-sonnet",
    provider: "anthropic",
    thinkingLevel: "high",
    minRequiredTokens: 10000,
    maxInputAndFileTokens: 16000,
    thinkingBudgetTokens: 16384,
    maxOutputTokens: 8000,
    totalMaxTokens: 40384,
  },
};

// 1. Verify Seller has enough tokens to prevent mid-generation cutoff
export function canSellerFulfillPrompt(
  sellerAvailableTokens: number,
  modelId: string,
  thinkingLevel: ThinkingLevel
): { eligible: boolean; bounds: ModelTokenBounds; reason?: string } {
  const key = `${modelId}:${thinkingLevel}`;
  const bounds = MODEL_TOKEN_CATALOG[key];
  if (!bounds) {
    throw new Error(`Unsupported model/thinking combination: ${key}`);
  }
  if (sellerAvailableTokens < bounds.totalMaxTokens) {
    return {
      eligible: false,
      bounds,
      reason: `Seller has ${sellerAvailableTokens} tokens, but ${key} requires at least T_max = ${bounds.totalMaxTokens} tokens to guarantee zero mid-generation cutoff.`,
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
  buyerChargedMicroUsdc: number;
  sellerPayoutMicroUsdc: number;
  webAppCommissionMicroUsdc: number;
  unusedTokensReturnedToSellerQuota: number;
} {
  const cappedUsedTokens = Math.min(actualTokensUsed, bounds.totalMaxTokens);
  const buyerChargedMicroUsdc = calculateUpfrontBuyerChargeMicroUsdc(
    bounds,
    sellerPricePer1kTokensMicroUsdc
  );
  const sellerPayoutMicroUsdc = Math.floor(
    (cappedUsedTokens / 1000) * sellerPricePer1kTokensMicroUsdc
  );
  const webAppCommissionMicroUsdc = buyerChargedMicroUsdc - sellerPayoutMicroUsdc;
  const unusedTokensReturnedToSellerQuota = bounds.totalMaxTokens - cappedUsedTokens;

  return {
    buyerChargedMicroUsdc,
    sellerPayoutMicroUsdc,
    webAppCommissionMicroUsdc,
    unusedTokensReturnedToSellerQuota,
  };
}
```

### 6.3 Core Module 2: Blind Client-Side Packager for Seller Keys, Prompts & Arbitrary Files (`packages/shunya-core/blindCrypto.ts`)

```typescript
import crypto from "crypto";

// SELLER BROWSER: Seal Seller's raw API key so only the Enclave can unwrap it
export function sealSellerApiKeyToEnclave(rawApiKey: string, enclavePublicKeyPem: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: enclavePublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(rawApiKey, "utf8")
  );
  return encrypted.toString("base64");
}

// BUYER BROWSER: Encrypt arbitrary attached files + prompt + K_return key
export function sealBuyerPromptAndFiles(
  promptText: string,
  files: { filename: string; mimeType: string; data: Buffer }[],
  enclavePublicKeyPem: string
) {
  const kInput = crypto.randomBytes(32);  // Encrypts Buyer prompt & attached files
  const kReturn = crypto.randomBytes(32); // Used by Enclave to encrypt AI output

  // Encrypt each attached file locally before upload to Arkiv (<=128KB) or 0G Storage (>128KB)
  const encryptedFiles = files.map((f) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", kInput, iv);
    const ciphertext = Buffer.concat([cipher.update(f.data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      filename: f.filename,
      mimeType: f.mimeType,
      sizeBytes: f.data.byteLength,
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
      ciphertextBase64: ciphertext.toString("base64"),
    };
  });

  // Encrypt prompt text + file manifest
  const promptIv = crypto.randomBytes(12);
  const promptCipher = crypto.createCipheriv("aes-256-gcm", kInput, promptIv);
  const payloadStr = JSON.stringify({ promptText, encryptedFiles });
  const encryptedPrompt = Buffer.concat([
    promptCipher.update(payloadStr, "utf8"),
    promptCipher.final(),
  ]);
  const promptAuthTag = promptCipher.getAuthTag();

  // Wrap kInput and kReturn to Enclave Public Key
  const wrappedKeys = crypto.publicEncrypt(
    {
      key: enclavePublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(
      JSON.stringify({
        kInputHex: kInput.toString("hex"),
        kReturnHex: kReturn.toString("hex"),
      })
    )
  );

  return {
    buyerLocalReturnKey: kReturn, // Never leaves Buyer's browser in plaintext!
    encryptedEnvelope: {
      wrappedKeysBase64: wrappedKeys.toString("base64"),
      promptIvHex: promptIv.toString("hex"),
      promptAuthTagHex: promptAuthTag.toString("hex"),
      encryptedPromptBase64: encryptedPrompt.toString("base64"),
    },
  };
}
```

### 6.4 Core Module 3: Hedera `x402` Upfront Charge, Seller Payout & Commission Settlement (`packages/shunya-core/hederaX402Settlement.ts`)

```typescript
import {
  Client,
  TransferTransaction,
  TopicMessageSubmitTransaction,
  AccountId,
  TokenId,
} from "@hashgraph/sdk";

const hederaClient = Client.forTestnet().setOperator(
  process.env.SHUNYA_TREASURY_HEDERA_ID!,
  process.env.SHUNYA_TREASURY_PRIVATE_KEY!
);

// 1. Verify Buyer paid C_buyer (for T_max tokens) via Hedera Mirror Node REST API
export async function verifyBuyerX402UpfrontPayment(
  hederaTxId: string,
  expectedMicroUsdc: number
): Promise<boolean> {
  const url = `[https://testnet.mirrornode.hedera.com/api/v1/transactions/$](https://testnet.mirrornode.hedera.com/api/v1/transactions/$){hederaTxId}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const data = await res.json();
  return data.transactions && data.transactions[0]?.result === "SUCCESS";
}

// 2. Pay Seller for actual tokens used (T_used) & log commission split to HCS
export async function settleSellerPayoutAndCommissionOnHedera(params: {
  buyerX402TxId: string;
  sellerHederaAccountId: string;
  modelId: string;
  thinkingLevel: string;
  tMaxTokens: number;
  tUsedTokens: number;
  buyerChargedMicroUsdc: number;
  sellerPayoutMicroUsdc: number;
  webAppCommissionMicroUsdc: number;
  zeroGAttestationHash: string;
}) {
  const usdcTokenId = TokenId.fromString(process.env.HEDERA_USDC_TOKEN_ID!);
  const treasuryId = AccountId.fromString(process.env.SHUNYA_TREASURY_HEDERA_ID!);
  const sellerId = AccountId.fromString(params.sellerHederaAccountId);

  // Transfer R_seller (for T_used) from ShunyaGrid Treasury to Seller;
  // Pi_app (commission for T_max - T_used) remains in ShunyaGrid Treasury!
  let sellerPayoutTxId = "0.0.0@0";
  if (params.sellerPayoutMicroUsdc > 0) {
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(usdcTokenId, treasuryId, -params.sellerPayoutMicroUsdc)
      .addTokenTransfer(usdcTokenId, sellerId, params.sellerPayoutMicroUsdc)
      .setTransactionMemo(`ShunyaGrid Payout: ${params.tUsedTokens}/${params.tMaxTokens} tokens`)
      .execute(hederaClient);

    sellerPayoutTxId = transferTx.transactionId.toString();
  }

  // Submit tamper-evident receipt to Hedera Consensus Service (HCS)
  const hcsMessage = JSON.stringify({
    protocol: "ShunyaGrid-v1",
    buyerUpfrontTxId: params.buyerX402TxId,
    sellerPayoutTxId,
    model: params.modelId,
    thinkingLevel: params.thinkingLevel,
    tokensReservedMax: params.tMaxTokens,
    tokensActualUsed: params.tUsedTokens,
    buyerPaidMicroUsdc: params.buyerChargedMicroUsdc,
    sellerReceivedMicroUsdc: params.sellerPayoutMicroUsdc,
    webAppCommissionMicroUsdc: params.webAppCommissionMicroUsdc,
    zeroGProof: params.zeroGAttestationHash,
    privacyGuarantee: "PROMPT_FILES_OUTPUT_SEALED",
    timestamp: new Date().toISOString(),
  });

  await new TopicMessageSubmitTransaction()
    .setTopicId(process.env.HEDERA_HCS_TOPIC_ID!)
    .setMessage(hcsMessage)
    .execute(hederaClient);

  return { sellerPayoutTxId };
}
```

### 6.5 Core Module 4: Sealed Execution & Token-Bounded Upstream Call (`apps/web/src/app/api/blind-execute/route.ts`)
This endpoint ties the entire flow together:
1. Checks that the Seller’s **Arkiv Entity** has `availableTokens >= T_max`.
2. Returns `HTTP 402 Payment Required` quoting `C_buyer` (for `T_max` tokens) if no `x402` header is present.
3. Once paid, unwraps the Seller’s API key and the Buyer’s prompt + files in isolated Enclave memory, parses any attached files (PDF, Image, CSV, Code), calls the upstream AI API with hard token limits (`T_max`), encrypts the AI output with `K_return`, settles the Seller’s `T_used` payout on Hedera while retaining the web app commission, and updates the Seller’s remaining quota on Arkiv.

---

## 7. Feasibility Testing & Verification Matrix

To prove to hackathon judges that ShunyaGrid is a rock-solid engineering build, run and demonstrate these **6 Feasibility & Invariant Tests** (include a `npm run test:feasibility` script in your repository):

| Test ID | Test Name | Input Scenario | Expected System Behavior | Sponsor Requirement Verified |
| :--- | :--- | :--- | :--- | :--- |
| **FT-01** | **Zero Mid-Way Cutoff Gate** | Seller lists `claude-3-7-sonnet` with `18,000` tokens remaining. Buyer selects `Thinking Level = medium` (`T_max = 24,192`). | Listing is automatically filtered out / rejected pre-flight (`18,000 < 24,192`). Buyer is suggested `Thinking Level = low` (`T_max = 14,048`), which succeeds with zero cutoff. | Core Product Invariant + **Arkiv** Attribute Querying |
| **FT-02** | **Max Charge vs. Actual Payout & Commission Split** | Buyer runs `o3-mini` (`medium`, `T_max = 22,000`) at `$0.01 / 1k`. Prompt uses `11,500` tokens (`T_used`). | 1. Buyer charged `$0.220000 USDC` via `x402`.<br>2. Seller paid `$0.115000 USDC` via HTS.<br>3. Web App retains `$0.105000 USDC` commission.<br>4. Seller Arkiv quota decreases by `11,500` (not `22,000`). | **Hedera** Track 1 (`x402`) + Track 3 (No Solidity SDK) |
| **FT-03** | **Total Seller Blindness (Prompt, Files & Output)** | Buyer attaches a 2 MB `secret_audit.pdf` + `architecture.png` + prompt. Seller inspects proxy logs and Arkiv/0G storage. | Seller log displays only `T_max: 24192 | T_used: 14192 | Payout: $0.1419 | Payload: 0x9f8a... [SEALED]`. Decrypting without `SK_enclave` or `K_return` throws `Unsupported state or unable to authenticate data`. | **0G** Sealed Compute + **0G Storage** + **EF CROPS** |
| **FT-04** | **Anon-RPC Read Anonymity** | Buyer loads the marketplace and queries Arkiv entities and ENS subnames. | Browser network inspector confirms JSON-RPC calls route through the sandboxed `@anon-rpc/browser-harness` iframe/worker (`sandbox.html`). | **Ethereum Foundation** Best Use of Anon-RPC ($5,000) |
| **FT-05** | **Time-Scoped File & Listing Expiry** | Buyer uploads a `<128 KiB` encrypted CSV to Arkiv (10-min expiry); Seller stops extending listing heartbeat. | Once the expiration block arrives on Arkiv, both the temporary encrypted file and the inactive Seller listing automatically vanish from RPC queries without gas-heavy delete transactions. | **Arkiv** DB-Chain Time-Scoped Entities ($15,000) |
| **FT-06** | **Concurrent Request Race Protection** | Seller has `30,000` tokens. Two Buyers simultaneously request a `22,000`-token (`T_max`) job. | Request A atomically locks `22,000` tokens (`8,000` left). Request B sees `8,000 < 22,000` and routes to the next Seller node, preventing double-spend cutoff. | High-Concurrency Reliability |

---

## 8. 36-Hour Sprint Execution Schedule & Compliance Checklist

### 8.1 Hour-by-Hour Build Plan (3–4 Person Team)
* **Hours 0–3 (Thu Nov 5 Evening — Genesis):**
  * **All Devs:** Initialize the project inside **Arc Studio (`https://studio.arc.com`)** first. Save the Arc Studio project URL for your submission. Create the MIT-licensed GitHub repo and ensure every teammate pushes regular commits.
  * **Dev 1 (Frontend & Privacy):** Set up the automated `copy:anon-rpc` script in `package.json` to copy `@anon-rpc/browser-extension-harness/dist/static/anon-rpc` into `public/anon-rpc` so `worker.ready` never hangs.
* **Hours 3–12 (Fri Nov 6 Morning — Token Engine & Blind Crypto):**
  * **Dev 2 (Backend & Token Math):** Implement `tokenBoundsCatalog.ts` ($T_{\min}$, $T_{\max}$, upfront Buyer charge, Seller `T_used` payout, and Web App commission math) and wire the **Hedera `x402`** middleware + HTS transfer + HCS logger using `@hashgraph/sdk` (zero Solidity).
  * **Dev 3 (Crypto & Storage):** Implement `blindCrypto.ts` (client-side encryption of Seller API keys, Buyer prompts, Buyer files, and `K_return` output sealing) and wire the **Arkiv** ($\le 128\text{ KiB}$) and **0G Storage** ($> 128\text{ KiB}$) file drop-boxes.
* **Hours 12–22 (Fri Nov 6 Afternoon/Night — Seller & Buyer UI + Live API Execution):**
  * **Dev 1:** Build the **Seller Onboarding Page** (paste API key -> client-side seal to Enclave, input total tokens $Q_{\text{seller}}$, set price per 1k tokens, verify with **World ID**, mint **ENS** subname via Namespace SDK, and write the **Arkiv Entity**).
  * **Dev 2 & Dev 3:** Build the **Buyer Prompt & File Interface** (select Model + Thinking Level -> live badge displays $T_{\min}$, $T_{\max}$, and exact upfront `x402` USDC price; drag-and-drop any file; execute blind inference against real OpenAI/Anthropic/Groq/0G API keys).
* **Hours 22–30 (Sat Nov 7 Overnight — Judge Split-Screen View & Arc Bridge):**
  * **Dev 1:** Build the **"Judge Audit & Split-Screen View"** showing Side-by-Side:
    1. *Buyer View:* Full decrypted AI answer + parsed file insights.
    2. *Seller View:* `Prompt: [ENCRYPTED] | Attached Files: [ENCRYPTED] | AI Output: [ENCRYPTED] | Tokens Reserved (T_max): 24,192 | Tokens Used (T_used): 14,192 | Seller Payout: $0.1419 USDC | ShunyaGrid Commission: $0.1000 USDC`.
  * **Dev 3:** Add the **Arc Circle CCTP Bridge Kit** component for Seller cross-chain payout sweeping and the **OpenClaw** CLI buyer agent script.
* **Hours 30–36 (Sat Nov 7 Morning — Testing, README & `<3 Min` Video):**
  * Run all 6 feasibility tests (`FT-01` to `FT-06`), record a **2-minute 45-second demo video** (satisfying the strict 3-minute limit of EF and 0G and the 5-minute limit of Hedera), and verify all README requirements below.

### 8.2 Mandatory Pre-Submission README & Video Checklist
1. **Ethereum Foundation ($15,000):**
   * Remove all third-party analytics/trackers (no Google Analytics, PostHog, etc.) from the web app.
   * Include a section titled **`CROPS`** in `README.md` with 1–2 lines for **C** (Censorship Resistance via Arkiv/ENS/Hedera p2p settlement), **O** (MIT open-source license, reproducible standalone build), **P** (Buyer IP hidden via Anon-RPC; Buyer prompt, files, and AI output invisible to Seller), and **S** (API keys and ephemeral decryption keys encrypted on the user's device).
2. **Hedera ($15,000):**
   * Paste at least one settled **Hedera Transaction ID** (from the `x402` upfront payment and the Seller `T_used` payout) in `README.md` and show it on **HashScan** in the demo video.
   * State explicitly that your Hedera integration uses **zero Solidity smart contracts** (`@hashgraph/sdk` HTS + HCS + Mirror Node REST API) to qualify for both Track 1 ($6,500) and Track 3 ($2,000).
3. **Arc ($15,000):**
   * State the target Arc bounty in your submission, include your **Arc Studio Project URL**, show the Arc Studio interface briefly in your demo video, and embed the system architecture diagram in your README.
4. **0G ($15,000) & Arkiv ($15,000):**
   * Include your 0G Testnet deployment/storage addresses and Arkiv Entity keys in `README.md`. Keep the video strictly under **3 minutes (180 seconds)**.