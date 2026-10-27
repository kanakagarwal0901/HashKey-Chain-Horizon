# ShunyaGrid: Autonomous Agent Payments & A2A Settlement Protocol on HashKey Chain

**HashKey Chain Horizon** • **Track: Agent Payments & A2A Settlement** • **Chain ID: 133 (Testnet)**

ShunyaGrid is an autonomous agent-to-agent (A2A) payment and token settlement network native to **HashKey Chain**. Powered by the **HashKey Settlement Protocol (HSP)**, it enables AI agents to securely buy, sell, and settle inference and compute quotas without data surveillance or mid-generation failures.

* **Live Contract (`HSPAdapter`):** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)
* **Settlement Router:** [`0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D`](https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D)
* **Autonomous Agent CLI:** `npm run agent:hsk`

---

## 1. Problem Statement: The A2A Settlement Crisis

As autonomous AI agents evolve into economic actors trading data, code audits, and financial analysis, existing payment rails fail:

1. **Mid-Generation Token Exhaustion:**  
   Reasoning models (Claude 3.7 Sonnet, OpenAI o3-mini, Gemini 2.0 Thinking) consume thousands of hidden reasoning tokens. If a seller runs out of quota midway, the generation crashes, tokens burn, and the buyer receives nothing.
2. **Inflexible Pricing & Escrow Overhead:**  
   Standard escrows charge flat fees. If a buyer reserves 50,000 tokens but the model only needs 12,000, conventional smart contracts cannot automatically prove usage and refund the unused difference.
3. **Data & Prompt Surveillance Risk:**  
   Sending proprietary codebases or confidential financial models through third-party API proxies exposes sensitive intellectual property to sellers.

---

## 2. The Solution: ShunyaGrid + HashKey Settlement Protocol (HSP)

ShunyaGrid pairs isolated hardware execution with the **HashKey Settlement Protocol (HSP)**:

* **EIP-712 Payment Mandates:** Buyer agents sign typed, gasless payment mandates authorizing an exact upfront reservation for the maximum possible compute budget ($T_{\max}$).
* **On-Chain Mandate Locking:** Funds are locked in `HSPAdapter.sol` on HashKey Chain before compute starts, verifying seller solvency and eliminating default risk.
* **Confidential Enclave Execution:** Prompts and attached files are encrypted client-side with AES-256-GCM. Seller nodes execute the request inside isolated memory with **zero access to cleartext prompts or outputs**.
* **Conservation of Value Settlement:** Once the model finishes, `HSPAdapter.sol` executes atomic settlement:
  $$\text{sellerPayout} + \text{protocolFee} + \text{buyerRefund} \equiv \text{maxDeposit}$$
  Sellers are paid strictly for actual tokens consumed ($T_{\text{used}}$), the protocol takes a routing fee, and all unused funds are **instantly refunded to the buyer agent**.

---

## 3. Live Deployed Contracts on HashKey Chain Testnet

All contracts are compiled with Solidity `0.8.20`, optimized with `viaIR: true`, and deployed live on **HashKey Chain Testnet (Chain ID 133)**:

| Contract | Address | Network | Blockscout Explorer Link |
| :--- | :--- | :--- | :--- |
| **`HSPAdapter`** | `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) |
| **`HashKeySettlementRouter`** | `0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) |
| **`Deployer / Operator`** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) |

### Supported HashKey Chain Tokens
* **Native HSK:** `address(0)` (Native gas and settlement currency)
* **HashKey USDC:** `0x054ed45810DbBAb8B27668922D110669c9D88D0a`
* **HashKey USDT:** `0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029`
* **Wrapped HSK (WHSK):** `0xB210D2120d57b758EE163cFfb43e73728c471Cf1`
* **Chainlink CCIP Selector:** `7613811247471741961` (`ethereum-mainnet-hashkey-1`)

---

