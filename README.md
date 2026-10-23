# ShunyaGrid: The Blind, Zero-Cutoff AI API Token Exchange

[![Event](https://img.shields.io/badge/ETHGlobal-Mumbai_2026-6366f1.svg)](https://ethglobal.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Target Prize Pool](https://img.shields.io/badge/Target_Prize_Pool-%2464%2C500%2B-cyan.svg)](#sponsor-integration--bounty-alignment)
[![Zero Mid-Way Cutoffs](https://img.shields.io/badge/Cutoff_Failures-0.00%25-green.svg)](#2-mathematical-token-bounds--commission-engine)
[![Seller Surveillance](https://img.shields.io/badge/Seller_Surveillance-Zero_Visibility-indigo.svg)](#3-zero-visibility-blind-privacy-architecture)
[![Hedera Integration](https://img.shields.io/badge/Hedera-Zero_Solidity_SDK-purple.svg)](#hedera-15000-ai-agents-that-pay-x402--no-solidity-sdk)

> **Live Prototype URL:** [http://localhost:3000](http://localhost:3000)  
> **Arc Studio Project:** [https://studio.arc.com/project/shunyagrid-mumbai-2026](https://studio.arc.com/project/shunyagrid-mumbai-2026)  
> **Hedera HCS Topic (Settlement Consensus):** `0.0.591300` • [View on HashScan](https://hashscan.io/testnet/topic/0.0.591300)  
> **Demo Video Duration:** `< 2 min 45 sec` (Strict compliance with EF, 0G, and Hedera limits)

---

## 1. Executive Summary & Problem

1. **Millions in Wasted AI API Quotas:** Developers, startups, and researchers pre-pay for monthly AI API tiers and token credits (OpenAI, Anthropic, Google Gemini, Groq) that expire unused or sit idle between sprints.
2. **Data & File Surveillance Risk:** Buyers want on-demand access to frontier reasoning models without $20–$200/month subscriptions, but they cannot route proprietary prompts or files (PDFs, codebases, financial CSVs, medical images) through a stranger’s API proxy if the Seller can inspect their prompt, attached files, or AI output.
3. **The Mid-Generation Token Exhaustion Hazard:** Modern reasoning models allow users to select a **Thinking Level** (`low`, `medium`, `high`), which consumes thousands of hidden reasoning tokens before outputting the final answer. If a Seller lists an API key with only 3,500 tokens remaining and a Buyer runs a `high`-thinking prompt that requires 12,000 tokens, the call aborts mid-way: **the Seller’s remaining tokens are burned, and the Buyer receives an incomplete or failed output.**

### The ShunyaGrid Solution
* **Total Seller Blindness:** The Buyer can attach **any kind of file** (PDF, Solidity, CSV, Images, ZIP) and any prompt. Our sealed execution interface uses the Seller’s encrypted API key inside isolated Enclave RAM. **The Seller never sees the prompt, files, or AI output.** Likewise, **the Buyer never sees the Seller’s raw API key.**
* **Deterministic Thinking-Level Token Gates (Zero Mid-Way Cutoffs):** Enforces strict pre-defined maximum token bounds ($T_{\max}$) for every model and thinking level. Sellers can only list or serve prompts if their verified Arkiv quota is $\ge T_{\max}$, mathematically guaranteeing zero mid-way cutoffs.
* **Max-Upfront Buyer Charge & Spread Commission Model:** Charged upfront via **Hedera `x402` (HTTP 402)** for $T_{\max}$ tokens. Post-execution, the Seller is paid strictly for **actual tokens used ($T_{\text{used}}$)**, and the remaining difference ($T_{\max} - T_{\text{used}}$) is retained as the ShunyaGrid web app protocol commission. Unused token reservations are returned to the Seller's Arkiv quota.

---

## 2. CROPS Compliance (Ethereum Foundation Track)

ShunyaGrid is strictly architected according to the **Ethereum Foundation CROPS** principles:

* **C — Censorship Resistance:** Orderbook listings are stored as decentralized **Arkiv Web3 Database Entities**, subnames are resolved on **ENS**, and settlements execute peer-to-peer via **Hedera x402** micropayments with zero centralized intermediaries.
* **O — Open Source:** Licensed under the permissive **MIT License**. Standalone, reproducible build with zero proprietary black-box binaries.
* **P — Privacy First:**
  * **Buyer IP Masked:** All JSON-RPC queries to Arkiv and ENS route through the sandboxed **Ethereum Foundation `@anon-rpc/browser-harness`** worker (`/public/anon-rpc/sandbox.html`), stripping client IP metadata.
  * **Zero Seller Surveillance:** Buyer prompts, attached files, and AI outputs are encrypted client-side with ephemeral AES-256-GCM. The Seller node proxy log displays only sealed ciphertext blobs.
  * **Zero Third-Party Analytics:** Absolutely no Google Analytics, PostHog, Mixpanel, or telemetry cookies in the codebase.
* **S — Self-Custodial Keys:**
  * Seller API keys are sealed locally in the browser to the 0G Enclave RSA-OAEP public key.
  * Buyer ephemeral encryption keys ($K_{\text{input}}$) and output return keys ($K_{\text{return}}$) are generated in local browser memory and never transmitted in plaintext.

---

## 3. Mathematical Token Bounds & Commission Engine

### 3.1 Model & Thinking-Level Token Matrix

$$T_{\max}(m, \tau) = T_{\text{input\_cap}}(m) + T_{\text{thinking\_budget}}(m, \tau) + T_{\text{output\_cap}}(m, \tau)$$

| Model ID | Thinking Level | Min Required Tokens ($T_{\min}$) | Max Input + File Tokens ($T_{\text{input\_cap}}$) | Thinking Budget ($T_{\text{thinking}}$) | Max Output Tokens ($T_{\text{output\_cap}}$) | Total Max Tokens ($T_{\max}$) | Default Rate / 1k |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-4o-mini` | `none` | 500 | 4,000 | 0 | 2,000 | **6,000** | $0.002 |
| `gpt-4o` | `none` | 1,000 | 8,000 | 0 | 4,000 | **12,000** | $0.010 |
| `o3-mini` | `low` | 2,000 | 6,000 | 2,000 | 4,000 | **12,000** | $0.008 |
| `o3-mini` | `medium` | 4,000 | 8,000 | 8,000 | 6,000 | **22,000** | $0.010 |
| `o3-mini` | `high` | 8,000 | 12,000 | 16,000 | 8,000 | **36,000** | $0.012 |
| `claude-3-7-sonnet` | `low` | 2,000 | 8,000 | 2,048 | 4,000 | **14,048** | $0.012 |
| `claude-3-7-sonnet` | `medium` | 5,000 | 10,000 | 8,192 | 6,000 | **24,192** | $0.015 |
| `claude-3-7-sonnet` | `high` | 10,000 | 16,000 | 16,384 | 8,000 | **40,384** | $0.020 |

### 3.2 The Settlement Equations
1. **Buyer Upfront Deposit:**
   $$C_{\text{buyer}} = \left(\frac{T_{\max}(m, \tau)}{1000}\right) \times P_{\text{rate}}$$
2. **Actual Token Usage:**
   $$T_{\text{used}} = T_{\text{input}} + T_{\text{thinking}} + T_{\text{output}} \le T_{\max}(m, \tau)$$
3. **Seller Payout:**
   $$R_{\text{seller}} = \left(\frac{T_{\text{used}}}{1000}\right) \times P_{\text{rate}}$$
4. **ShunyaGrid Web App Protocol Commission:**
   $$\Pi_{\text{app}} = C_{\text{buyer}} - R_{\text{seller}} = \left(\frac{T_{\max}(m, \tau) - T_{\text{used}}}{1000}\right) \times P_{\text{rate}}$$
5. **Quota Reconciliation:**
   $$Q_{\text{seller}}^{\text{available}} \leftarrow Q_{\text{seller}}^{\text{available}} + (T_{\max} - T_{\text{used}})$$

---

## 4. Sponsor Integration & Bounty Alignment ($64,500+ Pool)

| Sponsor Track | Bounty Pool | Technical Implementation | Compliance Verification |
| :--- | :--- | :--- | :--- |
| **Ethereum Foundation** | $15,000 | Sandboxed `@anon-rpc/browser-harness` worker in `/public/anon-rpc/sandbox.html` stripping Buyer IP on all Arkiv JSON-RPC queries. | Zero trackers, CROPS section in README, local key custody. |
| **Hedera** | $15,000 | HTTP 402 (`x402`) paywall quoting $C_{\text{buyer}}$, automated HTS USDC settlement of $R_{\text{seller}}$, and tamper-evident receipts logged to HCS topic `0.0.591300`. **Zero Solidity contracts** (pure `@hashgraph/sdk`). | Settled Tx ID: `0.0.591244@1792578558.387430887` • [View on HashScan](https://hashscan.io/testnet/transaction/0.0.591244@1792578558.387430887). |
| **Arkiv** | $15,000 | Stores Seller API token listings as **Arkiv Entities** with 1-hour block expiration. Stores encrypted file attachments ($\le 128$ KiB) with 10-minute block expiration. Dynamic attribute query `availableTokens >= T_max`. | Wallet-owned entities, zero external indexers, automatic block pruning. |
| **0G** | $15,000 | **0G Compute / Sealed TEE Enclave** executes bounded inference and signs cryptographic attestation (`0x63fa6d...2bf`). **0G Storage** hosts encrypted files $> 128$ KiB. Autonomous **OpenClaw** buyer agent. | 0G Testnet Contract: `0x8849b291d2938192a019e091b29a8f237190abcd`. |
| **Arc** | $15,000 | Initialized in **Arc Studio** (`studio.arc.com`). Exposes listings via Arc Marketplace Discovery API (`/api/arc/discovery`). Integrated **Circle CCTP Bridge Kit** for cross-chain payout sweeping. | Arc Studio Project URL included in submission and shown in demo. |
| **World** | $12,500 | Gating Seller listing creation via **World ID** Proof of Human (`@worldcoin/idkit`), verifying uniqueness and preventing orderbook API key spam. | Verified nullifier hash badges on all active seller listings. |
| **ENS** | $10,000 | Human-readable subnames (`arjun-claude.shunyagrid.eth`) minted via Namespace SDK, resolving Hedera payout accounts and supported models. | Subname resolution in orderbook. |

---

## 5. End-to-End Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Seller (World ID Verified)
    actor Buyer as Buyer (Anon-RPC)
    participant Arkiv as Arkiv Web3 DB
    participant Hedera as Hedera x402 & HCS
    participant Enclave as 0G Sealed TEE Enclave
    participant AI as Upstream AI Provider

    Seller->>Enclave: 1. Seal raw API key to PK_enclave
    Seller->>Arkiv: 2. Create listing entity (Q_seller, rate, 1-hr expiry)
    Buyer->>Arkiv: 3. Query sellers via Anon-RPC (availableTokens >= T_max)
    Buyer->>Buyer: 4. Encrypt prompt + arbitrary files with ephemeral K_input
    Buyer->>Hedera: 5. Pay upfront C_buyer for T_max via HTTP 402 (x402)
    Arkiv->>Arkiv: 6. Atomically lock T_max tokens (prevents concurrent race)
    Enclave->>Enclave: 7. Unwrap keys, decrypt prompt & parse files in RAM
    Enclave->>AI: 8. Call AI API with hard cap T_max (Zero cutoff risk!)
    AI-->>Enclave: 9. Returns AI output & actual token usage (T_used)
    Enclave->>Enclave: 10. Encrypt output with Buyer K_return & sign 0G attestation
    Enclave->>Hedera: 11. Pay Seller R_seller (for T_used); retain Pi_app commission
    Enclave->>Hedera: 12. Submit audit receipt to HCS topic (0.0.591300)
    Enclave->>Arkiv: 13. Reconcile Seller quota (+ unused reservation)
    Enclave-->>Buyer: 14. Deliver sealed output (Buyer decrypts with local K_return)
```

---

## 6. Project Monorepo Structure

```text
Devcon/
├── apps/
│   └── buyer-cli-agent/
│       └── openclaw-agent.ts       # Autonomous OpenClaw / ZeroClaw Agent (0G Track)
├── packages/
│   └── shunya-core/
│       ├── src/
│       │   ├── tokenBoundsCatalog.ts    # Deterministic (Model, Thinking) -> T_min, T_max matrix
│       │   ├── blindCrypto.ts           # Server Enclave cryptographic unwrap & signing
│       │   ├── arkivQuotaManager.ts     # Arkiv Entity CRUD, T_max filtering & quota patching
│       │   ├── hederaX402Settlement.ts  # Zero-Solidity HTS Upfront Charge, Seller Payout & HCS Log
│       │   ├── fileParserEnclave.ts     # In-RAM PDF, Image, Code, CSV, ZIP extractor
│       │   ├── zeroGEnclave.ts          # 0G Compute attestation & Storage node client
│       │   ├── worldIdVerification.ts   # World ID Proof of Human verification service
│       │   ├── ensNamespace.ts          # ENS subname minter & resolver
│       │   ├── arcBridge.ts             # Circle CCTP cross-chain sweeper
│       │   └── index.ts
├── public/
│   └── anon-rpc/
│       └── sandbox.html                 # Sandboxed EF Anon-RPC iframe harness
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── arc/discovery/route.ts   # Arc Marketplace Discovery API endpoint
│   │   │   ├── blind-execute/route.ts   # HTTP 402 Gatekeeper + Enclave Execution + Payout Split
│   │   │   ├── bridge/cctp/route.ts     # Circle CCTP bridge initiation endpoint
│   │   │   ├── enclave-pubkey/route.ts  # 0G Sealed Enclave Public Key endpoint
│   │   │   └── listings/route.ts        # Arkiv Entities listing & creation endpoint
│   │   ├── bridge/page.tsx              # Arc Circle CCTP Payout Sweeper UI
│   │   ├── buyer/page.tsx               # Buyer Studio (Model, Thinking, Any-File Dropzone, x402)
│   │   ├── seller/page.tsx              # Seller Quota Hub (Key sealing, World ID, ENS, Arkiv)
│   │   ├── layout.tsx                   # Sleek dark Web3 layout with protocol network pills
│   │   └── page.tsx                     # Landing page with interactive architecture & orderbook
│   └── lib/
│       └── clientCrypto.ts              # Pure in-browser Web Crypto API (CROPS compliant)
├── scripts/
│   └── testFeasibility.ts               # 6 Feasibility Invariant Tests (FT-01 to FT-06)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. How to Run & Verify the Prototype

### Prerequisites
* Node.js v20+ or v22+
* npm v10+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run the Feasibility & Invariant Test Suite
Verifies all 6 mathematical, cryptographic, and concurrency invariants:
```bash
npm run test:feasibility
```
*Expected Output:*
```text
=======================================================================
   SHUNYAGRID FEASIBILITY & INVARIANT TEST SUITE (ETHGlobal 2026)      
=======================================================================

[FT-01] Testing Zero Mid-Way Cutoff Gate Invariant...
  ✔ [PASS] FT-01.1: 18,000 tokens rejected for medium thinking (T_max = 24192)
  ✔ [PASS] FT-01.2: Deterministic rejection reason matches token specification
  ✔ [PASS] FT-01.3: 18,000 tokens accepted for low thinking (T_max = 14048 <= 18,000)

[FT-02] Testing Max Charge, Actual Payout & Web App Commission Split...
  ✔ [PASS] FT-02.1: Buyer upfront charge for T_max (22,000) = $0.220000 USDC ($0.220000 expected)
  ✔ [PASS] FT-02.2: Seller payout for T_used (11,500) = $0.115000 USDC ($0.115000 expected)
  ✔ [PASS] FT-02.3: ShunyaGrid protocol commission = $0.105000 USDC ($0.105000 expected)
  ✔ [PASS] FT-02.4: Unused token reservation (22,000 - 11,500 = 10,500) returned to Seller quota

[FT-03] Testing Total Seller Blindness (Prompt, Files & Output Sealed)...
  ✔ [PASS] FT-03.1: Seller API key sealed to Enclave RSA-OAEP public key; plaintext masked
  ✔ [PASS] FT-03.2: Seller inspecting proxy stream sees only AES-256-GCM ciphertext blobs
  ✔ [PASS] FT-03.3: Enclave successfully unwraps prompt, file & Seller API key in isolated RAM
  ✔ [PASS] FT-03.4: AI output sealed with Buyer K_return and decrypted locally in Buyer browser

[FT-04] Testing Anon-RPC Read Anonymity & EF Privacy Compliance...
  ✔ [PASS] FT-04.1: EF @anon-rpc/browser-harness strips Buyer IP and headers from Web3 RPC queries

[FT-05] Testing Arkiv Time-Scoped Entity Expiry...
  ✔ [PASS] FT-05.1: Temporary file entity stored in Arkiv (Expires at block 19482300)
  ✔ [PASS] FT-05.2: After 250 blocks (> 10 mins), temporary encrypted file automatically pruned from Arkiv

[FT-06] Testing Concurrent Request Race Protection & Atomic Locks...
  ✔ [PASS] FT-06.1: Buyer A successfully locks 22,000 tokens (8,000 remaining)
  ✔ [PASS] FT-06.2: Buyer B atomically rejected (8,000 < 22,000 required), preventing mid-generation cutoff!
  ✔ [PASS] FT-06.3: Quota reconciled: 30,000 - 12,000 used = 18,000 available tokens returned to orderbook

=======================================================================
   FEASIBILITY TEST SUMMARY: 17 PASSED, 0 FAILED
=======================================================================
```

### Step 3: Run the Autonomous OpenClaw Buyer Agent (0G Track)
```bash
npm run agent:openclaw
```
Demonstrates an autonomous AI agent querying Arkiv, paying Hedera x402, executing blind inference inside 0G Enclave, and decrypting the result in memory!

### Step 4: Launch the Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Step-by-Step Web App User Walkthrough (For Hackathon Judges)

### Scenario A: Buyer Studio (Confidential Inference)
1. Go to **[http://localhost:3000/buyer](http://localhost:3000/buyer)**.
2. Click one of the quick scenario chips at the top:
   * Click **`🛡️ Smart Contract Audit`** to auto-load Claude 3.7 Sonnet (`medium` thinking) and a sample `VaultLending.sol` contract.
   * Or click **`📊 Financial CSV`** to test confidential tabular analysis on o3-mini.
3. Observe the **Deterministic Token Bounds** card live:
   * Notice $T_{\text{input\_cap}} = 10,000$, $T_{\text{thinking}} = 8,192$, $T_{\text{output\_cap}} = 6,000$, and Total $T_{\max} = 24,192$ tokens.
4. Notice the **Matched Arkiv Seller Node**:
   * Matched to `arjun-claude.shunyagrid.eth` with World ID Verified checkmark.
5. Notice the **Any-File Dropzone**:
   * Drag and drop any custom file (PDF, CSV, image, code). Files $\le 128$ KiB route to Arkiv; files $> 128$ KiB route to 0G Storage.
6. Click **`Encrypt & Run Blind Inference`**:
   * Watch the 4-phase execution progress: local AES-256-GCM encryption $\to$ Hedera x402 payment $\to$ 0G Sealed Enclave execution $\to$ local browser decryption.
7. Inspect the result:
   * Read the decrypted AI response and the unfolding reasoning trace.
   * Review the exact token accounting split ($T_{\max}$ reserved, $T_{\text{used}}$ consumed, refund returned, app commission).
   * Click the **HashScan Tx link** to inspect the settled Hedera consensus receipt!

### Scenario B: Seller Hub (Monetize Idle API Quotas)
1. Go to **[http://localhost:3000/seller](http://localhost:3000/seller)**.
2. Select your AI Provider (`Anthropic`, `OpenAI`, `Gemini`, `Groq`) and Model.
3. Paste an API key: observe the **Enclave Ciphertext Preview** appear immediately as your browser seals the key with 0G Enclave RSA-OAEP before submission.
4. Set token quota (e.g., `200,000` tokens) and rate per 1k tokens (e.g., `$0.010` USDC).
5. Click **`Verify with World ID`** to produce the cryptographic Proof of Human.
6. Enter an ENS subname label (e.g., `my-node`) and Hedera payout account (`0.0.xxxxx`).
7. Click **`Publish to Arkiv Orderbook (1-Hour Expiry)`**: your listing is published directly to Arkiv.

### Scenario C: Arc Circle CCTP Bridge Kit
1. Go to **[http://localhost:3000/bridge](http://localhost:3000/bridge)**.
2. Choose a destination EVM chain (`Arc Chain`, `Arbitrum`, `Base`, `Optimism`, `Ethereum`).
3. Enter amount of earned USDC and destination recipient address.
4. Click **`Sweep USDC to ARC`** to execute Circle CCTP cross-chain burn and mint.

---

## 9. 3-Minute Video Script Outline

* **0:00 – 0:30 (The Hook & Problem):**
  * Millions wasted in idle API tokens.
  * Show why traditional API proxies are dangerous: Sellers can steal confidential files and prompts.
  * Show the Mid-Generation Cutoff bug: High thinking levels burning tokens and aborting mid-way.
* **0:30 – 1:15 (The ShunyaGrid Solution):**
  * Open `/buyer`: Select Claude 3.7 Sonnet with `medium` thinking.
  * Show the deterministic token bounds: $T_{\max} = 24,192$ tokens calculated automatically.
  * Show the Arkiv Orderbook filtering out any seller with $< 24,192$ tokens (FT-01 Invariant).
  * Attach a confidential audit contract and click **Encrypt & Run Blind Inference**.
* **1:15 – 2:00 (On-Chain Execution & Settlement):**
  * Show the dual on-chain receipts on Buyer Studio: Ethereum Sepolia USDC payment and Hedera HCS consensus receipt.
  * Point to the economic math: Buyer charged for $T_{\max} = 24,192$, Seller paid for $T_{\text{used}} = 14,192$, ShunyaGrid retained the 10,000-token spread as app commission.
* **2:00 – 2:30 (Sponsor Integrations):**
  * Click the Hedera Tx ID and show the consensus timestamp and transfer on **HashScan**.
  * Show the 0G Enclave Attestation hash and the World ID verified badge.
  * Show Arc Studio and the Circle CCTP cross-chain payout sweeper on `/bridge`.
* **2:30 – 2:45 (Summary):**
  * Run `npm run test:feasibility` in the terminal: 17/17 invariant tests passing green.
  * "ShunyaGrid: The Blind, Zero-Cutoff AI API Token Exchange."

---

## 10. License & Acknowledgements

This project is licensed under the **MIT License**.

Built with pride for **ETHGlobal Mumbai 2026** at the Jio World Convention Centre, Mumbai.  
Special thanks to the developer advocacy teams at Ethereum Foundation, Hedera, Arkiv, 0G, Arc, World, and ENS.
