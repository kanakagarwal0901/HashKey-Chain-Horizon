# ShunyaGrid: Autonomous AI Compute & Settlement Protocol on HashKey Chain

**HashKey Chain Horizon** • **Native Chain ID: 133 (Testnet) / 177 (Mainnet)** • **Native Settlement Currency: HSK**

---

### Quick Links & Verified Contracts
* **HSP Adapter Contract:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)
* **Settlement Router Contract:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D)
* **Autonomous Agent CLI:** `npm run agent:hsk`
* **Live Web Application:** [http://localhost:3000](http://localhost:3000)

---

## 1. The Problem: What Are We Solving?

As artificial intelligence evolves, autonomous software agents and developers need to purchase AI reasoning compute on demand. However, traditional payment systems and ordinary API proxies fail when applied to AI reasoning models:

```
  TRADITIONAL AI PROXIES & ESCROWS             SHUNYAGRID ON HASHKEY CHAIN
 ───────────────────────────────────          ───────────────────────────────
 • Prompts crash when quota runs out          • Zero-cutoff token ceiling (T_max)
 • Sellers can read your private code         • In-browser encryption (Client-side AES-256)
 • Fixed pricing: no refund for unused tokens • Exact pay-per-token + instant auto-refund
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

* The network **only** routes your prompt to a seller node that has at least $T_{\max}$ verified tokens available.
* If a seller only has 5,000 tokens left, your 15,000-token prompt is never dispatched to them. **Your prompts will never crash halfway through.**

### 2. Total Privacy with In-Browser Encryption (Zero Plaintext)
* **Your Prompt & Files:** Encrypted directly in your browser using AES-256-GCM before leaving your device.
* **The Seller's API Key:** Encrypted in the seller's browser using RSA-OAEP public-key encryption. The buyer never sees the key.
* **The Output:** Decrypted and executed strictly inside temporary, isolated memory (RAM), and re-encrypted with your personal return key. Only you can read the answer.

### 3. The Payment Model (Pay-Per-Token + Auto-Refund)
* You deposit the maximum estimate ($T_{\max}$) upfront into the Protocol Treasury.
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
│       • Funds are securely locked in the Treasury on HashKey Chain                               │
│       • Concurrently, the seller's quota on the orderbook is locked to prevent double-booking    │
│                                      │                                                           │
│                                      ▼                                                           │
│   [ 3. SECURE AI EXECUTION IN MEMORY ]                                                           │
│       • AI model runs the prompt in isolated RAM with zero plaintext exposure                    │
│       • Exact tokens used (T_used) are measured and cryptographically verified                   │
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
1. **Upfront Deposit (Buyer $\to$ Treasury):** The buyer deposits the required $T_{\max}$ in native HSK into the **Protocol Treasury (`HSPAdapter.sol`)** on HashKey Chain. This protects the seller by guaranteeing that the money is already locked in escrow before burning API credits.
2. **Atomic Quota Reservation:** The seller's token quota on the orderbook is locked at the same millisecond so that no other buyer can claim it.
3. **Private In-Memory Execution:** The prompt executes in isolated memory. The actual tokens consumed ($T_{\text{used}}$) are counted and signed cryptographically.
4. **Dynamic Settlement Split in Treasury:** 
   - **Seller Payout:** Exact HSK for the tokens consumed ($T_{\text{used}}$) is credited to the seller's account in the Treasury:
     $$\text{Seller Payout (HSK)} = \left(\frac{T_{\text{used}}}{1000}\right) \times \text{Price Rate}$$
   - **Quota Restored:** Any unused token quota is restored to the seller's active orderbook balance.
5. **Seller Sweeps to Personal Wallet (Treasury $\to$ Seller Wallet):** The seller's accumulated HSK sits safely in his account. When the seller clicks **"Sweep Funds"** in the Seller Hub or Payout Center, the Treasury broadcasts an on-chain transfer delivering the Broadcasted token directly to the seller's personal wallet, and taking away the sweeped amount of HSK back to treasury, updates their balance in real time.

---

### Handling Edge Cases: What Happens When Things Go Wrong?

```
┌──────────────────────────────────────┬──────────────────────────────────────────────────────────────┐
│ Edge Case Scenario                   │ How ShunyaGrid Handles It                                    │
├──────────────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 1. Treasury lacks funds for sweeping │ Pre-flight liquidity check aborts sweep BEFORE deducting HSK;│
│                                      │ Seller balance remains 100% safe and intact.                 │
│ 2. Seller API key rejects the call   │ Automated Saga compensation triggers: seller quota released; │
│                                      │ Buyer receives 100% immediate full refund.                   │
│ 3. Two buyers request same quota     │ Atomic Mutex Token Lock rejects 2nd request with HTTP 409    │
│    at the exact same millisecond     │ or reroutes to another solvent node; zero race conditions.   │
│ 4. Encrypted payload is corrupted    │ Enclave unwrap fails safely; halts before calling AI API;     │
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
  The orderbook uses an **Atomic Mutex Token Lock**. The first request claims the tokens, and the second simultaneous request is safely rejected with `HTTP 409 Conflict` (or auto-routed to the next solvent node). No double-spending or overselling occurs.

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
* **100% Autonomous Headless Client:** A CLI agent (`npm run agent:hsk`) designed for AI-to-AI (A2A) commerce.
* **No Human Clicks Needed:** Discovers model listings on the orderbook, signs EIP-712 payment mandates, locks deposits on HashKey Chain, submits sealed prompts, and handles settlements autonomously.

### 6. Privacy-Preserving RPC Routing
* Integrated sandboxed worker that strips user IP addresses and tracking metadata before sending queries to blockchain RPC nodes.

### 7. Anti-Spam Human Verification & ENS Subnames
* World ID integration to prevent bot farms from spamming the orderbook, plus human-readable ENS subnames (e.g. `node-1.shunyagrid.eth`) mapped to seller payout addresses.

---

## 4. Tech Stack: Tools, APIs, and Frameworks Used

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SHUNYAGRID TECH STACK                                   │
├──────────────────────────────┬────────────────────────────────────────────────────────────┤
│ Category                     │ Technologies & Libraries                                   │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Blockchain & Smart Contracts │ • HashKey Chain Testnet (Chain ID 133) & Mainnet (177)     │
│                              │ • Solidity 0.8.20 (Custom HSPAdapter.sol, Router.sol)      │
│                              │ • Ethers.js v6 & EIP-712 Typed Data Signatures             │
│                              │ • OpenZeppelin ReentrancyGuard & SafeERC20                 │
│                              │ • HashKey Settlement Protocol (HSP) standard               │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Frontend & User Interface    │ • Next.js 14 (App Router, Server Actions, Route Handlers)  │
│                              │ • React 18, TypeScript, Tailwind CSS                       │
│                              │ • Lucide Icons, GSAP Smooth Animations, Spatial Card UI    │
│                              │ • TanStack React Query v5                                  │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Confidential Computing &     │ • Web Crypto API (SubtleCrypto: AES-256-GCM + RSA-OAEP)    │
│ Security                     │ • In-RAM Enclave Execution (Zero Plaintext Disk Writes)    │
│                              │ • EF CROPS (Client-Run, Open-Source, Private) architecture │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Autonomous AI Engine         │ • OpenClaw CLI Autonomous Agent (apps/agent/openclaw...)   │
│                              │ • Anthropic API (Claude 3.7 Sonnet)                        │
│                              │ • OpenAI API (o3-mini)                                     │
│                              │ • Google Gemini API (Gemini 2.0 Flash Thinking)            │
│                              │ • Meta LLaMA 3.3 70B (via Groq Engine)                     │
│                              │ • In-memory file extraction (pdf-parse, papaparse)         │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Cross-Chain & Identity       │ • Chainlink CCIP Selector (7613811247471741961)            │
│                              │ • Uniswap v3 Multi-Asset Oracle Feeds                      │
│                              │ • World ID ZK Proof of Personhood                          │
│                              │ • ENS Subname Resolution (node-*.shunyagrid.eth)           │
└──────────────────────────────┴────────────────────────────────────────────────────────────┘
```

---

## 5. Hackathon Requirements: Alignment with HashKey Chain Horizon

ShunyaGrid was architected specifically for the **HashKey Chain Horizon** Hackathon. Here is how our project satisfies and exceeds the hackathon guidelines:

### 1. Native HashKey Chain Deployment & Economic Utility
* **Live Contracts on HashKey Chain:** Core protocol smart contracts are deployed and verified on **HashKey Chain Testnet (Chain ID 133)**:
  * **`HSPAdapter.sol`:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)
  * **`HashKeySettlementRouter.sol`:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D)
  * **`Deployer / Operator`:** [`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`](https://testnet-explorer.hskchain.net/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
* **Native HSK Utility:** Native **HSK** serves as the primary currency for all AI inference reservations, escrow deposits, protocol commissions, and seller earnings.
* **Official HashKey Token Standards:** Direct support for official HashKey ecosystem tokens:
  * HashKey USDC: `0x054ed45810DbBAb8B27668922D110669c9D88D0a`
  * HashKey USDT: `0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029`
  * Wrapped HSK (WHSK): `0xB210D2120d57b758EE163cFfb43e73728c471Cf1`

### 2. Implementation of HashKey Settlement Protocol (HSP) Standards
* **Official HSP Compliance:** Fully implements the **HashKey Settlement Protocol (HSP)** standard outlined in the [HashKey Merchant Documentation](https://hashkey-merchant.github.io/#/).
* **EIP-712 Mandates:** Autonomous buyer agents sign structured `HSPPaymentMandate` typed data, allowing headless execution without human popups.
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

### 2. Run the Autonomous AI Agent CLI
Runs the entire autonomous machine-to-machine lifecycle on HashKey Chain Testnet (discovery $\to$ EIP-712 mandate signing $\to$ on-chain lock $\to$ private execution $\to$ on-chain settlement):
```bash
npm run agent:hsk
```

### 3. Run the Feasibility & Invariant Tests
Verifies the zero mid-way cutoff gate, mathematical token splits, and cryptographic sealing:
```bash
npm run test:feasibility
```

---

## 7. License

This project is open-source software licensed under the [MIT License](LICENSE).  
Built with pride for the **HashKey Chain Horizon** Hackathon.
