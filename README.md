# ShunyaGrid: Autonomous AI Compute & Settlement Protocol on HashKey Chain

**HashKey Chain Horizon** • **Native Chain ID: 133 (Testnet) / 177 (Mainnet)** • **Native Settlement Currency: HSK**

---

### Quick Links & Deployed Contracts
* **HSP Adapter Contract:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) (Bytecode active on Testnet Chain 133; see [Test Status](#7-test-status--known-limitations-verified-2026-11-02))
* **Settlement Router Contract:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) (Bytecode active on Testnet Chain 133)
* **Autonomous Agent CLI:** `npm run agent:hsk` (`apps/agent/openclaw-hsk-agent.ts`)
* **Live Web Application:** [http://localhost:3000](http://localhost:3000)

---

## 1. The Problem: What Are We Solving?

As artificial intelligence evolves, autonomous software agents and developers need to purchase AI reasoning compute on demand. However, traditional payment systems and ordinary API proxies fail when applied to AI reasoning models:

```
  TRADITIONAL AI PROXIES & ESCROWS             SHUNYAGRID ON HASHKEY CHAIN
 ───────────────────────────────────          ───────────────────────────────
 • Prompts crash when quota runs out          • Zero-cutoff token ceiling (T_max)
 • Sellers can read your private code         • In-browser encryption (Client-side AES-256)
 • Fixed pricing: no refund for unused tokens • Exact pay-per-token + auto-refund
 • Requires manual credit cards & logins      • Autonomous agent EIP-712 HSP mandates
```

### 1. The "Mid-Way Crash" (Token Exhaustion Hazard)
Modern reasoning models (such as Claude 3.7 Sonnet or OpenAI o3-mini) generate invisible "thinking tokens" to solve complex problems before delivering their final answer. 
* **The issue:** A seller lists an API key with only 5,000 tokens remaining. A buyer submits a prompt that needs 15,000 thinking tokens.
* **The disaster:** The request crashes halfway through. The seller's tokens are wasted, the buyer's money is lost, and the buyer receives an empty error message.

### 2. Inflexible "All-or-Nothing" Escrows
Traditional Web3 escrows lock a flat, fixed deposit upfront. If you deposit $5.00 for a prompt, but the model answers quickly and uses only $0.50 worth of tokens, standard escrows either take the entire $5.00 or require a centralized server to calculate and manually refund your change.

### 3. Privacy Leaks & Code Surveillance
When developers send confidential data—such as proprietary Solidity smart contracts for security audits, private financial CSV spreadsheets, or internal trade secrets—through standard third-party proxies, the proxy owner can read, log, and steal that data.

### 4. Wasted, Expiring API Subscriptions
Developers and companies regularly pay for monthly API subscriptions where unused token quotas expire at the end of each billing cycle. There has been no secure, decentralized way to sell this excess quota without exposing your private API keys.

---

## 2. How It Works: A Concise Explanation of Our Approach

ShunyaGrid solves these problems with three straightforward guarantees:

### 1. The Zero-Cutoff Gate (Deterministic Token Ceiling)
Before any prompt is sent, ShunyaGrid calculates the worst-case maximum token ceiling ($T_{\max}$):

$$\text{Token Ceiling } (T_{\max}) = \text{Input \& Files} + \text{Thinking Budget} + \text{Maximum Output}$$

* The network **only** routes your prompt to a seller node that has at least $T_{\max}$ verified tokens available (`packages/shunya-core/src/tokenBoundsCatalog.ts`).
* If a seller only has 5,000 tokens left, your 15,000-token prompt is never dispatched to them. **Your prompts will never crash halfway through.**

### 2. In-Browser Confidential Encryption (Ephemeral Memory Processing)
* **Your Prompt & Files:** Encrypted directly in your browser using AES-256-GCM before leaving your device (`packages/shunya-core/src/blindCrypto.ts`).
* **The Seller's API Key:** Sealed in the seller's browser using RSA-OAEP public-key encryption. The buyer never sees the raw key (`packages/shunya-core/src/blindCrypto.ts`).
* **The Output:** Decrypted and executed strictly inside temporary server process memory (RAM, with zero disk writes for prompt plaintext) before dispatch to the provider API, and re-encrypted with your personal return key. Only you can read the answer.

### 3. The Payment Model (Pay-Per-Token + Auto-Refund)
* You deposit the maximum estimate ($T_{\max}$) upfront into the Protocol Escrow contract (`contracts/HSPAdapter.sol`) or Treasury account.
* When the AI finishes, we count the exact tokens consumed ($T_{\text{used}}$).
* The seller is paid **only** for $T_{\text{used}}$.

$$\text{Upfront Deposit} = \text{Seller Payout } (T_{\text{used}}) + \text{Protocol Fee} + \text{Buyer Refund } (T_{\max} - T_{\text{used}})$$

---

### The Complete Payment Flow: Buyer $\to$ Treasury $\to$ Seller

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE COMPLETE PAYMENT PIPELINE                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [ 1. BUYER WALLET ]                                                                            │
│       • Connects wallet (pays in native HSK on HashKey Chain or multi-chain assets)              │
│       • Approves upfront deposit for the maximum token ceiling (T_max)                           │
│                                      │                                                           │
│                                      ▼                                                           │
│   [ 2. PROTOCOL TREASURY & ESCROW CONTRACT (HSPAdapter.sol) ]                                    │
│       • Funds are securely locked in the Escrow/Treasury on HashKey Chain                        │
│       • Concurrently, the seller's quota on the orderbook is locked to prevent double-booking    │
│                                      │                                                           │
│                                      ▼                                                           │
│   [ 3. SECURE AI EXECUTION IN MEMORY ]                                                           │
│       • AI model executes via provider API from isolated RAM with zero plaintext disk writes    │
│       • Exact tokens used (T_used) are measured and signed via ECDSA attestation receipts       │
│                                      │                                                           │
│                                      ▼                                                           │
│   [ 4. ATOMIC TREASURY SETTLEMENT SPLIT ]                                                        │
│       • Seller Earnings: Exact HSK for T_used credited to Seller's Treasury balance              │
│       • Protocol Commission: Small routing fee retained by Treasury                              │
│       • Buyer Auto-Refund: All unused HSK (T_max - T_used) sent straight back to Buyer's wallet  │
│                                      │                                                           │
│                                      ▼                                                           │
│   [ 5. SELLER SWEEP TO PERSONAL WALLET ]                                                         │
│       • Seller visits Seller Hub / Payout Center and clicks "Sweep Funds"                        │
│       • Treasury broadcasts transaction to deliver earned HSK directly to Seller's wallet        │
│       • Seller's live Treasury balance updates instantly                                         │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Step-by-Step Walkthrough:
1. **Upfront Deposit (Buyer $\to$ Escrow/Treasury):** The buyer deposits the required $T_{\max}$ in native HSK into the **Protocol Escrow Contract (`HSPAdapter.sol`)** or Treasury account on HashKey Chain. This protects the seller by guaranteeing that funds are already locked in escrow before burning API credits.
2. **Atomic Quota Reservation:** The seller's token quota on the orderbook is locked via an in-memory mutex (`AsyncMutex` in `packages/shunya-core/src/arkivQuotaManager.ts`) so that concurrent buyers cannot double-book quota.
3. **Private In-Memory Execution:** The prompt executes from isolated process memory without disk logging (`packages/shunya-core/src/blindCrypto.ts`). The actual tokens consumed ($T_{\text{used}}$) are recorded from provider usage and signed with an ECDSA attestation receipt (`packages/shunya-core/src/zeroGEnclave.ts`).
4. **Dynamic Settlement Split in Treasury:** 
   - **Seller Payout:** Exact HSK for the tokens consumed ($T_{\text{used}}$) is credited to the seller's account in the Treasury:
     $$\text{Seller Payout (HSK)} = \left(\frac{T_{\text{used}}}{1000}\right) \times \text{Price Rate}$$
   - **Quota Restored:** Any unused token quota is restored to the seller's active orderbook balance.
5. **Seller Sweeps to Personal Wallet (Treasury $\to$ Seller Wallet):** The seller's settled HSK balance is tracked in the Treasury engine (`packages/shunya-core/src/hashkeyTreasury.ts`). When the seller clicks **"Sweep Funds"** in the Seller Hub or Payout Center, the Treasury broadcasts an on-chain transaction delivering the requested HSK (or multi-chain asset) directly to the seller's personal wallet, deducting the swept amount from their ledger balance.

---

### Handling Edge Cases: What Happens When Things Go Wrong?

```
┌──────────────────────────────────────├──────────────────────────────────────────────────────────────┐
│ Edge Case Scenario                   │ How ShunyaGrid Handles It                                    │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 1. Treasury lacks funds for sweeping │ Pre-flight liquidity check aborts sweep BEFORE deducting HSK;│
│                                      │ Seller balance remains 100% safe and intact.                 │
│ 2. Seller API key rejects the call   │ Automated Saga compensation triggers: seller quota released; │
│                                      │ Buyer receives 100% immediate full refund.                   │
│ 3. Two buyers request same quota     │ Atomic Mutex Token Lock rejects 2nd request with HTTP 409    │
│    at the exact same millisecond     │ or reroutes to another solvent node; zero race conditions.   │
│ 4. Encrypted payload is corrupted    │ Envelope unwrap fails safely; halts before calling AI API;   │
│                                      │ Quota unlocked and buyer receives 100% refund.               │
│ 5. Buyer underpays upfront deposit   │ Payment verifier detects deficit; returns HTTP 402;          │
│                                      │ No prompt is sent and no seller tokens are burned.           │
│ 6. Blockchain RPC node lags/drops    │ Automatic multi-RPC failover with block propagation guard;   │
│                                      │ Retries across backup RPCs before confirming transactions.   │
│ 7. Seller tries to sweep 0 balance   │ Live balance validation disables sweep action with clear     │
│                                      │ guidance, preventing wasted gas fees.                        │
└──────────────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

* **What happens when the Treasury does not have enough funds or gas for sweeping?**
  The Treasury engine performs an automated **Pre-Flight Liquidity & Gas Check** before processing any sweep. If the Treasury wallet on the target chain lacks the requested tokens or native gas, **the sweep is safely rejected before the seller's HSK is deducted**. The seller receives an informative notice, and their funds remain 100% secure in the Treasury.
* **What happens when the Seller API call rejects or fails?**
  If the seller's API key is revoked, rate-limited, expired, or the AI provider (Anthropic, OpenAI, or Google) suffers an outage, the system triggers an automated **Saga Compensation Workflow**: the seller's locked quota is instantly released back to the orderbook, and the buyer's upfront deposit is **100% refunded** immediately to their wallet. The buyer never loses money on an unfulfilled prompt.
* **What happens if two buyers book the same quota simultaneously?**
  The orderbook uses an **Atomic Mutex Token Lock** (`AsyncMutex`). The first request claims the tokens, and the second simultaneous request is safely rejected with `HTTP 409 Conflict` (or auto-routed to the next solvent node). No double-spending or overselling occurs.

---

## 3. Key Features: What Can Users Do With It?

### 1. Buyer Studio (`/buyer`)
* **AI Playground & Studio:** Chat with frontier reasoning models including Claude 3.7 Sonnet, OpenAI o3-mini, Gemini 2.0 Flash Thinking, and Meta LLaMA 3.3.
* **Encrypted File Dropzone:** Drag and drop Solidity smart contracts (`.sol`), code audits, financial CSVs, and PDFs. Files are parsed and encrypted client-side in your browser before upload.
* **Real-Time Token & Price Estimator:** Automatically displays $T_{\max}$, estimated thinking tokens, and live quotes in both HSK and USD.
* **One-Click HashKey Chain Setup:** Automatically configures and switches your MetaMask or Web3 wallet to HashKey Chain Testnet (Chain ID `133`).
* **Transparent Token Usage Receipts:** Shows you the exact breakdown after every answer: tokens reserved, tokens consumed, tokens refunded, and the on-chain transaction hash.

### 2. Seller Hub (`/seller`)
* **Safe Quota Monetization:** Earn HSK by listing unused API quotas without ever revealing or sharing your private API keys.
* **Custom Pricing & Limits:** Choose which models to offer, set your price per 1,000 tokens, and limit the maximum quota you want to sell.
* **Live Node Dashboard:** Monitor your active listings, locked tokens, available quota, and completed request history.
* **One-Click Earnings Sweep:** Withdraw your accumulated HSK earnings from the Treasury directly into your personal wallet at any time.

### 3. Model Orderbook & Marketplace (`/marketplace`)
* **Live Compute Directory:** Real-time transparent view of all active compute seller nodes on HashKey Chain.
* **Node Telemetry:** Inspect verified token balances, latency benchmarks, supported reasoning tiers, and pricing.

### 4. Seller Payout & Sweep Center (`/payout`)
* **Live Balance Inquiry:** Query your on-chain HSK balance and lifetime settled earnings directly from the HashKey Treasury contract.
* **Multi-Chain Sweeping:** Withdraw your funds directly in native HSK on HashKey Chain or route payouts cross-chain to Ethereum Sepolia, Arbitrum Sepolia, or Base Sepolia.
* **Full Audit Ledger:** Complete history of every settlement and sweep with direct links to HashKey Blockscout explorer.

### 5. Autonomous AI Buyer Agent (OpenClaw CLI)
* **Autonomous Headless Client:** A CLI agent (`npm run agent:hsk` via `apps/agent/openclaw-hsk-agent.ts`) designed for AI-to-AI (A2A) commerce.
* **No Human Clicks Needed:** Discovers model listings on the orderbook, signs EIP-712 payment mandates, broadcasts mandate locks to `HSPAdapter.sol` on HashKey Chain, runs local/remote inference, and triggers on-chain settlement autonomously. (Note: gas is paid directly by the agent wallet; see `contracts/HSPAdapter.sol:196`).

### 6. Privacy-Preserving RPC Routing
* Integrated sandboxed worker (`@anon-rpc` via `scripts/copyAnonRpc.ts`) that strips user IP addresses and tracking metadata before sending queries to blockchain RPC nodes.

### 7. Anti-Spam Human Verification & ENS Subnames
* World ID integration (`packages/shunya-core/src/worldIdVerification.ts`) supporting zero-knowledge proof verification (with local deterministic fallback for testing), plus human-readable ENS subnames (e.g. `node-1.shunyagrid.eth`) mapped to seller payout addresses in the registry (`packages/shunya-core/src/ensNamespace.ts`). Authentic `.eth` domains resolve via on-chain Ethereum mainnet RPC (`packages/shunya-core/src/realEnsService.ts`).

---

## 4. Tech Stack: Tools, APIs, and Frameworks Used

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SHUNYAGRID TECH STACK                                   │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Category                     │ Technologies & Libraries                                   │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Blockchain & Smart Contracts │ • HashKey Chain Testnet (Chain ID 133) & Mainnet (177)     │
│                              │ • Solidity 0.8.20 (HSPAdapter.sol, HashKeySettlementRouter.sol) │
│                              │ • Ethers.js v6 & EIP-712 Typed Data Signatures             │
│                              │ • Custom nonReentrant Guard & Minimalist IERC20 Interface  │
│                              │ • HashKey Settlement Protocol (HSP) standard               │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Frontend & User Interface    │ • Next.js 14 (App Router, Server Actions, Route Handlers)  │
│                              │ • React 18, TypeScript, Tailwind CSS                       │
│                              │ • Lucide Icons, GSAP Smooth Animations, Spatial Card UI    │
│                              │ • TanStack React Query v5                                  │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Confidential Computing &     │ • Web Crypto API & Node.js Crypto (AES-256-GCM + RSA-OAEP) │
│ Security                     │ • In-RAM Ephemeral Processing (Zero Plaintext Disk Writes) │
│                              │ • EF CROPS (Client-Run, Open-Source, Private) architecture │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Autonomous AI Engine         │ • OpenClaw CLI Agent (apps/agent/openclaw-hsk-agent.ts)    │
│                              │ • Anthropic API (Claude 3.7 Sonnet)                        │
│                              │ • OpenAI API (o3-mini)                                     │
│                              │ • Google Gemini API (Gemini 2.0 Flash Thinking)            │
│                              │ • Meta LLaMA 3.3 70B (via Groq Engine)                     │
│                              │ • In-memory file extraction (pdf-parse, papaparse)         │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Cross-Chain & Identity       │ • Chainlink CCIP Selector (7613811247471741961)            │
│                              │ • Uniswap v3 Quoter & Multi-Asset DEX Oracle Feeds         │
│                              │ • World ID ZK Proof of Personhood (with Local Mock Option) │
│                              │ • ENS Subnames (Off-Chain Catalog) & Real ENS Resolution   │
└──────────────────────────────┴────────────────────────────────────────────────────────────┘
```

---

## 5. Hackathon Requirements: Alignment with HashKey Chain Horizon

ShunyaGrid was architected specifically for the **HashKey Chain Horizon** Hackathon. Here is how our project satisfies and exceeds the hackathon guidelines:

### 1. Native HashKey Chain Deployment & Economic Utility
* **Deployed Contracts on HashKey Chain:** Core protocol smart contracts have bytecode deployed on **HashKey Chain Testnet (Chain ID 133)**:
  * **`HSPAdapter.sol`:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) (Bytecode active on Chain 133; source code unverified on explorer)
  * **`HashKeySettlementRouter.sol`:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) (Bytecode active on Chain 133; source code unverified on explorer)
  * **`Deployer / Operator (owner)`:** [`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`](https://testnet-explorer.hskchain.net/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) (Public Hardhat dev account #0; holds contract ownership for testnet demo)
* **Native HSK Utility:** Native **HSK** serves as the primary currency for all AI inference reservations, escrow deposits, protocol commissions, and seller earnings.
* **HashKey Ecosystem Token Constants:** Token address references configured in `contracts/HSPAdapter.sol` (note: these addresses return `0x` bytecode on Testnet Chain 133; active testing uses native HSK):
  * HashKey USDC: `0x054ed45810DbBAb8B27668922D110669c9D88D0a`
  * HashKey USDT: `0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029`
  * Wrapped HSK (WHSK): `0xB210D2120d57b758EE163cFfb43e73728c471Cf1`

### 2. Implementation of HashKey Settlement Protocol (HSP) Standards
* **Official HSP Compliance:** Fully implements the **HashKey Settlement Protocol (HSP)** standard outlined in the [HashKey Merchant Documentation](https://hashkey-merchant.github.io/#/).
* **EIP-712 Mandates:** Autonomous buyer agents sign structured `HSPPaymentMandate` typed data, allowing headless programmatic authorization without browser wallet popups. (`lockHSPMandateWithSignature` verifies `recovered == msg.sender` per `contracts/HSPAdapter.sol:196`, so the agent submits and pays gas for the locking transaction).
* **Standardized Event Emissions:** Emits standard `HSPMessageEmitted`, `HSPMandateCreated`, and `HSPSettlementExecuted` events indexed by merchant and block explorer indexers.

---

## 6. Quickstart & Verification Guide

### Prerequisites
* **Node.js:** `v18+` or `v20+`
* **Package Manager:** `npm`
* **Web3 Wallet:** MetaMask (configured for HashKey Chain Testnet)

### Installation
```bash
git clone https://github.com/kanakagarwal0901/HashKey-Chain-Horizon.git
cd HashKey-Chain-Horizon
npm install --legacy-peer-deps
```

### 1. Launch the Interactive Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Connect Wallet:** Click connect for automatic, one-click network addition of **HashKey Chain Testnet** (Chain ID `133`).
* **Buyer Studio (`/buyer`):** Select an AI reasoning model, upload a Solidity file or document, and run private inference.
* **Seller Hub (`/seller`):** Safely seal an API key, set your price and quota, and list it on the orderbook.
* **Orderbook (`/marketplace`):** View all active compute nodes and real-time quotas on HashKey Chain.
* **Payout Center (`/payout`):** Check your Treasury balance and sweep earnings to your wallet.

### 2. Run the Feasibility & Invariant Tests
Verifies the zero mid-way cutoff gate, mathematical token splits, and cryptographic sealing (offline / unit test; does not require gas funds):
```bash
npm run test:feasibility
```

### 3. Run the Autonomous AI Agent CLI
Runs the machine-to-machine lifecycle on HashKey Chain Testnet (`apps/agent/openclaw-hsk-agent.ts`):
```bash
npm run agent:hsk
```
*(Requires a funded testnet key via `BUYER_AGENT_PRIVATE_KEY`; see [Section 7](#7-test-status--known-limitations-verified-2026-11-02)).*

### 4. Run the HSP Smart Contract Settlement Test
Verifies EIP-712 mandate signing, contract lock in `HSPAdapter.sol`, and owner-authorized settlement on HashKey Testnet (`scripts/testHashKeyHspSettlement.ts`):
```bash
npm run test:hsp
```
*(Requires a funded testnet key via `HASHKEY_DEPLOYER_PRIVATE_KEY`; see [Section 7](#7-test-status--known-limitations-verified-2026-11-02)).*

### 5. Run the HashKey Payment Flow & Treasury Test
Tests the treasury engine, live oracle rates, and multi-chain sweep mechanics (`scripts/testHashKeyPaymentFlow.ts`):
```bash
npm run test:hashkey
```

### 6. Run the Live Gemini Flash Execution Test
Broadcasts a live agentic payment and executes real upstream inference via the `/api/blind-execute` route (`scripts/testLiveGeminiFlashExecution.ts`):
```bash
npx tsx scripts/testLiveGeminiFlashExecution.ts
```
*(Requires a local dev server running with an active Gemini listing, plus a funded testnet key; see [Section 7](#7-test-status--known-limitations-verified-2026-11-02)).*

---

## 7. Test Status & Known Limitations (verified 2026-11-02)

Every test script and smart contract was fact-checked against the codebase and the live HashKey Chain Testnet (Chain ID `133`, RPC: `https://testnet.hsk.xyz`) on 2026-11-02. Below is the verified status of the four A2A test commands and protocol limitations.

### A2A Test Suite Status Table

| Command | Test File | Result (2026-11-02) | Root Cause & Diagnostic Detail |
| :--- | :--- | :--- | :--- |
| `npm run test:hsp` | `scripts/testHashKeyHspSettlement.ts` | **Fails** (`EVM error: OutOfFunds`) | The script defaults to the public Hardhat dev account #0 (`0xf39Fd6...`, published in `.env.example`). This address holds only ~0.000021 HSK (drained by public sweeper bots; nonce 770) and cannot pay the 0.01 HSK upfront deposit + gas. Additionally, `settleHSPMandate` requires `onlyOwner` (`0xf39Fd6...`). Fails until a funded private key is supplied via `HASHKEY_DEPLOYER_PRIVATE_KEY`. |
| `npm run agent:hsk` | `apps/agent/openclaw-hsk-agent.ts` | **Fails** (`EVM error: OutOfFunds`) | Defaults to the public Hardhat dev account #0 (`0xf39Fd6...`), which lacks the 0.015 HSK upfront deposit + gas required for `lockMandateWithSignature`. Fails until a funded private key is supplied via `BUYER_AGENT_PRIVATE_KEY`. |
| `npx tsx scripts/testLiveGeminiFlashExecution.ts` | `scripts/testLiveGeminiFlashExecution.ts` | **Fails** (`EVM error: OutOfFunds`) | Defaults to the public Hardhat dev account #0 (`0xf39Fd6...`), lacking funds to broadcast the required HSK transfer to the Treasury EOA (12.69 HSK for the 12,000-token T_max against the `pratah-4c4a` Gemini Flash listing at the live rate). (Also requires the Next.js dev server running on `http://localhost:3000` with an active Gemini Flash listing). |
| `npm run test:hashkey` | `scripts/testHashKeyPaymentFlow.ts` | **Fails Assertion** (`PAYOUT-02`) | The script broadcasts a real on-chain HSK payout from Treasury EOA `0x9b3b...2625` (which holds ~2.315 HSK on testnet). However, it fails assertion `PAYOUT-02` (`scripts/testHashKeyPaymentFlow.ts:77-83`) because the test hardcodes an expected rate of `$0.75 / HSK`, whereas `packages/shunya-core/src/hashkeyTreasury.ts:93` computes payouts using the live oracle rate (`~$0.0894 / HSK`). |

### Verified Protocol Limitations & Security Findings

1. **Public Contract Ownership (Testnet / Demo Deployment Only):**
   `HSPAdapter` deployed at `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` has its `owner()` set to `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (the standard Hardhat dev account #0, published in `.env.example`). Because `settleHSPMandate` is protected by `onlyOwner` (`contracts/HSPAdapter.sol:289`), any actor with access to the public key can call `settleHSPMandate` and redirect settlements. **This deployment is strictly for hackathon testing and demo purposes; the contract must be redeployed with a private, secure owner key prior to any real-world usage.**
2. **Account Balance & Sweeper Bot Drainage:**
   Public Hardhat account `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` currently holds ~0.000021 HSK (nonce 770) due to automated sweeper bots active on public testnets. Scripts relying on default credentials will fail with `EVM error: OutOfFunds`.
3. **EIP-712 Mandate Gas Requirements:**
   `lockHSPMandateWithSignature` requires `recovered == msg.sender` (`contracts/HSPAdapter.sol:196`). The buyer agent must submit its own transaction and pay native HSK gas; the EIP-712 signature authorizes the mandate terms on-chain but does not enable gasless or relayed meta-transactions.
4. **Dual Payment Rails (Contract Escrow vs. Treasury Transfer):**
   - The HSP smart contract rail (`apps/agent/openclaw-hsk-agent.ts`, `scripts/testHashKeyHspSettlement.ts`) locks funds into `HSPAdapter.sol` and enforces mathematical value conservation on-chain (`sellerPayout + protocolFee + buyerRefund == maxDeposit`).
   - The web app direct rail (`scripts/testLiveGeminiFlashExecution.ts`, `src/app/api/blind-execute/route.ts`) sends native HSK directly to the Treasury EOA (`0x9b3b...2625`). In this path, token accounting, quota reconciliation, and refunds are calculated and broadcast off-chain by `BuyerRefundEngine` (`packages/shunya-core/src/buyerRefundEngine.ts`).
5. **Hardcoded Treasury Credentials & Environment Mismatch:**
   - A treasury private key is hardcoded as a fallback in source files (`packages/shunya-core/src/hashkeyTreasury.ts` and `buyerRefundEngine.ts`). In production, this credential must be moved exclusively to environment variables and rotated.
   - `.env.example` lists `SHUNYA_TREASURY_PRIVATE_KEY` set to Hardhat dev key #0 (address `0xf39Fd6...`), which does not correspond to `NEXT_PUBLIC_SHUNYA_TREASURY_EVM_ADDRESS` (`0x9b3b...2625`).
6. **Token Standards on Testnet:**
   The ecosystem token addresses for HashKey USDC (`0x054ed458...`), USDT (`0xF1B50e...`), and Wrapped HSK (`0xB210D2...`) are declared in `contracts/HSPAdapter.sol:37-40` as *mainnet* reference constants. They have no contract code on Testnet Chain 133 (`eth_getCode` returns `0x`). All active testnet settlement flows use native HSK.
7. **Confidential Computing Architecture:**
   Payloads are encrypted in-browser or client RAM using AES-256-GCM and RSA-OAEP (`packages/shunya-core/src/blindCrypto.ts`). Decryption occurs in server memory (RAM) with zero plaintext writes to disk. However, this is an application-level in-RAM process, not a hardware-attested Trusted Execution Environment (TEE like Intel SGX or AWS Nitro Enclaves), and upstream model inference requires transmitting decrypted prompt tokens over TLS to third-party provider APIs (Anthropic, OpenAI, Google, Groq). Attestation receipts are ECDSA secp256k1 signatures generated by an in-memory service wallet (`packages/shunya-core/src/zeroGEnclave.ts`).

### How to Run with Your Own Funded Key

To execute the live on-chain test scripts, configure your environment with a funded HashKey Chain Testnet account:

```bash
# 1. Export your funded private key (do NOT use the public Hardhat key)
export BUYER_AGENT_PRIVATE_KEY="0x<your_funded_testnet_private_key>"
export HASHKEY_DEPLOYER_PRIVATE_KEY="0x<your_funded_testnet_private_key>"
export HASHKEY_TESTNET_RPC="https://testnet.hsk.xyz"

# 2. Run the HSP smart contract settlement test
#    Note: the lock step works with any funded key, but settleHSPMandate is onlyOwner.
#    Against the deployed adapter (owner 0xf39F...) settlement only succeeds with the
#    owner key; otherwise redeploy HSPAdapter with your own key (npm run contracts:deploy).
npm run test:hsp

# 3. Run the autonomous buyer agent CLI
npm run agent:hsk

# 4. Run the offline feasibility & invariant test suite (does not require funds)
npm run test:feasibility
```

---

## 8. License

This project is open-source software licensed under the MIT License (a `LICENSE` file has not been added to the repository yet).  
Built with pride for the **HashKey Chain Horizon** Hackathon.