## 4. Architecture & Workflow Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    SHUNYAGRID x HASHKEY CHAIN                                      |
+----------------------------------------------------------------------------------------------------+

 [ Buyer AI Agent ]                     [ HSPAdapter.sol ]                   [ Seller Compute Node ]
(e.g. OpenClaw CLI)                   (HashKey Chain 133)                     (Confidential Enclave)
        |                                       |                                       |
        | 1. Model Discovery & Token Bounds     |                                       |
        |------------------------------------------------------------------------------>|
        |                                       |                                       |
        | 2. Sign EIP-712 HSP Mandate           |                                       |
        |    (v, r, s, mandateId, maxDeposit)   |                                       |
        |                                       |                                       |
        | 3. lockHSPMandateWithSignature()      |                                       |
        |    [Locks HSK upfront on HashKey]     |                                       |
        |-------------------------------------->|                                       |
        |                                       |-- emit HSPMandateCreated ------------>|
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
 [ Local Decryption in Agent RAM ]
 [ Conservation of Value Verified ]
```

---

## 5. Token Limits & Zero-Cutoff Guarantee

Modern reasoning models consume variable amounts of hidden "thinking" tokens. If a seller runs out of quota during execution, the prompt fails midway and funds are lost.

**How ShunyaGrid solves this:**  
Before any prompt is executed, ShunyaGrid determines the maximum possible token requirement ($T_{\max}$) based on the model and selected thinking level. The network checks the seller's verified balance to guarantee they have enough quota before any call is made.

| Model | Thinking Level | Max Token Budget ($T_{\max}$) | Benchmark Rate |
| :--- | :--- | :--- | :--- |
| **Claude 3.7 Sonnet** | Medium | 24,192 tokens | 0.015 HSK |
| **Claude 3.7 Sonnet** | High | 56,000 tokens | 0.035 HSK |
| **OpenAI o3-mini** | Medium | 22,000 tokens | 0.012 HSK |
| **Gemini 2.0 Flash** | Thinking | 20,000 tokens | 0.010 HSK |

**The Zero-Cutoff Invariant:**  
A prompt is **never** dispatched to a seller unless their active token quota is $\ge T_{\max}$. If a seller has insufficient tokens, the request is routed to an eligible node. This mathematically guarantees that **no prompt will ever fail or abort midway**.

---

## 6. How HSP Solves Agent Payments

The **HashKey Settlement Protocol (HSP)** provides a reliable foundation for automated Web3 payments:

1. **EIP-712 Mandates:** Agents sign off-chain payment authorizations. No manual popup is needed for every execution step.
2. **On-Chain Audit Trail:** Every transaction emits standard `HSPMessageEmitted` events, providing full transparency on HashKey Blockscout.
3. **Multi-Asset Rails:** Seamlessly supports native `HSK` and HashKey tokens (`USDC`, `USDT`, `WHSK`).
4. **Zero-Custody Escrow:** Funds transition directly between Buyer, Seller, and Treasury with zero middleman custody.

---

## 7. Quickstart & Verification

### Prerequisites
* Node.js v18+ & npm
* Web3 Wallet (MetaMask) or private key

### Installation
```bash
git clone https://github.com/kanakagarwal0901/HashKey-Chain-Horizon.git
cd HashKey-Chain-Horizon
npm install --legacy-peer-deps
```

### 1. Run the Autonomous HashKey Agent CLI
Demonstrates autonomous model discovery, EIP-712 mandate signing, on-chain lock, and settlement live on HashKey Chain:
```bash
npm run agent:hsk
```

### 2. Run the Interactive Web Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
* Connect MetaMask to **HashKey Chain Testnet** (Chain ID `133`).
* Use the **Buyer Studio** to run confidential inference with reasoning models.
* Use the **Seller Hub** to list and monetize idle AI quotas.

---

## 8. License

This project is open-source under the [MIT License](LICENSE).  
Built for the **HashKey Chain Horizon** Hackathon.
