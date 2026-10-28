# ShunyaGrid: Autonomous Agent Payments & A2A Settlement Protocol on HashKey Chain

**HashKey Chain Horizon** • **Track: Agent Payments & A2A Settlement** • **Chain ID: 133 (Testnet)**

---

## Executive Overview

As artificial intelligence evolves from conversational chatbots into autonomous economic actors, AI agents are beginning to transact, purchase reasoning quotas, verify smart contracts, and hire other agents directly over the internet. 

However, **traditional Web3 and Web2 payment rails break down in agentic commerce**:
* Reasoning models consume variable hidden "thinking" tokens, causing unexpected mid-generation crashes.
* Traditional escrow systems charge rigid fixed prices that cannot account for variable token usage.
* Routing proprietary codebases or confidential data through third-party API keys creates critical surveillance and IP theft hazards.

**ShunyaGrid** solves this by establishing a decentralized, zero-cutoff Agent-to-Agent (A2A) payment and compute settlement network native to **HashKey Chain**. Powered by the **HashKey Settlement Protocol (HSP)**, ShunyaGrid enables AI agents and developers to trade unused API token quotas with mathematical guarantees: **zero prompt visibility, zero mid-way cutoffs, and exact conservation-of-value settlement.**

* **HSP Adapter Contract:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)
* **Settlement Router Contract:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D)
* **Autonomous Agent CLI:** `npm run agent:hsk`
* **Live Web Interface:** [http://localhost:3000](http://localhost:3000)
* **Quick Navigation:** [Transaction Workflow](#4-transaction-workflow-how-transactions-are-made-using-hsk) • [Architecture](#2-the-three-architectural-pillars) • [Live Contracts](#5-live-deployed-contracts--supported-tokens) • [Quickstart Guide](#8-quickstart--verification-guide)

---

## 1. The Core Problems ShunyaGrid Solves

```
   TRADITIONAL AI PROXIES                     SHUNYAGRID x HASHKEY CHAIN
  ───────────────────────────────            ─────────────────────────────────
  • Seller can inspect prompts               • Client-side AES-256 GCM sealing
  • Quota can run out mid-thought            • Bounded T_max quota reservation
  • Rigid fixed fees with no refunds         • Exact-usage payout + auto-refund
  • Manual wallet popups required            • Autonomous EIP-712 HSP mandates
```

### 1. The "Mid-Generation Token Exhaustion" Hazard
Modern reasoning models (such as Claude 3.7 Sonnet, OpenAI o3-mini, and Gemini 2.0 Flash Thinking) generate dynamic chains of internal reasoning tokens before outputting their final synthesized answer. If an inference seller lists an API key with only 5,000 tokens remaining and a buyer runs a deep reasoning prompt requiring 15,000 tokens, the request abruptly fails midway: **the seller's remaining tokens are burned, the buyer's funds are lost, and no usable output is delivered.**

### 2. Inflexible Escrow & Lack of Value Conservation
Standard smart contract escrows charge an all-or-nothing fixed deposit. If an agent reserves 50,000 tokens worth of compute but the model finishes in only 12,000 tokens, standard contracts cannot mathematically prove usage and refund the difference without trusting a centralized server.

### 3. Intellectual Property & Prompt Surveillance
When a financial trading agent, hedge fund, or security researcher purchases inference, routing raw prompts or proprietary code (e.g., Solidity vaults, financial CSVs) through an untrusted third-party API proxy exposes confidential IP to the seller node.

---

## 2. The Three Architectural Pillars

ShunyaGrid operates on three strict architectural invariants:

### Pillar I: Total Seller Blindness (CROPS Architecture)
* **Seller's API Key:** Sealed in the seller's browser using RSA-OAEP public-key encryption before ever touching the network. It is decrypted exclusively inside isolated Enclave RAM during the upstream API call. The buyer never sees the key.
* **Buyer's Prompt & Files:** Encrypted client-side with an ephemeral 256-bit AES-GCM key (`K_input`). Files (PDFs, code, CSVs) are uploaded as encrypted ciphertext blobs. The seller node proxy log displays only sealed ciphertext.
* **AI Output:** Encrypted inside the Enclave using the buyer's local return key (`K_return`) before leaving memory. Only the buyer can decrypt the response.

### Pillar II: Deterministic Token Bounding (Zero-Cutoff Gate)
Before any inference request is executed, ShunyaGrid calculates the maximum possible token ceiling ($T_{\max}$):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DETERMINISTIC TOKEN CEILING                     │
│                                                                        │
│   T_max = [Input & Files Cap] + [Thinking Budget] + [Output Cap]       │
└────────────────────────────────────────────────────────────────────────┘
```

* **Pre-Flight Solvency Check:** A prompt is **never** dispatched to a seller node unless their active, verified quota meets or exceeds $T_{\max}$.
* **Zero Mid-Way Cutoffs:** If an agent requests a reasoning model requiring up to 24,000 tokens, but a seller node only has 10,000 tokens left, the request is never routed to that node. It automatically selects a fully solvent node, guaranteeing that prompts never fail or crash midway.

### Pillar III: Conservation-of-Value Settlement
Every job deposit strictly satisfies an immutable conservation law:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CONSERVATION OF VALUE                           │
│                                                                        │
│   Max Upfront Deposit ≡ Seller Payout + Protocol Fee + Buyer Refund    │
│                           (T_used)                      (T_max - T_used)│
└────────────────────────────────────────────────────────────────────────┘
```

* **Fair-Usage Economics:** Sellers are compensated strictly for the actual tokens consumed ($T_{\text{used}}$).
* **Instant Auto-Refund:** Any unused tokens ($T_{\max} - T_{\text{used}}$) are **automatically returned to the buyer agent's wallet in the exact same transaction**, eliminating dispute overhead.

---

## 3. Deep Concept & Codebase Breakdown

Here is how every module and technology in this repository functions:

### 1. HashKey Settlement Protocol (HSP) & EIP-712 Mandates
* **Files:** `contracts/HSPAdapter.sol`, `packages/shunya-core/src/hspClient.ts`
* **Concept:** Instead of requiring manual wallet confirmation popups for every sub-step, autonomous buyer agents sign an EIP-712 typed data structure called an `HSPPaymentMandate`.
* **State Machine:**
  ```
  [NONE] ──(lockHSPMandateWithSignature)──► [LOCKED] ──(settleHSPMandate)──► [SETTLED]
                                                │
                                                └──(refundHSPMandate)────► [REFUNDED]
  ```
* **Event Transparency:** Every state transition emits standard `HSPMessageEmitted` events indexed by HashKey Merchant block explorers.

### 2. Multi-Asset Settlement Router
* **Files:** `contracts/HashKeySettlementRouter.sol`
* **Concept:** Manages protocol fee recipients and multi-token liquidity routing. It accepts native `HSK` as well as ERC-20 stablecoins (`HashKey USDC`, `HashKey USDT`, and `WHSK`), ensuring payment flexibility across the HashKey ecosystem.

### 3. Autonomous AI Agent (OpenClaw)
* **Files:** `apps/agent/openclaw-hsk-agent.ts`
* **Concept:** A headless, autonomous agent that executes the entire A2A lifecycle via CLI:
  1. Discovers model endpoints and calculates $T_{\max}$.
  2. Constructs and cryptographically signs the EIP-712 HSP mandate.
  3. Broadcasts the on-chain lock transaction on HashKey Chain Testnet.
  4. Encrypts the payload in RAM, executes the inference, and verifies on-chain settlement.
  5. Includes an **RPC load-balancer block propagation guard** to ensure seamless execution across distributed HashKey RPC nodes.

### 4. Client-Side Cryptographic Vault
* **Files:** `src/lib/clientCrypto.ts`, `src/lib/blindCryptoBrowser.ts`, `src/lib/enclaveKeyVault.ts`
* **Concept:** Pure browser-based Web Crypto API implementation adhering to the Ethereum Foundation CROPS (Client-Run, Open-Source, Private, Self-Custodial) standard. Encrypts and decrypts payloads locally with zero server-side key custody.

### 5. In-RAM File Extractor & Upstream AI Dispatcher
* **Files:** `src/lib/enclaveFileExtractor.ts`, `src/lib/enclaveUpstreamCaller.ts`
* **Concept:** Handles arbitrary file attachments (Solidity code, audit contracts, PDFs, financial CSVs, images). In isolated memory, it parses files using `pdf-parse` and `papaparse`, constructs the token-bounded prompt, and calls the upstream AI provider (Anthropic, OpenAI, Gemini, Groq) with hard `max_tokens` limits.

### 6. Value Conservation Escrow Contract
* **Files:** `contracts/ShunyaGridEscrow.sol`
* **Concept:** An enterprise-grade escrow contract enforcing Checks-Effects-Interactions (CEI) and OpenZeppelin reentrancy guards. Holds the $T_{\max}$ upfront deposit and splits it atomically upon job completion.

### 7. Cross-Chain Interoperability & Chainlink CCIP
* **Files:** `src/lib/sepoliaPaymentVerifier.ts`, `src/lib/clientSepolia.ts`
* **Concept:** Bridges liquidity from external chains into HashKey Chain. Configured with the **HashKey Chain CCIP Selector** (`7613811247471741961`), allowing buyers holding assets on Ethereum, Arbitrum, or Base to fund inference jobs executed on HashKey Chain.

### 8. Anti-Sybil Proof of Human & ENS Subnames
* **Files:** `src/lib/worldIdSessionStore.ts`, `src/lib/ensNamespace.ts`
* **Concept:** Protects the orderbook from spam. Sellers can verify uniqueness via World ID to prove they are human node operators, and mint human-readable ENS subnames (e.g., `node-1.shunyagrid.eth`) that map directly to their payout addresses.

### 9. Privacy-Preserving RPC Routing
* **Files:** `src/lib/anonRpcClient.ts`
* **Concept:** Routes Web3 read queries through a sandboxed iframe worker, stripping client IP addresses and metadata so RPC node providers cannot track buyer browsing habits.

### 10. Automated Saga Compensation Refund Engine
* **Files:** `src/app/api/blind-execute/route.ts`, `buyerRefundEngine`
* **Concept:** If an upstream AI provider rejects a call or encounters a timeout after an on-chain deposit is locked, the backend triggers an automated Saga compensation refund, releasing the seller's locked quota and returning funds to the buyer.

---

## 4. Transaction Workflow: How Transactions Are Made Using HSK

ShunyaGrid is architected around **HashKey Chain (Chain ID 133 Testnet / 177 Mainnet)** as the native clearinghouse for all AI agent compute, inference mandates, and financial settlements. To make AI compute universally accessible, buyers are not restricted to holding native HSK—they can fund compute requests using multiple popular tokens across multiple EVM networks. 

Here is the comprehensive, end-to-end breakdown of how transactions and settlements flow through the protocol:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE COMPLETE HSK TRANSACTION PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  [1. MULTI-CHAIN BUYER OPTIONS]                                                                 │
│      Buyer chooses funding asset: Sepolia ETH/USDC, Arbitrum Sepolia ETH/USDC, or HSK           │
│                                      │                                                          │
│                                      ▼                                                          │
│  [2. UNIVERSAL CONVERSION TO HSK]                                                               │
│      Assets priced via oracle/pool feeds and denominated into equivalent HSK value              │
│                                      │                                                          │
│                                      ▼                                                          │
│  [3. TREASURY DEPOSIT & LOCKING]                                                                │
│      Upfront HSK deposit covering T_max is locked in the Protocol Treasury / HSPAdapter.sol     │
│                                      │                                                          │
│                                      ▼                                                          │
│  [4. DYNAMIC USAGE SETTLEMENT]                                                                  │
│      Inference completes; exact tokens (T_used) verified:                                       │
│      • Seller Payout: Exact HSK corresponding to T_used transferred to seller                   │
│      • Protocol Commission: Platform fee retained by Protocol Treasury                          │
│      • Buyer Refund: Unused HSK returned directly to buyer                                      │
│                                      │                                                          │
│                                      ▼                                                          │
│  [5. SELLER SWEEP & BALANCE UPDATE]                                                             │
│      Seller sweeps earned revenue from Treasury:                                                │
│      • HSK form of payment settles against the Treasury                                         │
│      • Swept value updates the seller's live on-chain balance in real time                      │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Detailed Step-by-Step Breakdown

#### Step 1: Multi-Chain & Multi-Token Payment Options
Buyers have complete freedom in how they fund their compute requests. In the ShunyaGrid Buyer Studio (`/buyer`) or via the OpenClaw Agent CLI (`npm run agent:hsk`), buyers can choose from a wide selection of networks and tokens:
* **Ethereum Sepolia:** Sepolia ETH or USDC
* **Arbitrum Sepolia:** Arbitrum Sepolia ETH or USDC
* **Base Sepolia:** Base Sepolia ETH or USDC
* **HashKey Chain (Chain ID 133):** Native HSK, HashKey official USDC (`0x054e...`), or USDT (`0xF1B5...`)

This multi-chain flexibility allows developers, autonomous AI agents, and institutions holding assets on major Layer-1 and Layer-2 networks to purchase high-performance confidential compute without manually bridging assets beforehand. The incoming transaction is verified using the platform's cross-chain verification layer (`sepoliaPaymentVerifier.ts` and Chainlink CCIP).

#### Step 2: Universal Conversion into HSK Form
Because ShunyaGrid's core compute verification, state machine, and settlement logic execute on **HashKey Chain**, every incoming payment is denominated and converted into **HSK**:
* **Real-Time Pricing:** Real-time decentralized exchange liquidity feeds (Uniswap v3 / DEX pool oracles via `uniswapService.ts`) quote the exact exchange rate between the buyer's source token (e.g., Sepolia ETH or USDC) and native HSK.
* **Deterministic Token Budget ($T_{\max}$):** The system calculates the maximum possible token ceiling ($T_{\max} = \text{Input Cap} + \text{Thinking Budget} + \text{Output Cap}$) and determines the upfront amount in HSK required to guarantee that the inference request will never crash midway due to quota exhaustion.

#### Step 3: Upfront Holding & Locking in the Protocol Treasury
Before any prompt data or encrypted payload is dispatched to a seller compute node, the upfront HSK deposit is transferred and locked directly into the **Protocol Treasury & HSPAdapter Contract** (`contracts/HSPAdapter.sol`) on HashKey Chain:
* **Default Protection:** Locking the funds upfront in the Treasury eliminates payment default risk. The seller node has cryptographic proof that the escrow is fully funded before burning costly GPU cycles.
* **Atomic Quota Reservation:** Concurrently, the seller node's active listing quota on the orderbook is atomically locked to prevent race conditions or overselling.

#### Step 4: Token-Bounded Settlement & Commission Split
The compute node processes the prompt inside an isolated hardware Enclave with zero prompt visibility. Once the AI model finishes reasoning, the authoritative token count of actual tokens consumed ($T_{\text{used}}$) is verified on-chain:
1. **Seller Payout in HSK:** Corresponding strictly to the tokens used by the seller, the exact earned compensation is paid out to the seller in **HSK**:
   ```
   Seller Payout (HSK) = (T_used / 1000) × Price_rate
   ```
2. **Protocol Commission:** The protocol charges a platform routing fee retained by the Protocol Treasury for facilitating the decentralized orderbook and secure escrow:
   ```
   Protocol Commission (HSK) = Routing Fee retained by Treasury
   ```
3. **Buyer Refund & Conservation of Value:** Because inference rarely consumes the absolute maximum ceiling ($T_{\max}$), the remaining unconsumed balance is immediately returned to the buyer's wallet in the same transaction:
   ```
   Upfront Deposit = Seller Payout (T_used) + Protocol Commission + Buyer Refund
   ```
4. **Quota Rebalancing:** The unused token capacity ($T_{\max} - T_{\text{used}}$) is restored to the seller's active orderbook quota, allowing them to serve new requests immediately.

#### Step 5: Seller Sweep & Live Balance Rebalancing
When a seller node operator wishes to withdraw their earned proceeds:
* **Treasury Settlement:** The seller initiates a sweep from the Seller Hub (`/seller` or `/payout`). The HSK form of the payment stored in the Treasury is settled and released.
* **Flexible Payout Delivery:** Sellers can choose to receive their payout directly in native HSK or bridged cross-chain to any supported EVM destination (via Chainlink CCIP / CCTP / Uniswap liquidity routing).
* **Live Balance Synchronization:** As soon as the sweep executes, the swept amount is debited against the Treasury records and the seller's live balance is dynamically updated in real time (`calculateSellerBalance()`), preventing double-sweeps and keeping financial records mathematically synchronized across the network.

---

### End-to-End Workflow Sequence Diagram

```
  [ Buyer AI Agent ]                     [ HSPAdapter.sol ]                   [ Seller Compute Node ]
 (e.g. OpenClaw CLI)                   (HashKey Chain 133)                     (Confidential Enclave)
         │                                       │                                       │
         │ 1. Select Payment (Sepolia / HSK)     │                                       │
         │    Calculate T_max Budget             │                                       │
         │------------------------------------------------------------------------------>│
         │                                       │                                       │
         │ 2. Universal Conversion to HSK Form   │                                       │
         │    Sign EIP-712 Payment Mandate       │                                       │
         │                                       │                                       │
         │ 3. lockHSPMandateWithSignature()      │                                       │
         │    [Locks HSK Upfront in Treasury]    │                                       │
         │--------------------------------------►│                                       │
         │                                       │-- emit HSPMessageEmitted ------------►│
         │                                       │                                       │
         │ 4. Dispatch Sealed Ciphertext         │                                       │
         │    (Client-Side AES-256-GCM)          │                                       │
         │------------------------------------------------------------------------------>│
         │                                       │                                       │
         │                                       │                               [ Executes in Enclave ]
         │                                       │                               [ Actual: T_used tokens]
         │                                       │                                       │
         │                                       │ 5. settleHSPMandate()                 │
         │                                       │    (sellerPayout + fee + refund)      │
         │                                       │◄──────────────────────────────────────│
         │                                       │                                       │
         │                                       │-- [Payout HSK for T_used] ----------->│
         │                                       │-- [Protocol Commission to Treasury] ->│
         │                                       │-- [Unused HSK Refunded to Buyer] ---->│
         │                                       │                                       │
         │◄── 6. Encrypted Response Delivered ───┴───────────────────────────────────────│
         │                                                                               │
         │ 7. Seller Initiates Sweep (/payout)                                           │
         │    • HSK settled from Treasury & routed to target wallet                      │
         │    • Seller's live platform balance updated in real time                      │
```

---

## 5. Live Deployed Contracts & Supported Tokens

All contracts are deployed and verified on **HashKey Chain Testnet (Chain ID 133)**:

| Contract | Address | Network | Explorer |
| :--- | :--- | :--- | :--- |
| **`HSPAdapter`** | `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) |
| **`HashKeySettlementRouter`** | `0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hskchain.net/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) |
| **`Deployer / Operator`** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hskchain.net/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) |

