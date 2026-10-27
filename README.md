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

* **HSP Adapter Contract:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)
* **Settlement Router Contract:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D)
* **Autonomous Agent CLI:** `npm run agent:hsk`
* **Live Web Interface:** [http://localhost:3000](http://localhost:3000)

---

## 1. The Core Problems ShunyaGrid Solves

```
       TRADITIONAL AI PROXIES                          SHUNYAGRID x HASHKEY CHAIN
  ┌───────────────────────────────┐               ┌─────────────────────────────────┐
  │ ❌ Seller inspects prompt     │               │ ✔️ Client-side AES-256 sealing   │
  │ ❌ Quota runs out midway      │   ───────►    │ ✔️ Bounded T_max reservation     │
  │ ❌ Fixed fee, no refund       │               │ ✔️ Exact-usage payout + refund  │
  │ ❌ Manual wallet approval     │               │ ✔️ EIP-712 HSP autonomous agent │
  └───────────────────────────────┘               └─────────────────────────────────┘
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
Before any request is broadcast, ShunyaGrid calculates the maximum possible tokens the model could consume:
$$T_{\max} = T_{\text{input\_cap}} + T_{\text{thinking\_budget}} + T_{\text{output\_cap}}$$
A prompt is **never** dispatched to a seller unless the seller's verified active quota $Q \ge T_{\max}$. If insufficient, the request routes to an eligible seller node. This mathematically guarantees that **no prompt can ever cut off midway.**

### Pillar III: Conservation-of-Value Settlement
Every job deposit satisfies an immutable conservation law:
$$\text{Max Deposit } (T_{\max}) \equiv \text{Seller Payout } (T_{\text{used}}) + \text{Protocol Fee} + \text{Buyer Refund } (T_{\max} - T_{\text{used}})$$
The seller is paid strictly for tokens actually consumed, and any unused reservation is **automatically refunded to the buyer agent's wallet in the same transaction.**

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

## 4. End-to-End Workflow Diagram

```
 [ Buyer AI Agent ]                     [ HSPAdapter.sol ]                   [ Seller Compute Node ]
(e.g. OpenClaw CLI)                   (HashKey Chain 133)                     (Confidential Enclave)
        |                                       |                                       |
        | 1. Query Model & Token Ceiling (T_max) |                                       |
        |------------------------------------------------------------------------------>|
        |                                       |                                       |
        | 2. Sign EIP-712 Payment Mandate       |                                       |
        |    (v, r, s, mandateId, maxDeposit)   |                                       |
        |                                       |                                       |
        | 3. lockHSPMandateWithSignature()      |                                       |
        |    [Locks HSK upfront on HashKey]     |                                       |
        |-------------------------------------->|                                       |
        |                                       |-- emit HSPMessageEmitted ------------>|
        |                                       |                                       |
        | 4. Dispatch Sealed Ciphertext         |                                       |
        |    (AES-256-GCM encrypted in RAM)     |                                       |
        |------------------------------------------------------------------------------>|
        |                                       |                                       |
        |                                       |                               [ Executes in Enclave ]
        |                                       |                               [ Zero data leakage   ]
        |                                       |                               [ Actual: T_used tokens]
        |                                       |                                       |
        |                                       | 5. settleHSPMandate()                 |
        |                                       |    (sellerPayout + fee + refund)      |
        |                                       |<--------------------------------------|
        |                                       |                                       |
        |                                       |-- [Payout HSK to Seller Node] ------->|
        |                                       |-- [Protocol Fee to Treasury] -------->|
        |                                       |-- [Unused HSK Refunded to Buyer] ---->|
        |                                       |                                       |
        |<-- 6. Encrypted Output + Status: SETTLED -------------------------------------|
        |                                       |                                       |
 [ Decrypt Output in Local Agent RAM ]
 [ Mathematical Conservation Verified ]
```

---

## 5. Live Deployed Contracts & Supported Tokens

All contracts are deployed and verified on **HashKey Chain Testnet (Chain ID 133)**:

| Contract | Address | Network | Explorer |
| :--- | :--- | :--- | :--- |
| **`HSPAdapter`** | `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) |
| **`HashKeySettlementRouter`** | `0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) |
| **`Deployer / Operator`** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | HashKey Testnet (133) | [HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) |

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
│           ├── tokenBoundsCatalog.ts   # Deterministic token matrix and cutoff gates
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
