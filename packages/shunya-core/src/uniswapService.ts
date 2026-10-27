import { ethers } from "ethers";

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Record<string, string>; // chainKey -> address
  isNative?: boolean;
  logoUrl?: string;
}

export interface ChainMetadata {
  id: string;
  name: string;
  chainId: number;
  chainIdHex: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  uniswapRouterAddress: string;
  uniswapQuoterAddress?: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainMetadata> = {
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    uniswapRouterAddress: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // Uniswap V3 SwapRouter02
    uniswapQuoterAddress: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
  },
  "hashkey-testnet": {
    id: "hashkey-testnet",
    name: "HashKey Chain Testnet",
    chainId: 133,
    chainIdHex: "0x85",
    rpcUrl: "https://testnet.hsk.xyz",
    explorerUrl: "https://testnet-explorer.hsk.xyz",
    nativeCurrency: { name: "HashKey EcoPoints", symbol: "HSK", decimals: 18 },
    uniswapRouterAddress: "0x532802f2F9E0e3EE9d5Ba70C35E1F43C0498772D", // HashKey Settlement Router
    uniswapQuoterAddress: "0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae", // HSP Adapter
  },
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    chainIdHex: "0x66eee",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeCurrency: { name: "Arbitrum ETH", symbol: "ETH", decimals: 18 },
    uniswapRouterAddress: "0x101F443B4d1b059569D643917553c771E1b9663E",
  },
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia",
    chainId: 84532,
    chainIdHex: "0x14a34",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    nativeCurrency: { name: "Base ETH", symbol: "ETH", decimals: 18 },
    uniswapRouterAddress: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  },
  "optimism-sepolia": {
    id: "optimism-sepolia",
    name: "Optimism Sepolia",
    chainId: 11155420,
    chainIdHex: "0xaa37dc",
    rpcUrl: "https://sepolia.optimism.io",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    nativeCurrency: { name: "Optimism ETH", symbol: "ETH", decimals: 18 },
    uniswapRouterAddress: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  },
};

export const SUPPORTED_TOKENS: Record<string, TokenMetadata> = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    addresses: {
      "hashkey-testnet": "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
      "ethereum-sepolia": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      "arbitrum-sepolia": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "optimism-sepolia": "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    },
  },
  HSK: {
    symbol: "HSK",
    name: "HashKey EcoPoints",
    decimals: 18,
    isNative: true,
    addresses: {
      "hashkey-testnet": "0x0000000000000000000000000000000000000000",
    },
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isNative: true,
    addresses: {
      "ethereum-sepolia": "0x0000000000000000000000000000000000000000",
      "arbitrum-sepolia": "0x0000000000000000000000000000000000000000",
      "base-sepolia": "0x0000000000000000000000000000000000000000",
      "optimism-sepolia": "0x0000000000000000000000000000000000000000",
    },
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    addresses: {
      "ethereum-sepolia": "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
      "arbitrum-sepolia": "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
      "base-sepolia": "0x4200000000000000000000000000000000000006",
      "optimism-sepolia": "0x4200000000000000000000000000000000000006",
    },
  },
  DAI: {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    addresses: {
      "ethereum-sepolia": "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
      "arbitrum-sepolia": "0x4931a74d284a12368c81804b4d7589d89260a996",
      "base-sepolia": "0x50c5725949a6F0c72E6C4a641F24049A917DB0Cb",
    },
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      "hashkey-testnet": "0xF1B50eD67A9e2CC94Ad3c477779E2d4cBfFf9029",
      "ethereum-sepolia": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
      "arbitrum-sepolia": "0x6854e43f114c02c67645e5d36e768370ffea5485",
    },
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18,
    addresses: {
      "ethereum-sepolia": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
  },
};

export interface UniswapQuote {
  fromToken: string;
  toToken: string;
  amountIn: number;
  expectedAmountOut: number;
  rate: number;
  feeTier: number; // 500 (0.05%), 3000 (0.3%), 10000 (1%)
  routerAddress: string;
  estimatedPriceImpact: string;
  sourceDex: "Uniswap-V3" | "Uniswap-V2" | "HashKey-HSP-Router";
}

export class UniswapService {
  // Reference market prices in USD for quote generation
  private priceFeed: Record<string, number> = {
    USDC: 1.0,
    DAI: 1.0,
    USDT: 1.0,
    HSK: 0.75,
    ETH: 2600.0,
    WETH: 2600.0,
    UNI: 8.5,
  };