### Supported Tokens & Cross-Chain Configuration
* **Native HSK:** `address(0)` — Native gas and primary settlement token
* **HashKey USDC:** `0x054ed45810DbBAb8B27668922D110669c9D88D0a`
* **HashKey USDT:** `0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029`
* **Wrapped HSK (WHSK):** `0xB210D2120d57b758EE163cFfb43e73728c471Cf1`
* **Chainlink CCIP Selector:** `7613811247471741961` (`ethereum-mainnet-hashkey-1`)

---

## 6. Deterministic Model & Pricing Matrix

ShunyaGrid maintains a deterministic catalog that maps models and reasoning levels to their exact maximum token ceiling:

| Model | Thinking Level | Max Token Budget ($T_{\max}$) | Benchmark Rate |
| :--- | :--- | :--- | :--- |
| **Claude 3.7 Sonnet** | Medium | 24,192 tokens | 0.015 HSK |
| **Claude 3.7 Sonnet** | High | 56,000 tokens | 0.035 HSK |
| **OpenAI o3-mini** | Medium | 22,000 tokens | 0.012 HSK |
| **OpenAI o3-mini** | High | 36,000 tokens | 0.018 HSK |
| **Gemini 2.0 Flash** | Thinking | 20,000 tokens | 0.010 HSK |
| **Meta LLaMA 3.3 70B** | None | 8,000 tokens | 0.005 HSK |

