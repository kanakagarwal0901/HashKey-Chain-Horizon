"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  PROVIDERS,
  SUPPORTED_MODELS,
  ThinkingLevel,
  ModelTokenBounds,
  getModelTokenBounds,
  getModelsByProvider,
  getModelMetadata,
  canSellerFulfillPrompt,
} from "@shunya/core";
import {
  Cpu,
  Shield,
  Lock,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Coins,
  ArrowRight,
  Database,
  Layers,
  Info,
  X,
  Trash2,
  Check,
  ArrowRightLeft,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  sealBuyerPromptAndFilesInBrowser,
  decryptBuyerOutputInBrowser,
} from "@/lib/clientCrypto";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";
import HowItWorksModal from "@/components/HowItWorksModal";
import {
  SEPOLIA_CHAIN_ID_HEX,
  SEPOLIA_CIRCLE_USDC_ADDRESS,
  SHUNYA_TREASURY_EVM_ADDRESS,
  CIRCLE_FAUCET_URL,
  HEDERA_HCS_TOPIC_ID,
  switchOrAddSepoliaNetwork,
  fetchSepoliaUsdcBalance,
  sendSepoliaUsdcPayment,
  waitForSepoliaConfirmation,
  executeBuyerUniversalPayment,
} from "@/lib/clientSepolia";

