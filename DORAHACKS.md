# ShunyaGrid: pay-per-token AI compute that agents can buy on their own, settled on HashKey Chain

**Track:** Agent Payments & A2A Settlement · **Network:** HashKey Chain Testnet (Chain ID 133) · **Currency:** native HSK

🎥 [Demo video](https://youtu.be/1j2WbQ8WGEw) · 🌐 [Live app](https://hashkey-chain-horizon.onrender.com/) · 💻 [GitHub](https://github.com/kanakagarwal0901/HashKey-Chain-Horizon)

---

## The one-line pitch

AI agents can't use credit cards, and AI APIs can't take a deposit and refund what's unused. ShunyaGrid lets an agent **lock the worst-case cost of a prompt in a HashKey Chain contract, get its answer, and receive the unused part back on-chain in the same settlement.** The seller is paid only for the tokens actually used.

## The problem

1. **Prompts fail halfway.** Reasoning models burn hidden "thinking tokens". If a reseller's key runs out of quota mid-answer, the buyer pays and gets nothing.
2. **Flat escrows overcharge.** Lock $5 for a prompt that uses $0.50, and you either lose the rest or wait for someone to refund you by hand.
3. **Agents can't pay.** Today's AI APIs need a human with a card and a login. An autonomous agent can't buy compute from another agent.
4. **Unused API quota expires.** Developers pay for monthly quota they never use, and there's no safe way to resell it without handing over the key.

## How ShunyaGrid works

**1 · Zero-cutoff gate.** Before a prompt is sent we compute its worst case:
`T_max = input + files + thinking budget + max output`.
The prompt is only routed to a seller with at least `T_max` free quota, so it can't run out halfway.

**2 · Escrow worth exactly T_max, settled on what was used.** The buyer (a person or an agent) locks `T_max` worth of HSK. After inference, one settlement call splits it:

```
deposit = seller payout (T_used) + protocol fee + buyer refund (T_max − T_used)
```

`HSPAdapter.sol` enforces that the three parts add up exactly to the deposit, so no value is created or lost.

**3 · Agent-native payments (HSP mandates).** The agent signs an EIP-712 `HSPPaymentMandate` (seller, token, max deposit, `T_max`, nonce, deadline) and locks it on-chain. It then submits its encrypted prompt and is settled with no human in the loop. Run it yourself: `npm run agent:hsk`.

**4 · Encrypted prompts and keys.** Prompts are encrypted on the buyer's side (AES-256-GCM, key wrapped with RSA-OAEP-SHA256). Seller API keys are encrypted in the seller's browser to the execution server's key. Decryption happens only in server memory at call time, and the answer is re-encrypted to a one-time return key held by the buyer. This is software isolation, not a hardware TEE, and we say so in the docs.

## Proven on-chain (HashKey Testnet)

These runs used real HSK and are visible on the explorer.

| Flow | What happened | Settlement tx |
|---|---|---|
| `npm run test:hsp` | EIP-712 mandate signed → 0.01 HSK locked → settled: 0.00586 seller / 0.0015 fee / 0.00264 refund → status `SETTLED` | [`0x75b7…99bd`](https://testnet-explorer.hskchain.net/tx/0x75b7a0b950fe6946aa29375932041f55e8083aaf58133fe874336a8b9c2a99bd) |
| `npm run agent:hsk` | Autonomous agent: discover → sign → lock → blind execution → settle, no human input | [`0x620e…8a`](https://testnet-explorer.hskchain.net/tx/0x620e1ce382d848b00b221d44e780aa26e9d3615f5cd47bd0aec4396f5a30ce8a) |

**Contracts**
- `HSPAdapter`: [`0xBe5dDD447CfeA3Ff43ea636F5FCc75434f6f8108`](https://testnet-explorer.hskchain.net/address/0xBe5dDD447CfeA3Ff43ea636F5FCc75434f6f8108)
- `HashKeySettlementRouter`: [`0x56B8BaF4a417A90202021cBAc6ba983c8f96D6F3`](https://testnet-explorer.hskchain.net/address/0x56B8BaF4a417A90202021cBAc6ba983c8f96D6F3)

## What you can do in the app

- **Buyer Studio:** pick a model (Claude, GPT, Gemini, Llama), attach files, and see `T_max` and a live HSK/USD quote. Pay with MetaMask, which switches to chain 133 for you. After each answer you get a receipt showing tokens reserved, used and refunded, with the tx hash.
- **Seller Hub:** list spare API quota with your own price per 1k tokens and a quota cap. Your key is encrypted in your browser before it's sent. Sellers verify with World ID to keep bots out.
- **Orderbook:** a live view of seller nodes, their prices and the quota they have available.
- **Payout Center:** sweep your earned HSK to your wallet on HashKey, or to Sepolia, Arbitrum Sepolia or Base Sepolia.
- **OpenClaw agent CLI:** a headless A2A buyer that runs the whole lifecycle from code.

## Why HashKey Chain

- **Native HSK** is the unit for deposits, fees, seller earnings and refunds.
- **HSP-style mandates and events** (`HSPMandateCreated`, `HSPSettlementExecuted`, `HSPMessageEmitted`) let explorers and merchant tools index every agent payment.
- **Low fees and fast blocks** make per-prompt micro-escrows practical: a full lock-and-settle cycle costs a fraction of a cent in gas.

## Security: we audited ourselves

We ran a full security audit of our own code before submitting, covering the contracts, the backend API, the cryptography and the frontend. We're fixing what it found rather than hiding it:

- Settlement is being bounded by tokens used, with a fee cap and a buyer timeout refund.
- Sweeps and listing changes now need the owner's wallet signature (EIP-712).
- Payment verification is being made strict: the right token, chain, amount and payer, with replay protection.
- Leaked development keys are being rotated, and the contracts are being redeployed under a private owner.

The full findings and current test status are public in the README.

## Tech stack

Solidity 0.8.20 (HSPAdapter, HashKeySettlementRouter, ShunyaGridOrderbook) · Next.js 14 · TypeScript · ethers v6 / viem / wagmi · Web Crypto (AES-GCM, RSA-OAEP) · World ID · Arkiv · HashKey Chain Testnet RPC + Blockscout

## Run it

```bash
git clone https://github.com/kanakagarwal0901/HashKey-Chain-Horizon && cd HashKey-Chain-Horizon
npm install && cp .env.example .env.local   # add a funded testnet key
npm run dev            # web app on http://localhost:3000
npm run agent:hsk      # autonomous A2A buyer agent
npm run test:hsp       # on-chain mandate lock + settle
```

## What's next

Per-token price bounds enforced on-chain · seller-signed usage attestations · a hardware TEE (SGX/Nitro) for execution · stablecoin (USDC/USDT) deposits on HashKey mainnet · an SDK so any agent framework can buy compute with three lines of code.

**Team:** [Kanak Agarwal](https://www.linkedin.com/in/kanak-agarwal-b987b236b) · [X @KanakAg15519091](https://x.com/KanakAg15519091)