---

## 7. Project Monorepo Structure

```text
hashkey/
├── apps/
│   └── agent/
│       └── openclaw-hsk-agent.ts       # Autonomous AI Buyer Agent (HSP EIP-712 settlement)
├── contracts/
│   ├── HSPAdapter.sol                  # Core HashKey Settlement Protocol adapter contract
│   ├── HashKeySettlementRouter.sol     # Multi-token fee router and liquidity manager
│   ├── ShunyaGridEscrow.sol            # Conservation-of-value escrow implementation
│   ├── VaultLending.sol                # Sample DeFi contract for smart contract audit demo
│   ├── SecureVault.sol                 # Hardened vault contract for security testing
│   └── hashkey-testnet-deployments.json# Live deployment registry on HashKey Testnet
├── packages/
│   └── shunya-core/
│       └── src/
│           ├── hspClient.ts            # EIP-712 mandate creation and on-chain verification
│           ├── hashkeyTreasury.ts      # Treasury accounting & universal multi-chain sweeper
│           ├── tokenBoundsCatalog.ts   # Deterministic token matrix and cutoff gates
│           ├── arkivQuotaManager.ts    # Arkiv decentralized orderbook database engine
│           ├── zeroGEnclave.ts         # 0G hardware enclave & blind encryption
│           ├── worldIdVerification.ts  # World ID proof of personhood / sybil resistance
│           ├── blindCrypto.ts          # Server-side Enclave cryptographic unwrapping
│           └── uniswapService.ts       # Multi-asset conversion utilities
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── blind-execute/route.ts  # Central execution gateway & Saga compensation
│   │   │   ├── listings/route.ts       # Orderbook entity querying and registration
│   │   │   └── enclave-pubkey/route.ts # Public key provider for client-side sealing
│   │   ├── buyer/page.tsx              # Buyer Studio (Cascading selector, file dropzone)
│   │   ├── seller/page.tsx             # Seller Hub (API key sealing, quota allocation)
│   │   ├── marketplace/page.tsx        # Interactive Orderbook Explorer
│   │   └── payout/page.tsx             # Multi-chain payout sweeper
│   └── lib/
│       ├── clientCrypto.ts             # In-browser Web Crypto API (AES-256-GCM + RSA-OAEP)
│       ├── clientSepolia.ts            # Web3 wallet & HashKey network switcher
│       ├── enclaveFileExtractor.ts     # In-RAM PDF, CSV, and code parser
│       ├── enclaveUpstreamCaller.ts    # Upstream AI caller bounded strictly by T_max
│       └── sepoliaPaymentVerifier.ts   # Multi-chain and CCIP payment verifier
├── scripts/
│   ├── deployHashKey.ts                # HashKey Chain Testnet deployment script
│   ├── testHashKeyHspSettlement.ts     # Live HSP mandate lock and settlement test
│   ├── testFeasibility.ts              # 6 Feasibility invariant tests (FT-01 to FT-06)
│   └── runE2EDemo.ts                   # Full end-to-end orchestration runner
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. Quickstart & Verification Guide

### Prerequisites
* **Node.js:** `v18+` or `v20+`
* **Package Manager:** `npm`
* **Web3 Wallet:** MetaMask configured with HashKey Chain Testnet (or CLI private key)

### Installation
```bash
git clone https://github.com/kanakagarwal0901/HashKey-Chain-Horizon.git
cd HashKey-Chain-Horizon
npm install --legacy-peer-deps
```

### 1. Run the Autonomous HashKey Agent CLI
Executes the complete autonomous A2A lifecycle on HashKey Chain Testnet (model discovery $\to$ EIP-712 mandate signing $\to$ on-chain lock $\to$ confidential inference $\to$ on-chain settlement):
```bash
npm run agent:hsk
```

### 2. Run the Interactive Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Connect Wallet:** Automatic one-click addition of **HashKey Chain Testnet** (Chain ID `133`).
* **Buyer Studio (`/buyer`):** Select reasoning models, drag-and-drop proprietary audit contracts or files, and run confidential inference.
* **Seller Hub (`/seller`):** Seal raw API keys client-side, set token quotas, and publish compute listings.
* **Marketplace (`/marketplace`):** View active compute nodes and real-time quotas on HashKey Chain.

### 3. Run the Feasibility & Invariant Tests
Verifies the zero mid-way cutoff gate, mathematical token splits, and cryptographic sealing:
```bash
npm run test:feasibility
```

---

## 9. Security & Audit Considerations

* **Reentrancy Protection:** All smart contracts implement non-reentrant guards on state-changing methods.
* **Checks-Effects-Interactions (CEI):** Internal balances and mandate statuses are updated before any token or ether transfer is initiated.
* **Zero Host Plaintext:** Decryption keys and cleartext payloads exist exclusively in volatile memory and are purged immediately after execution.

---

## 10. License

This project is open-source software licensed under the [MIT License](LICENSE).  
Built for the **HashKey Chain Horizon** Hackathon.