export default function BuyerStudioPage() {
  const {
    isAuthenticated,
    walletAddress,
    walletChainId,
    worldIdVerified,
    nullifierHash,
    connectWallet,
    isConnectingWallet,
  } = useAuth();
  // Cascading Selection State
  const [selectedProvider, setSelectedProvider] = useState<string>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet");
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");
  const [showWorldIdModal, setShowWorldIdModal] = useState<boolean>(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);
  const [pendingAutoLock, setPendingAutoLock] = useState<boolean>(false);

  // On-Chain Sepolia & USDC Balance State
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
  const [buyerSepoliaTxHash, setBuyerSepoliaTxHash] = useState<string | null>(null);

  // Multi-Currency & Multi-Chain Payment State
  const [paymentCurrency, setPaymentCurrency] = useState<string>("USDC");
  const [paymentChain, setPaymentChain] = useState<string>("ethereum-sepolia");
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [paymentQuote, setPaymentQuote] = useState<{
    amountFormatted: string;
    rateFormatted: string;
    isSwap: boolean;
  }>({
    amountFormatted: "$0.00",
    rateFormatted: "1 USDC = $1.00",
    isSwap: false,
  });

  const isSepoliaNetwork = walletChainId === "0xaa36a7" || walletChainId === "11155111";

  const refreshUsdcBalance = async () => {
    if (!walletAddress) {
      setUsdcBalance(null);
      return;
    }
    try {
      setIsLoadingBalance(true);
      const bal = await fetchSepoliaUsdcBalance(walletAddress);
      setUsdcBalance(bal);
    } catch (err) {
      console.warn("Could not query Sepolia USDC balance:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const switchToSepolia = async () => {
    setIsSwitchingNetwork(true);
    try {
      const ok = await switchOrAddSepoliaNetwork();
      if (ok) {
        await refreshUsdcBalance();
      }
      return ok;
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      refreshUsdcBalance();
    }
  }, [walletAddress, walletChainId]);

  // Prompt & File Drop State
  const [promptText, setPromptText] = useState<string>(
    "Perform a comprehensive security audit on the attached smart contract. Check for reentrancy, access control flaws, and recommend remediations."
  );
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: number; type: string; base64: string }[]
  >([]);

  // Sellers State
  const [eligibleSellers, setEligibleSellers] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [loadingSellers, setLoadingSellers] = useState<boolean>(false);
  const [allOrderbookListings, setAllOrderbookListings] = useState<any[]>([]);

  // Execution & Decryption State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionStep, setExecutionStep] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [decryptedResult, setDecryptedResult] = useState<{
    aiOutputText: string;
    reasoningText: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  // Group active models from all orderbook listings
  const activeOrderbookModels = useMemo(() => {
    const map = new Map<
      string,
      {
        modelId: string;
        provider: string;
        modelName: string;
        count: number;
        lowestRate: number;
      }
    >();
    for (const l of allOrderbookListings) {
      if (l.status !== "active") continue;
      const meta = getModelMetadata(l.model);
      const modelName = meta?.name || l.model;
      const provider = meta?.provider || l.provider || "openai";
      const existing = map.get(l.model);
      if (!existing) {
        map.set(l.model, {
          modelId: l.model,
          provider,
          modelName,
          count: 1,
          lowestRate: l.pricePer1kMicroUsdc,
        });
      } else {
        existing.count += 1;
        existing.lowestRate = Math.min(existing.lowestRate, l.pricePer1kMicroUsdc);
      }
    }
    return Array.from(map.values());
  }, [allOrderbookListings]);

  // Direct Model Selector Helper
  const selectModelDirectly = (provider: string, modelId: string) => {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
    const meta = getModelMetadata(modelId);
    setThinkingLevel(meta?.supportsThinking ? "medium" : "none");
    setSelectedSeller(null);
    setExecutionResult(null);
    setDecryptedResult(null);
  };

  const fetchAllOrderbookListings = async () => {
    try {
      const res = await fetch("/api/listings");
      const data = await res.json();
      if (data.success && Array.isArray(data.listings)) {
        setAllOrderbookListings(data.listings);
        return data.listings;
      }
    } catch (err) {
      console.warn("Could not load all orderbook listings:", err);
    }
    return [];
  };

  // Filter models by selected provider
  const availableModels = getModelsByProvider(selectedProvider);
  const activeModelMeta = getModelMetadata(selectedModel) || availableModels[0] || SUPPORTED_MODELS[0];

  // Active Model Token Bounds
  const bounds: ModelTokenBounds = getModelTokenBounds(selectedModel, thinkingLevel);

  // Dynamic token estimations
  const estimatedPromptTokens = Math.max(1, Math.ceil(promptText.length / 4));
  const estimatedFileTokens = attachedFiles.reduce((acc, f) => {
    return acc + (f.type.startsWith("image/") ? 800 : Math.max(50, Math.ceil(f.size / 4)));
  }, 0);
  const totalEstimatedInputTokens = estimatedPromptTokens + estimatedFileTokens;
  const isInputWithinLimits = totalEstimatedInputTokens <= bounds.maxInputAndFileTokens;

  // On initial mount: query all listings and auto-select active model if default model has 0 sellers
  useEffect(() => {
    fetchAllOrderbookListings().then((all) => {
      if (all && all.length > 0) {
        const activeForSelected = all.filter(
          (l: any) => l.model === selectedModel && l.status === "active"
        );
        if (activeForSelected.length === 0) {
          const firstActive = all.find((l: any) => l.status === "active");
          if (firstActive) {
            const meta = getModelMetadata(firstActive.model);
            if (meta) {
              selectModelDirectly(meta.provider, meta.id);
            }
          }
        }
      }
    });
  }, []);

  // Preload sample Solidity file for quick testing
  useEffect(() => {
    const sampleSolidity = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VaultLending {
    mapping(address => uint256) public balances;
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No funds");
        
        // Critical: External call precedes state zeroing
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        
        balances[msg.sender] = 0;
    }
}`;
    setAttachedFiles([
      {
        name: "VaultLending.sol",
        size: sampleSolidity.length,
        type: "text/x-solidity",
        base64: btoa(sampleSolidity),
      },
    ]);
  }, []);

  // Fetch eligible sellers when model or bounds change
  useEffect(() => {
    setLoadingSellers(true);
    fetch(`/api/listings?model=${selectedModel}&tMax=${bounds.totalMaxTokens}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.listings || [];
        setEligibleSellers(list);
        // If current selected seller is no longer in eligible list, reset
        if (selectedSeller && !list.find((s: any) => s.id === selectedSeller.id)) {
          setSelectedSeller(null);
        }
        setLoadingSellers(false);
      })
      .catch((err) => {
        console.error("Failed to query Arkiv:", err);
        setLoadingSellers(false);
      });

    fetchAllOrderbookListings();
  }, [selectedModel, bounds.totalMaxTokens]);

  // Provider change handler
  const handleProviderChange = (newProvider: string) => {
    setSelectedProvider(newProvider);
    const models = getModelsByProvider(newProvider);
    if (models.length > 0) {
      const first = models[0];
      setSelectedModel(first.id);
      setThinkingLevel(first.supportsThinking ? "medium" : "none");
    }
    setSelectedSeller(null);
    setExecutionResult(null);
    setDecryptedResult(null);
  };

  // Model change handler
  const handleModelChange = (newModelId: string) => {
    setSelectedModel(newModelId);
    const meta = getModelMetadata(newModelId);
    if (meta?.supportsThinking) {
      if (thinkingLevel === "none") {
        setThinkingLevel("medium");
      }
    } else {
      setThinkingLevel("none");
    }
    setSelectedSeller(null);
    setExecutionResult(null);
    setDecryptedResult(null);
  };

  // Thinking level change handler
  const handleThinkingChange = (newLevel: ThinkingLevel) => {
    setThinkingLevel(newLevel);
    setSelectedSeller(null);
    setExecutionResult(null);
    setDecryptedResult(null);
  };

  // Process uploaded or dropped files
  const processFiles = (files: File[]) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler when clicking "Prompt Now" on a listed seller
  const handlePromptNow = (seller: any) => {
    setSelectedSeller(seller);
    // Smoothly scroll down to prompt studio section
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Upfront cost calculations
  const ratePer1k = selectedSeller ? selectedSeller.pricePer1kMicroUsdc : bounds.defaultPricePer1kMicroUsdc;
  const upfrontMicroUsdc = Math.ceil((bounds.totalMaxTokens / 1000) * ratePer1k);
  const upfrontUsdc = upfrontMicroUsdc / 1_000_000;

  // Dynamic Uniswap Quote for Multi-Currency Buyer Payment
  useEffect(() => {
    let isMounted = true;
    const fetchBuyerQuote = async () => {
      if (paymentCurrency === "USDC") {
        setPaymentQuote({
          amountFormatted: `$${upfrontUsdc.toFixed(4)} USDC`,
          rateFormatted: "1 USDC = $1.00",
          isSwap: false,
        });
        return;
      }

      setIsFetchingQuote(true);
      try {
        const res = await fetch(
          `/api/uniswap/quote?from=${paymentCurrency}&to=USDC&amount=1&chainId=${paymentChain}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.quote && isMounted) {
            const usdcPerToken = data.quote.expectedAmountOut || 1.0;
            const unitsNeeded = (upfrontUsdc / usdcPerToken) * 1.005; // 0.5% slippage safety buffer
            setPaymentQuote({
              amountFormatted: `${unitsNeeded < 0.001 ? unitsNeeded.toFixed(6) : unitsNeeded.toFixed(4)} ${paymentCurrency}`,
              rateFormatted: `1 ${paymentCurrency} ≈ $${usdcPerToken.toFixed(2)} USDC`,
              isSwap: true,
            });
          }
        }
      } catch (err) {
        console.warn("Buyer quote fetch error:", err);
      } finally {
        if (isMounted) setIsFetchingQuote(false);
      }
    };

    fetchBuyerQuote();
    return () => {
      isMounted = false;
    };
  }, [paymentCurrency, paymentChain, upfrontUsdc]);

  // Execute blind inference & quota lock
  const executePrompt = async (forcedAddress?: string) => {
    if (!selectedSeller) {
      alert("Please select an eligible seller from Step 2 above first.");
      return;
    }

    // Determine active wallet address
    let activeBuyerAddress =
      forcedAddress ||
      walletAddress ||
      (typeof window !== "undefined" ? (window as any).ethereum?.selectedAddress : null);

    // If wallet not connected, connect it first
    if (!activeBuyerAddress) {
      const ok = await connectWallet();
      if (!ok) return;
      activeBuyerAddress =
        (typeof window !== "undefined" ? (window as any).ethereum?.selectedAddress : null) || walletAddress;
      if (!activeBuyerAddress) return;
    }

    // If World ID not verified, trigger verification modal with auto-lock resume flag
    if (!worldIdVerified) {
      setPendingAutoLock(true);
      setShowWorldIdModal(true);
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setDecryptedResult(null);

    try {
      // Phase 1: Local Client-side Encryption
      setExecutionStep("1/4: Sealing prompt & files with AES-256-GCM in local browser RAM...");
      const pubKeyRes = await fetch("/api/enclave-pubkey");
      const pubKeyData = await pubKeyRes.json();
      const enclavePubKeyPem = pubKeyData.publicKeyPem || pubKeyData.enclavePublicKeyPem || pubKeyData.publicKey;

      const filesForCrypto = attachedFiles
        .filter((f) => f && f.base64)
        .map((f) => ({
          filename: f.name || "file.txt",
          mimeType: f.type || "text/plain",
          base64Data: f.base64,
        }));

      const { buyerLocalReturnKeyBase64, encryptedEnvelope } = await sealBuyerPromptAndFilesInBrowser(
        promptText,
        filesForCrypto,
        enclavePubKeyPem
      );

      // Phase 2: Authentic On-Chain Multi-Currency / Uniswap Routed Payment
      setExecutionStep(`2/4: Preparing MetaMask ${paymentCurrency} payment on ${paymentChain}...`);

      if (!activeBuyerAddress) {
        throw new Error("Wallet not connected. Please connect your Web3 wallet.");
      }

      setExecutionStep(
        paymentCurrency === "USDC"
          ? `2/4: Please sign the $${upfrontUsdc.toFixed(4)} USDC payment in MetaMask...`
          : `2/4: Please approve and sign the ${paymentCurrency} Uniswap swap in MetaMask...`
      );

      const paymentResult = await executeBuyerUniversalPayment({
        buyerAddress: activeBuyerAddress,
        requiredMicroUsdc: upfrontMicroUsdc,
        tokenSymbol: paymentCurrency,
        chainKey: paymentChain,
      });

      const confirmedTxHash = paymentResult.txHash;
      setExecutionStep(`2/4: Payment broadcasted (${confirmedTxHash.slice(0, 10)}...). Waiting for block confirmation...`);
      await waitForSepoliaConfirmation(confirmedTxHash, 45000);

      setBuyerSepoliaTxHash(confirmedTxHash);
      setExecutionStep(`2/4: Payment confirmed! Enclave verifying transaction receipt...`);

      // Refresh balance in background
      refreshUsdcBalance();

      // Phase 3: Sealed Enclave Execution
      setExecutionStep("3/4: 0G Sealed Enclave executing inference with zero seller visibility...");
      const executeRes = await fetch("/api/blind-execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-402-Payment-TxId": confirmedTxHash,
        },
        body: JSON.stringify({
          modelId: selectedModel,
          thinkingLevel,
          listingId: selectedSeller.id,
          encryptedEnvelope,
          paymentTxId: confirmedTxHash,
          buyerAddress: activeBuyerAddress,
        }),
      });

      if (!executeRes.ok) {
        const errJson = await executeRes.json();
        throw new Error(errJson.error || errJson.reason || "Enclave inference execution failed");
      }

      const executeData = await executeRes.json();
      setExecutionResult(executeData);

      // Broadcast settlement completion event locally and cross-tab for immediate Seller balance sync
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("shunyagrid_settlement_completed", { detail: executeData })
          );
          localStorage.setItem("shunyagrid_last_settlement_at", Date.now().toString());
        } catch (syncErr) {
          console.warn("[Buyer] Failed to dispatch balance sync event:", syncErr);
        }
      }

      // Phase 4: Local Decryption with K_return
      setExecutionStep("4/4: Decrypting sealed AI output locally in browser with K_return...");
      await new Promise((r) => setTimeout(r, 400));

      const decrypted = await decryptBuyerOutputInBrowser(
        executeData.encryptedOutput.encryptedOutputBase64,
        executeData.encryptedOutput.ivHex,
        executeData.encryptedOutput.authTagHex,
        buyerLocalReturnKeyBase64
      );

      setDecryptedResult(decrypted);
      setExecutionStep("Completed successfully with zero privacy leaks!");
    } catch (err: any) {
      console.error(err);
      alert(`Error during execution: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Callback when World ID verification succeeds: automatically resume quota lock & execution
  const handleWorldIdSuccess = () => {
    setShowWorldIdModal(false);
    if (pendingAutoLock) {
      setPendingAutoLock(false);
      const activeAddr =
        walletAddress ||
        (typeof window !== "undefined" ? (window as any).ethereum?.selectedAddress : null);
      setTimeout(() => {
        executePrompt(activeAddr);
      }, 400);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Hardware Enclave Privacy (Zero Visibility)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Guaranteed Zero-Cutoff
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-cyan-400" />
            Buyer Confidential Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            End-to-End Encrypted AI Prompts &bull; Pre-flight T_max Quota Lock &bull; No Mid-Generation Cutoffs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick How It Works Pop Up Trigger */}
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-800/50 hover:border-cyan-600 text-xs font-medium text-cyan-300 transition shadow-sm"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>How It Works</span>
          </button>

          {/* Ethereum Sepolia Network Status */}
          {walletAddress && (
            isSepoliaNetwork ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/70 border border-indigo-700/50 text-xs font-mono text-indigo-300">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>Sepolia (11155111)</span>
              </div>
            ) : (
              <button
                onClick={switchToSepolia}
                disabled={isSwitchingNetwork}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/60 text-xs font-mono text-amber-300 transition"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{isSwitchingNetwork ? "Switching..." : "Switch to Sepolia"}</span>
              </button>
            )
          )}

          {/* Sepolia Circle USDC Balance */}
          {walletAddress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <Coins className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-200 font-bold">
                {isLoadingBalance
                  ? "Loading..."
                  : usdcBalance !== null
                  ? `$${usdcBalance.toFixed(2)} USDC`
                  : "0.00 USDC"}
              </span>
              <a
                href={CIRCLE_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
                title="Claim free Circle testnet USDC"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-0.5 ml-1 font-semibold"
              >
                Faucet
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-200 font-bold">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
              </span>
              <span className="text-emerald-400 font-semibold">&bull; World ID Verified</span>
            </div>
          ) : (
            <button
              onClick={async () => {
                if (!walletAddress) {
                  const ok = await connectWallet();
                  if (!ok) return;
                }
                setShowWorldIdModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono text-cyan-200 hover:text-white transition shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>{!walletAddress ? "Connect Wallet" : "Verify World ID"}</span>
            </button>
          )}
          <Link
            href="/seller"
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            Seller Hub
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CASCADING SELECTION: AI PROVIDER -> MODEL -> THINKING LEVEL      */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Configure Target AI Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Select your AI provider, model, and thinking budget to determine exact zero-cutoff bounds (T_max).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/50 self-start sm:self-auto">
            Zero-Cutoff Invariant: Q &ge; T_max
          </span>
        </div>

        {/* 3 Cascading Dropdown Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. AI Provider Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              1. AI Provider
            </label>
            <div className="relative">
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-cyan-500 rounded-xl px-3.5 py-3 text-sm text-white font-medium outline-none transition cursor-pointer appearance-none"
              >
                {PROVIDERS.map((p) => {
                  const nodeCount = allOrderbookListings.filter(
                    (l) => l.status === "active" && (getModelMetadata(l.model)?.provider === p.id || l.provider === p.id)
                  ).length;
                  return (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name} {nodeCount > 0 ? `(${nodeCount} active node${nodeCount === 1 ? "" : "s"})` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Provider routing: {selectedProvider.toUpperCase()}
            </p>
          </div>

          {/* 2. Target Model Dropdown (Filtered by Provider) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              2. Target Model ({availableModels.length} available)
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-cyan-500 rounded-xl px-3.5 py-3 text-sm text-white font-medium outline-none transition cursor-pointer appearance-none"
              >
                {availableModels.map((m) => {
                  const nodeCount = allOrderbookListings.filter(
                    (l) => l.status === "active" && l.model === m.id
                  ).length;
                  return (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name} ({Math.round(m.contextWindow / 1000)}k ctx) {nodeCount > 0 ? `🔥 (${nodeCount} node${nodeCount === 1 ? "" : "s"})` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-slate-500 truncate" title={activeModelMeta.description}>
              {activeModelMeta.description}
            </p>
          </div>

          {/* 3. Thinking Level Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              3. Thinking Budget Level
            </label>
            <div className="relative">
              <select
                value={thinkingLevel}
                onChange={(e) => handleThinkingChange(e.target.value as ThinkingLevel)}
                disabled={!activeModelMeta.supportsThinking}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm font-medium outline-none transition appearance-none ${
                  activeModelMeta.supportsThinking
                    ? "hover:border-slate-600 focus:border-cyan-500 text-white cursor-pointer"
                    : "opacity-60 cursor-not-allowed text-slate-400"
                }`}
              >
                {activeModelMeta.supportsThinking ? (
                  <>
                    <option value="none" className="bg-slate-900 text-white">
                      None (0 Thinking Tokens)
                    </option>
                    <option value="low" className="bg-slate-900 text-white">
                      Low (~4,000 Thinking Tokens)
                    </option>
                    <option value="medium" className="bg-slate-900 text-white">
                      Medium (~16,000 Thinking Tokens)
                    </option>
                    <option value="high" className="bg-slate-900 text-white">
                      High (~32,000+ Thinking Tokens)
                    </option>
                  </>
                ) : (
                  <option value="none" className="bg-slate-900 text-white">
                    Standard (No Reasoning Budget)
                  </option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {activeModelMeta.supportsThinking
                ? `Allocates ${bounds.thinkingBudgetTokens.toLocaleString()} tokens for internal chain-of-thought`
                : "This model executes standard deterministic generation"}
            </p>
          </div>
        </div>

        {/* Researched Token Bounds Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              Mathematical Zero-Cutoff Token Invariant Bounds for {bounds.displayName}:
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
              T_max = T_input + T_thinking + T_output = {bounds.totalMaxTokens.toLocaleString()} tokens
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Total Upper Bound (T_max)</span>
              <span className="text-cyan-400 font-bold text-sm">{bounds.totalMaxTokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Min Barrier (T_min)</span>
              <span className="text-slate-200 font-bold text-sm">{bounds.minRequiredTokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Input + Files Cap</span>
              <span className="text-slate-200 font-bold text-sm">{bounds.maxInputAndFileTokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Thinking Budget</span>
              <span className="text-purple-400 font-bold text-sm">{bounds.thinkingBudgetTokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Max Completion</span>
              <span className="text-slate-200 font-bold text-sm">{bounds.maxOutputTokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Context Window</span>
              <span className="text-indigo-400 font-bold text-sm">{Math.round(bounds.contextWindow / 1000)}k</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: ELIGIBLE ARKIV SELLERS TABLE WITH "PROMPT NOW" BUTTON            */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Eligible Arkiv Verified Sellers
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                  {eligibleSellers.length} verified node{eligibleSellers.length === 1 ? "" : "s"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Only sellers with available quota Q &ge; T_max ({bounds.totalMaxTokens.toLocaleString()} tokens) are listed.
                Click <strong>Prompt Now</strong> beside any seller to open the Confidential Prompt Studio.
              </p>
            </div>
          </div>

          {selectedSeller && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Node: <strong>{selectedSeller.ensName}</strong></span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingSellers && (
          <div className="p-8 text-center text-slate-400 space-y-2 animate-pulse">
            <Database className="w-6 h-6 mx-auto text-indigo-400 animate-spin" />
            <p className="text-xs">Querying Arkiv decentralized storage for verified seller nodes...</p>
          </div>
        )}

        {/* Empty State: No eligible sellers */}
        {!loadingSellers && eligibleSellers.length === 0 && (
          <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              No Arkiv sellers currently meet the Zero-Cutoff Invariant for {activeModelMeta.name} (Q &ge; {bounds.totalMaxTokens.toLocaleString()} tokens)
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              To guarantee your prompt will never be terminated midway, ShunyaGrid requires sellers to hold at least T_max available tokens for the chosen model.
            </p>

            {activeOrderbookModels.length > 0 && (
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-emerald-500/40 space-y-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Active Verified Sellers are currently online on the Arkiv Orderbook for:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeOrderbookModels.map((item) => (
                    <button
                      key={item.modelId}
                      type="button"
                      onClick={() => selectModelDirectly(item.provider, item.modelId)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm"
                    >
                      <span>Switch to {item.modelName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900 text-[10px] text-emerald-200">
                        {item.count} node{item.count === 1 ? "" : "s"} (${(item.lowestRate / 1000000).toFixed(4)}/1k)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
              <li>Select a lower Thinking Budget Level (e.g. Low or None) to reduce T_max.</li>
              <li>Choose a different model from the dropdown above.</li>
              <li>
                <Link href="/seller" className="text-cyan-400 underline hover:text-cyan-300">
                  List your own API key as a seller node in the Seller Hub
                </Link>{" "}
                with sufficient quota to fulfill this tier.
              </li>
            </ul>
          </div>
        )}

        {/* Sellers Table */}
        {!loadingSellers && eligibleSellers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Seller Node / ENS</th>
                  <th className="py-3 px-3">Available Quota</th>
                  <th className="py-3 px-3">Rate / 1k</th>
                  <th className="py-3 px-3">Upfront Deposit (T_max)</th>
                  <th className="py-3 px-3">Payout Account</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {eligibleSellers.map((seller) => {
                  const isCurrent = selectedSeller?.id === seller.id;
                  const sellerDepositUsdc = (bounds.totalMaxTokens / 1000) * (seller.pricePer1kMicroUsdc / 1_000_000);

                  return (
                    <tr
                      key={seller.id}
                      className={`transition ${
                        isCurrent
                          ? "bg-indigo-950/40 border-l-2 border-indigo-500"
                          : "hover:bg-slate-900/60"
                      }`}
                    >
                      {/* Node & ENS */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{seller.ensName}</span>
                          {seller.ensName?.endsWith(".eth") && !seller.ensName?.endsWith(".shunyagrid.eth") ? (
                            <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1 py-0.2 rounded font-mono">
                              ENS
                            </span>
                          ) : (
                            <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-1 py-0.2 rounded font-mono">
                              SUB
                            </span>
                          )}
                          {seller.humanVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                              <Shield className="w-2.5 h-2.5" /> World ID
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-sans block mt-0.5 truncate max-w-[200px]" title={seller.ownerAddress}>
                          Owner: {seller.ownerAddress.slice(0, 8)}...{seller.ownerAddress.slice(-6)}
                        </span>
                      </td>

                      {/* Quota */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                          <span>{seller.availableTokens.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-normal">tokens</span>
                        </div>
                        <div className="w-28 bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (seller.availableTokens / (bounds.totalMaxTokens * 1.5)) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                        ${(seller.pricePer1kMicroUsdc / 1_000_000).toFixed(4)}
                      </td>

                      {/* Upfront Deposit */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-cyan-400">${sellerDepositUsdc.toFixed(4)}</span>
                        <span className="text-[10px] text-slate-400 block">x402 escrow</span>
                      </td>

                      {/* Payout */}
                      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {seller.hedaraPayoutAccount}
                      </td>

                      {/* Action: Prompt Now Button */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs whitespace-nowrap">
                            <Check className="w-3.5 h-3.5" />
                            Selected
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromptNow(seller)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition transform active:scale-95 whitespace-nowrap flex-shrink-0"
                          >
                            <Zap className="w-3.5 h-3.5 text-cyan-200 flex-shrink-0" />
                            <span className="whitespace-nowrap font-bold">Prompt Now</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5 flex-shrink-0" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: CONFIDENTIAL PROMPT STUDIO & FILE DROP (UNLOCKED AFTER PROMPT NOW) */}
      {/* ========================================================================= */}
      <div ref={studioRef} className="space-y-6">
        {!selectedSeller ? (
          /* Locked State Placeholder when no seller is chosen yet */
          <div className="glass-panel p-8 sm:p-10 rounded-2xl border border-dashed border-slate-800 text-center space-y-4 bg-slate-950/40">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Step 3: Confidential Prompt Studio is Locked
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Please select your desired AI model in Step 1, then click the <strong>&ldquo;Prompt Now&rdquo;</strong> button beside an eligible seller node in Step 2 to configure your prompt and upload files.
              </p>
            </div>
            {eligibleSellers.length > 0 && (
              <button
                onClick={() => handlePromptNow(eligibleSellers[0])}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-300" />
                Prompt with {eligibleSellers[0].ensName}
              </button>
            )}
          </div>
        ) : (
          /* Unlocked Confidential Prompt Studio & File Drop */
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Top Active Seller Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Active Seller Node:</span>
                    <span className="text-sm font-bold text-white font-mono">{selectedSeller.ensName}</span>
                    <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50 font-mono">
                      Hedera {selectedSeller.hedaraPayoutAccount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Available Quota: <strong className="text-slate-200">{selectedSeller.availableTokens.toLocaleString()} tokens</strong> &bull; Locked for T_max: <strong className="text-cyan-400">{bounds.totalMaxTokens.toLocaleString()} tokens</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Required Deposit</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">${upfrontUsdc.toFixed(4)} USDC</span>
                </div>
                <button
                  onClick={() => setSelectedSeller(null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Choose a different seller"
                >
                  Change Seller
                </button>
              </div>
            </div>

            {/* Prompt Text Input */}
            <div className="space-y-2 w-full max-w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Confidential Prompt</span>
                </label>
                <span className="text-xs font-mono text-slate-400 break-words">
                  ~{estimatedPromptTokens.toLocaleString()} prompt tokens ({promptText.length} chars)
                </span>
              </div>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={5}
                placeholder="Enter your confidential instructions or prompt here..."
                className="w-full max-w-full box-border bg-slate-950/90 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed transition resize-y min-w-0 break-words"
              />
            </div>

            {/* File Drop and Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Confidential File Drop & Attachments
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} attached (~{estimatedFileTokens.toLocaleString()} tokens)
                </span>
              </div>

              {/* Native Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-950/20"
                    : "border-slate-700 hover:border-slate-500 bg-slate-950/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                  <Upload className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-200">
                    Drag and drop files here, or <span className="text-cyan-400 underline">browse files</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Supports Solidity (.sol), Code (.ts, .py, .rs), Text (.txt, .md), JSON, PDF & Images. Sealed in Enclave RAM.
                  </p>
                </div>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {attachedFiles.map((f, idx) => {
                    const estTokens = f.type.startsWith("image/") ? 800 : Math.max(50, Math.ceil(f.size / 4));
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <div className="truncate">
                            <span className="text-slate-200 font-mono block truncate font-medium">{f.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(f.size / 1024).toFixed(1)} KB &bull; ~{estTokens} tokens
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Multi-Currency & Multi-Chain Payment Selector (Powered by Uniswap V3) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">Payment Asset & Network</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    Uniswap V3 Routed
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  {isFetchingQuote ? (
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Quoting Uniswap V3...
                    </span>
                  ) : (
                    <span>
                      Total Required: <strong className="text-cyan-300 font-bold">{paymentQuote.amountFormatted}</strong>{" "}
                      <span className="text-slate-500 text-[11px]">(${upfrontUsdc.toFixed(4)} USD)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Currency Selector Pills */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { symbol: "USDC", name: "USD Coin", badge: "Direct" },
                  { symbol: "ETH", name: "Ethereum", badge: "Native" },
                  { symbol: "DAI", name: "Dai", badge: "Uniswap" },
                  { symbol: "USDT", name: "Tether", badge: "Uniswap" },
                  { symbol: "UNI", name: "Uniswap", badge: "Uniswap" },
                ].map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => setPaymentCurrency(token.symbol)}
                    className={`p-2 rounded-xl border text-xs font-medium text-center transition ${
                      paymentCurrency === token.symbol
                        ? "border-cyan-500 bg-cyan-500/15 text-white shadow-sm"
                        : "border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold">{token.symbol}</div>
                    <div className="text-[9px] text-slate-500 uppercase">{token.badge}</div>
                  </button>
                ))}
              </div>

              {/* Chain Selector */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] text-slate-400">Payment Chain:</span>
                {[
                  { id: "ethereum-sepolia", name: "Ethereum Sepolia" },
                  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia" },
                  { id: "base-sepolia", name: "Base Sepolia" },
                ].map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => setPaymentChain(chain.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition ${
                      paymentChain === chain.id
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 font-semibold"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white"
                    }`}
                  >
                    {chain.name}
                  </button>
                ))}
                {paymentQuote.isSwap && (
                  <span className="ml-auto text-[11px] font-mono text-amber-300/90 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Auto-swapped via Uniswap V3 into Treasury
                  </span>
                )}
              </div>
            </div>

            {/* Sepolia Network & Circle USDC Balance Warning Banners */}
            {paymentCurrency === "USDC" && paymentChain === "ethereum-sepolia" && walletAddress && !isSepoliaNetwork && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Your wallet is not connected to Ethereum Sepolia. Switch to pay with Circle testnet USDC.</span>
                </div>
                <button
                  onClick={switchToSepolia}
                  disabled={isSwitchingNetwork}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs shrink-0 transition"
                >
                  {isSwitchingNetwork ? "Switching..." : "Switch to Sepolia"}
                </button>
              </div>
            )}

            {paymentCurrency === "USDC" && paymentChain === "ethereum-sepolia" && walletAddress && isSepoliaNetwork && usdcBalance !== null && usdcBalance < upfrontUsdc && (
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Your Sepolia USDC balance (${usdcBalance.toFixed(2)}) is less than the required upfront deposit (${upfrontUsdc.toFixed(4)} USDC).
                  </span>
                </div>
                <a
                  href={CIRCLE_FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
                >
                  Claim Free USDC from Circle <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Token Safety & Budget Check */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total Input Payload:</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    ~{totalEstimatedInputTokens.toLocaleString()} tokens
                  </span>
                  <span className="text-xs text-slate-500">/ max {bounds.maxInputAndFileTokens.toLocaleString()} tokens</span>
                </div>
                {!isInputWithinLimits ? (
                  <p className="text-xs text-red-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Input payload exceeds model's T_input cap ({bounds.maxInputAndFileTokens.toLocaleString()} tokens). Please shorten prompt or files.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Payload comfortably fits within input bounds. Zero cutoff risk.
                  </p>
                )}
              </div>

              {/* Action Button */}
              <button
                disabled={!selectedSeller || !isInputWithinLimits || isExecuting || !promptText.trim()}
                onClick={() => executePrompt()}
                className={`px-6 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg flex items-center justify-center gap-2 transition ${
                  !selectedSeller || !isInputWithinLimits || isExecuting || !promptText.trim()
                    ? "opacity-50 cursor-not-allowed bg-slate-800"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30"
                }`}
              >
                <Shield className="w-4 h-4 text-cyan-300" />
                {isExecuting
                  ? "Executing Sealed Inference..."
                  : !walletAddress
                  ? `Connect Wallet & Lock (${paymentQuote.amountFormatted})`
                  : !worldIdVerified
                  ? `Verify World ID & Lock (${paymentQuote.amountFormatted})`
                  : `Sign in MetaMask & Lock (${paymentQuote.amountFormatted})`}
              </button>
            </div>

            {/* Execution Progress Banner */}
            {isExecuting && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs font-mono text-cyan-300 space-y-1 animate-pulse">
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  {executionStep}
                </div>
              </div>
            )}

            {/* Decrypted Results Card */}
            {decryptedResult && executionResult && (
              <div className="glass-panel p-6 rounded-2xl border border-emerald-500/40 space-y-6 mt-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Decrypted AI Output (Local Browser Custody)
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                    Decrypted via local K_return
                  </span>
                </div>

                {/* Reasoning Tokens Trace */}
                {decryptedResult.reasoningText && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-900/50 space-y-2">
                    <span className="text-xs text-indigo-400 font-mono font-bold block">
                      🧠 Frontier Reasoning Process ({selectedModel}):
                    </span>
                    <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {decryptedResult.reasoningText}
                    </div>
                  </div>
                )}

                {/* Final Synthesized Output */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-xs text-cyan-400 font-mono font-bold block">
                    ⚡ Final Synthesized Response:
                  </span>
                  <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                    {decryptedResult.aiOutputText}
                  </div>
                </div>

                {/* Token Settlement Accounting Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Tokens Reserved (T_max)</span>
                    <span className="font-bold text-slate-200">
                      {executionResult.tokenAccounting.tMaxReserved.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Actual Used (T_used)</span>
                    <span className="font-bold text-cyan-400">
                      {executionResult.tokenAccounting.tUsedActual.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Seller Payout</span>
                    <span className="font-bold text-emerald-400">
                      ${executionResult.tokenAccounting.sellerPayoutUsdc.toFixed(6)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Refund / Fee</span>
                    <span className="font-bold text-indigo-400">
                      ${executionResult.tokenAccounting.protocolCommissionUsdc.toFixed(6)}
                    </span>
                  </div>
                </div>

                {/* Proofs & Dual Verified On-Chain Receipts */}
                <div className="pt-3 border-t border-slate-800 space-y-3 text-xs font-mono">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Dual Verified On-Chain Receipts & Audit Consensus:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. Ethereum Sepolia Payment Receipt */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-indigo-400" />
                          Ethereum Sepolia (Circle USDC)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                          Buyer Payment
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 break-all">
                        Tx: {executionResult.sepoliaPayment?.txHash || executionResult.hederaSettlement?.buyerSepoliaTxHash || buyerSepoliaTxHash || executionResult.hederaSettlement?.buyerX402TxId}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          Amount: ${(executionResult.sepoliaPayment?.amountUsdc || upfrontUsdc).toFixed(6)} USDC
                        </span>
                        {(executionResult.sepoliaPayment?.etherscanUrl || executionResult.hederaSettlement?.sepoliaEtherscanUrl || buyerSepoliaTxHash) && (
                          <a
                            href={executionResult.sepoliaPayment?.etherscanUrl || executionResult.hederaSettlement?.sepoliaEtherscanUrl || `https://sepolia.etherscan.io/tx/${buyerSepoliaTxHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-bold text-[11px]"
                          >
                            View on Etherscan
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 2. Hedera HCS Consensus Proof */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          Hedera HCS Audit Consensus
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                          Seq #{executionResult.hederaSettlement?.hcsSequenceNumber || "1"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Topic: <span className="text-slate-200">{executionResult.hederaSettlement?.hcsTopicId || HEDERA_HCS_TOPIC_ID}</span>
                        {executionResult.hederaSettlement?.consensusTimestamp && (
                          <span className="block text-[10px] text-slate-500">
                            Time: {executionResult.hederaSettlement.consensusTimestamp}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          Payout: {executionResult.hederaSettlement?.sellerPayoutTxId?.slice(0, 14)}...
                        </span>
                        <a
                          href={executionResult.hederaSettlement?.hashscanUrl || `https://hashscan.io/testnet/topic/${HEDERA_HCS_TOPIC_ID}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-bold text-[11px]"
                        >
                          View on HashScan
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 3. 0G Enclave Attestation Receipt */}
                  {executionResult.zeroGVerification && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-400">0G Hardware Enclave Attestation:</span>
                        <span className="font-mono text-emerald-300">
                          {executionResult.zeroGVerification.attestationHash?.slice(0, 18)}...
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Enclave: {executionResult.zeroGVerification.enclaveId || "0G-TEE-IntelSGX-V2"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* World ID Verification Modal */}
      <WorldIdModal
        isOpen={showWorldIdModal}
        onClose={() => {
          setShowWorldIdModal(false);
          setPendingAutoLock(false);
        }}
        onSuccess={handleWorldIdSuccess}
      />

      {/* How It Works Pop Up Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
        initialTab="buyer"
      />
    </div>
  );
}