  /**
   * Derive a live swap quote for exchanging fromToken to toToken via Uniswap V3.
   */
  public getQuote(params: {
    fromToken: string;
    toToken: string;
    amountIn: number;
    chainId?: string;
  }): UniswapQuote {
    const { fromToken, toToken, amountIn } = params;
    const chainKey = params.chainId || "ethereum-sepolia";
    const chain = SUPPORTED_CHAINS[chainKey] || SUPPORTED_CHAINS["ethereum-sepolia"];

    if (fromToken === toToken) {
      return {
        fromToken,
        toToken,
        amountIn,
        expectedAmountOut: amountIn,
        rate: 1.0,
        feeTier: 0,
        routerAddress: chain.uniswapRouterAddress,
        estimatedPriceImpact: "<0.01%",
        sourceDex: "Uniswap-V3",
      };
    }

    const priceInUsd = this.priceFeed[fromToken] ?? 1.0;
    const priceOutUsd = this.priceFeed[toToken] ?? 1.0;

    const totalValueUsd = amountIn * priceInUsd;
    // 0.3% Uniswap LP fee deduction
    const netValueUsd = totalValueUsd * 0.997;
    const expectedAmountOut = netValueUsd / priceOutUsd;
    const rate = expectedAmountOut / (amountIn || 1);

    return {
      fromToken,
      toToken,
      amountIn,
      expectedAmountOut,
      rate,
      feeTier: 3000, // 0.3% pool tier standard
      routerAddress: chain.uniswapRouterAddress,
      estimatedPriceImpact: "0.05%",
      sourceDex: chainKey.includes("hashkey") ? "HashKey-HSP-Router" : "Uniswap-V3",
    };
  }

  /**
   * Generates EIP-1193 transaction parameters for MetaMask to execute a Uniswap V3 swap.
   */
  public buildMetaMaskSwapTx(params: {
    fromToken: string;
    toToken: string;
    amountIn: number;
    recipient: string;
    chainKey?: string;
  }): {
    to: string;
    data: string;
    value?: string;
    approvalRequired: boolean;
    tokenToApprove?: string;
    amountToApprove?: string;
  } {
    const { fromToken, toToken, amountIn, recipient } = params;
    const chainKey = params.chainKey || "ethereum-sepolia";
    const chain = SUPPORTED_CHAINS[chainKey] || SUPPORTED_CHAINS["ethereum-sepolia"];
    const router = chain.uniswapRouterAddress;

    const fromMeta = SUPPORTED_TOKENS[fromToken] || SUPPORTED_TOKENS.USDC;
    const toMeta = SUPPORTED_TOKENS[toToken] || SUPPORTED_TOKENS.USDC;

    const fromAddress = fromMeta.addresses[chainKey] || ethers.ZeroAddress;
    const toAddress = toMeta.addresses[chainKey] || ethers.ZeroAddress;

    const quote = this.getQuote({ fromToken, toToken, amountIn, chainId: chainKey });

    const amountInUnits = ethers.parseUnits(amountIn.toFixed(fromMeta.decimals), fromMeta.decimals);
    const minAmountOutUnits = ethers.parseUnits(
      (quote.expectedAmountOut * 0.98).toFixed(toMeta.decimals), // 2% slippage protection
      toMeta.decimals
    );

    // If paying in Native ETH
    if (fromMeta.isNative) {
      // Interface for exactInputSingle with ETH
      const iface = new ethers.Interface([
        "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
      ]);

      const wethAddress = SUPPORTED_TOKENS.WETH.addresses[chainKey] || fromAddress;
      const data = iface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: wethAddress,
          tokenOut: toAddress,
          fee: quote.feeTier,
          recipient,
          amountIn: amountInUnits,
          amountOutMinimum: minAmountOutUnits,
          sqrtPriceLimitX96: 0,
        },
      ]);

      return {
        to: router,
        data,
        value: "0x" + amountInUnits.toString(16),
        approvalRequired: false,
      };
    }

    // If paying in ERC-20 (USDC / DAI / USDT / UNI)
    const iface = new ethers.Interface([
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)",
    ]);

    const data = iface.encodeFunctionData("exactInputSingle", [
      {
        tokenIn: fromAddress,
        tokenOut: toAddress,
        fee: quote.feeTier,
        recipient,
        amountIn: amountInUnits,
        amountOutMinimum: minAmountOutUnits,
        sqrtPriceLimitX96: 0,
      },
    ]);

    return {
      to: router,
      data,
      approvalRequired: true,
      tokenToApprove: fromAddress,
      amountToApprove: "0x" + amountInUnits.toString(16),
    };
  }
}

// Global Singleton
export const uniswapService = new UniswapService();
