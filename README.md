# ShunyaGrid: Autonomous Agent Payments & A2A Settlement Protocol on HashKey Chain

[![Hackathon](https://img.shields.io/badge/HashKey_Chain-Horizon_Mumbai_Edition-00C087.svg)](https://dorahacks.io/hackathon/hskchainindia/detail)
[![Track](https://img.shields.io/badge/Track_2-Agent_Payments_%26_A2A_Settlement-emerald.svg)](https://dorahacks.io/hackathon/hskchainindia/detail)
[![HSP Protocol](https://img.shields.io/badge/Protocol-HSP_Mandate_Compliant-cyan.svg)](https://hashkey-merchant.github.io/#/)
[![Chain](https://img.shields.io/badge/HashKey_Chain_Testnet-Chain_ID_133-10B981.svg)](https://testnet-explorer.hsk.xyz)
[![Demo Day](https://img.shields.io/badge/Mumbai_Demo_Day-Nov_4,_2026_ATLAS_SkillTech-6366f1.svg)](https://luma.com/hashkey-demo-day-mumbai)
[![Cutoff Failures](https://img.shields.io/badge/Mid--Generation_Cutoffs-0.00%25_Guaranteed-green.svg)](#3-deterministic-token-bounds--zero-cutoff-guarantee)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Submission for HashKey Chain Horizon Hackathon (Mumbai Edition)**  
> **Target Track:** Track 2 — Agent Payments & A2A Settlement (5,000 USDT Prize Pool)  
> **Mandatory HSP Compliance:** Powered by **HashKey Settlement Protocol (HSP)** with EIP-712 Payment Mandates & On-Chain Settlement.  
> **Live HashKey Testnet Explorer:** [`0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae`](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae)  
> **Autonomous Agent CLI:** `npm run agent:hsk` (settles end-to-end live on HashKey Chain in seconds)  

---

## 1. Problem Statement: The Agent-to-Agent (A2A) Settlement Crisis

As autonomous AI agents evolve from conversational bots into economic entities that trade data, financial models, and code audits, **agent-to-agent (A2A) settlement breaks down on traditional payment rails**:

1. **The Mid-Generation Token Exhaustion Hazard:**
   Modern reasoning models (e.g. Claude 3.7 Sonnet, OpenAI o3-mini, Gemini 2.0 Flash Thinking) consume variable chains of hidden reasoning tokens before outputting their final synthesized answer. If an inference provider runs out of quota mid-thought, the model abruptly halts. **The buyer agent's funds are lost, the seller's quota is burned, and no valid cryptographic output is delivered.**

2. **Escrow Dispute Overhead & Lack of Conservation of Value:**
   Traditional escrows require human arbiters or fixed pricing that cannot handle variable token compute. If a buyer agent locks 100,000 tokens worth of funds upfront, but the model finishes its reasoning in only 12,840 tokens, conventional contracts cannot mathematically prove and refund the exact difference without trust assumptions.

3. **Privacy and Code Leakage in Agent Commerce:**
   When financial trading agents or smart contract auditing agents purchase inference, routing raw prompts or proprietary algorithms through untrusted third-party API keys creates immense surveillance risk. Both buyer prompts and seller API keys must remain strictly confidential.

---

## 2. The Solution: ShunyaGrid + HashKey Settlement Protocol (HSP)

**ShunyaGrid** is an autonomous A2A payment and zero-cutoff token settlement network native to **HashKey Chain**. It pairs hardware secure enclaves with the **HashKey Settlement Protocol (HSP)** to achieve:

- **EIP-712 HSP Payment Mandates:** Buyer agents construct and sign typed payment mandates (`HSPPaymentMandate`) authorizing an exact upfront reservation ($T_{\max}$) in native HSK or HashKey USDC.
- **On-Chain Mandate Locking:** Funds are locked in `HSPAdapter.sol` on HashKey Chain before compute starts, verifying seller solvency and eliminating payment default risk.
- **Confidential Hardware Enclave Execution:** Prompts and proprietary attachments (e.g. Solidity contracts, financial CSVs) are sealed in agent RAM with AES-256-GCM. Seller compute nodes execute the inference inside isolated enclaves with **zero surveillance access**.
- **Mathematical Conservation of Value:** Post-inference, `HSPAdapter.sol` executes atomic settlement enforcing:
  $$\text{sellerPayout} + \text{protocolFee} + \text{buyerRefund} \equiv \text{maxDeposit}$$
  Sellers are compensated strictly for actual compute consumed ($T_{\text{used}}$), protocol routing fees are retained, and all unused funds are **instantly refunded to the buyer agent wallet**.

---

## 3. Live Deployed Contracts on HashKey Chain Testnet

All smart contracts are compiled with Solidity `0.8.20`, optimized with `viaIR: true`, and deployed live on **HashKey Chain Testnet (Chain ID 133)**:

| Contract | Address | Network | Blockscout Explorer Link |
| :--- | :--- | :--- | :--- |
| **`HSPAdapter`** | `0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) |
| **`HashKeySettlementRouter`** | `0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D) |
| **`Deployer / Operator`** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | HashKey Chain Testnet (133) | [View on HashKey Blockscout](https://testnet-explorer.hsk.xyz/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) |

### Official HashKey Chain Tokens Supported
- **Native HSK:** `address(0)` (Native gas and settlement currency)
- **HashKey USDC:** `0x054ed45810DbBAb8B27668922D110669c9D88D0a`
- **HashKey USDT:** `0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029`
- **Wrapped HSK (WHSK):** `0xB210D2120d57b758EE163cFfb43e73728c471Cf1`
- **Chainlink CCIP Selector:** `7613811247471741961` (`ethereum-mainnet-hashkey-1`)

---

## 4. Architecture & A2A Workflow Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    SHUNYAGRID x HASHKEY CHAIN                                      |
+----------------------------------------------------------------------------------------------------+

 [ Buyer AI Agent ]                     [ HSPAdapter.sol ]                   [ Seller Compute Node ]
(e.g. OpenClaw CLI)                   (HashKey Chain 133)                     (Confidential Enclave)
        |                                       |                                       |
        | 1. Model Discovery & T_max Bounds      |                                       |
        |------------------------------------------------------------------------------>|
        |                                       |                                       |
        | 2. Sign EIP-712 HSP Mandate           |                                       |
        |    (v, r, s, mandateId, maxDeposit)   |                                       |
        |                                       |                                       |
        | 3. lockHSPMandateWithSignature()      |                                       |
        |    [Locks HSK upfront on HashKey Chain]                                      |
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

## 5. Deterministic Token Bounds & Zero-Cutoff Guarantee

Before any inference request is executed, ShunyaGrid computes deterministic upper bounds:

$$T_{\max}(m, \tau) = T_{\text{input\_cap}}(m) + T_{\text{thinking\_budget}}(m, \tau) + T_{\text{output\_cap}}(m, \tau)$$

| Model ID | Thinking Level ($\tau$) | Min Required ($T_{\min}$) | Input Cap ($T_{\text{input}}$) | Thinking Budget ($T_{\text{thinking}}$) | Output Cap ($T_{\text{output}}$) | Total Ceiling ($T_{\max}$) | HSK Benchmark Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `claude-3-7-sonnet` | `medium` | 5,000 | 10,000 | 8,192 | 6,000 | **24,192** | 0.015 HSK |
| `claude-3-7-sonnet` | `high` | 10,000 | 16,000 | 32,000 | 8,000 | **56,000** | 0.035 HSK |
| `o3-mini` | `medium` | 4,000 | 8,000 | 8,000 | 6,000 | **22,000** | 0.012 HSK |
| `gemini-2.0-flash` | `thinking` | 3,000 | 8,000 | 8,000 | 4,000 | **20,000** | 0.010 HSK |

**The Invariant:** A prompt is never initiated unless the seller node's verified available quota $Q \ge T_{\max}$. **Mid-generation cutoffs are mathematically prevented.**

---

## 6. How HSP Solves Agent Payments & Compliance

The **HashKey Settlement Protocol (HSP)** specification provides standard merchant rails for digital asset settlement. In ShunyaGrid, HSP is extended for Autonomous Agent Economies:

1. **EIP-712 Off-Chain Mandate Signing:**  
   Buyer agents do not need manual wallet popups for every sub-step. The autonomous agent signs typed structured data including `mandateId`, `buyerAgent`, `sellerNode`, `maxDeposit`, `tMax`, `nonce`, and `deadline`.
2. **Standard HSP Event Logging:**  
   Every transaction emits standard `HSPMessageEmitted` events, compatible with HashKey Merchant monitoring indexers:
   ```solidity
   event HSPMessageEmitted(bytes32 indexed topicId, uint8 indexed messageType, bytes payload);
   ```
3. **Multi-Asset Compatibility:**  
   Supports both native HSK payments and ERC-20 tokens (HashKey USDC, USDT, WHSK).
4. **Non-Custodial Conservation of Value:**  
   The smart contract guarantees that funds can only transition from `LOCKED` to `SETTLED` or `REFUNDED`. It is impossible for either party to steal or lock funds indefinitely.

---

## 7. Quickstart & Live Verification

### Prerequisites
- Node.js v18+ & npm
- A Web3 wallet (MetaMask) or CLI private key

### Installation
```bash
git clone https://github.com/kanakagarwal0901/HashKey-Chain-Horizon.git
cd HashKey-Chain-Horizon
npm install --legacy-peer-deps
```

### 1. Run the Autonomous HashKey Agent CLI
Demonstrates full automated A2A model discovery, EIP-712 mandate signing, on-chain deposit locking, and post-inference settlement on HashKey Chain:
```bash
npm run agent:hsk
```

**Live Verified Output Example:**
```text
==============================================================================
   HASHKEY CHAIN HORIZON • AUTONOMOUS AGENT A2A SETTLEMENT ENGINE
   Track 2: Agent Payments & A2A Settlement (HSP Protocol Enabled)
==============================================================================

[AGENT IDENTITY]
  Agent Wallet Address:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Network:               HashKey Chain Testnet (Chain ID 133)
  HSP Adapter Contract:  0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae
  Settlement Router:     0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D

[1. OBJECTIVE & DETERMINISTIC BOUNDS]
  Model Selected:        claude-3-7-sonnet (Thinking Level: medium)
  Maximum Bound (T_max): 24,192 tokens (Guaranteed Zero-Cutoff)

[4. HASHKEY SETTLEMENT PROTOCOL (HSP) MANDATE CREATION]
  Mandate ID:            0xf0aba7399591461a61ac75713e6e5541533335ec8243858d1003fa045ed1aca3
  Upfront Deposit T_max: 0.015 HSK
  EIP-712 Signature:     v=27, r=0x03086473efe6ad..., s=0x5e0a786bbd8b52...

[5. BROADCASTING ON-CHAIN MANDATE LOCK TO HASHKEY CHAIN TESTNET]
  [OK] Lock Confirmed in Block: #34975412
  Transaction Hash:      0x3ca57240ab5cc55b1e4b00ee8401fe537fdb1efdd0a1e22391f63bfcf9bafe55
  Blockscout Explorer:   https://testnet-explorer.hsk.xyz/tx/0x3ca57240ab5cc55b1e4b00ee8401fe537fdb1efdd0a1e22391f63bfcf9bafe55

[7. ON-CHAIN HSP SETTLEMENT EXECUTION]
  [OK] Settlement Confirmed in Block: #34975413
  Settlement Tx Hash:    0x0ad2c758c51ffceafaeb125ee8b9c58912ed148f9e8409f4b853f384ec97ad28
  Blockscout Explorer:   https://testnet-explorer.hsk.xyz/tx/0x0ad2c758c51ffceafaeb125ee8b9c58912ed148f9e8409f4b853f384ec97ad28
  On-Chain Status:       SETTLED (Verified On HashKey Chain)

[8. AGENT LOCAL OUTPUT DECRYPTION]
  Decrypted Result in Agent RAM: Reentrancy vulnerability detected and audited!
==============================================================================
   [SUCCESS] HASHKEY CHAIN A2A SETTLEMENT DEMONSTRATION COMPLETE
==============================================================================
```

### 2. Run the Interactive dApp (Frontend)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Connect MetaMask to **HashKey Chain Testnet** (one-click network addition configured).
- Visit **Buyer Studio** (`/buyer`) to run confidential reasoning prompts with native HSK or HashKey USDC payments.
- Click **How It Works** to inspect the interactive guide on **HashKey & HSP (Track 2)**.
- Visit **Seller Hub** (`/seller`) to list spare model quota and verify your HashKey payout target.
- Visit **Seller Payout** (`/payout`) to sweep earned HSK with zero slippage.

---

## 8. Smart Contract Testing & Verification

Compile and re-test all HashKey Chain contracts:
```bash
# Compile contracts with solc 0.8.20 and viaIR
npm run contracts:compile

# Run live on-chain HSP invariant test suite on HashKey Chain Testnet
npx tsx scripts/testHashKeyHspSettlement.ts
```

All 5 core invariant tests pass:
1. `signPaymentMandate`: EIP-712 typed signature verification.
2. `lockMandateWithSignature`: Upfront HSK deposit lock into escrow.
3. `reconcilePostExecution`: Hardware enclave token accounting.
4. `settleHSPMandate`: Conservation of value enforcement on HashKey Chain.
5. `getMandateStatus`: On-chain finality status verification (`SETTLED`).

---

## 9. Hackathon Track Alignment: Track 2

| Hackathon Requirement | Implementation in ShunyaGrid | Evidence |
| :--- | :--- | :--- |
| **Track 2: Agent Payments & A2A Settlement** | Autonomous agents exchange compute, sign EIP-712 payment mandates, and settle on-chain without human escrow. | [`apps/agent/openclaw-hsk-agent.ts`](apps/agent/openclaw-hsk-agent.ts) |
| **HSP Protocol Requirement** | Implemented `HSPAdapter.sol` supporting `HSPPaymentMandate` structs, `HSPMessageEmitted` events, and conservation-of-value settlement. | [`contracts/HSPAdapter.sol`](contracts/HSPAdapter.sol) |
| **HashKey Chain Deployment** | Deployed and verified on HashKey Chain Testnet (Chain ID 133). | [`HSPAdapter: 0x40A633...`](https://testnet-explorer.hsk.xyz/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae) |
| **In-Person Mumbai Pitch** | Team is available to present live at **ATLAS SkillTech University, Mumbai** on Demo Day (Nov 4, 2026). | Luma RSVP confirmed. |

---

## 10. Security & Threat Model

- **Checks-Effects-Interactions:** State transitions occur strictly before external transfers, preventing reentrancy attacks.
- **Custom Error Codes:** Gas-optimized custom errors (`ZeroAddress()`, `Unauthorized()`, `ConservationOfValueFailed()`, `MandateExpired()`) replace verbose require strings.
- **Nonce Replay Prevention:** `agentNonces[buyerAgent]` increments on every signed mandate, invalidating duplicate broadcasts.
- **Zero Plaintext Storage:** Neither buyer prompts, attached files, nor seller API keys are ever stored in plaintext or logged on-chain.

---

## 11. Links & Resources

- **GitHub Repository:** [`github.com/kanakagarwal0901/HashKey-Chain-Horizon`](https://github.com/kanakagarwal0901/HashKey-Chain-Horizon)
- **DoraHacks Hackathon Page:** [`dorahacks.io/hackathon/hskchainindia/detail`](https://dorahacks.io/hackathon/hskchainindia/detail#hsk-chain-horizon-hackathon-mumbai-edition)
- **Luma Mumbai Demo Day:** [`luma.com/hashkey-demo-day-mumbai`](https://luma.com/hashkey-demo-day-mumbai)
- **HashKey Chain Explorer:** [`testnet-explorer.hsk.xyz`](https://testnet-explorer.hsk.xyz)
- **HashKey Developer One-Pager:** [`hashfans.io/dev-onepager`](https://hashfans.io/dev-onepager)
- **HashKey Merchant Documentation:** [`hashkey-merchant.github.io`](https://hashkey-merchant.github.io/#/)

---

## 12. License

This project is open-source under the [MIT License](LICENSE).
