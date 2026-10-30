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
} from "@shunya/core/tokenBoundsCatalog";
import {
  Cpu,
  Shield,
  Lock,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
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
  Loader2,
  Copy,
  BrainCircuit,
  Sparkles,
} from "lucide-react";
import {
  sealBuyerPromptAndFilesInBrowser,
  decryptBuyerOutputInBrowser,
} from "@/lib/clientCrypto";
import { useAuth } from "@/context/AuthContext";
import WorldIdModal from "@/components/WorldIdModal";
import HowItWorksModal from "@/components/HowItWorksModal";
import SpatialCard from "@/components/SpatialCard";
import AnonRpcStatusBadge from "@/components/AnonRpcStatusBadge";
import AntigravityStagger from "@/components/AntigravityStagger";
import {
  CIRCLE_FAUCET_URL,
  switchOrAddSepoliaNetwork,
  fetchSepoliaUsdcBalance,
  switchOrAddHashKeyNetwork,
  fetchHashKeyHskBalance,
  waitForSepoliaConfirmation,
  executeBuyerUniversalPayment,
} from "@/lib/clientSepolia";

export default function BuyerStudioPage() {
  const {
    isAuthenticated,
    walletAddress,
    walletChainId,
    worldIdVerified,
    connectWallet,
  } = useAuth();

  // Cascading Selection State
  const [selectedProvider, setSelectedProvider] = useState<string>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet");
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");
  const [showWorldIdModal, setShowWorldIdModal] = useState<boolean>(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);
  const [pendingAutoLock, setPendingAutoLock] = useState<boolean>(false);

  // Automated Refund State (when upstream AI API rejects after payment)
  const [refundReceipt, setRefundReceipt] = useState<any | null>(null);
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);

  // On-Chain Balances State
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [hskBalance, setHskBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
  const [buyerSepoliaTxHash, setBuyerSepoliaTxHash] = useState<string | null>(null);

  // Multi-Currency & Multi-Chain Payment State (Defaults to HashKey Chain HSP)
  const [paymentCurrency, setPaymentCurrency] = useState<string>("HSK");
  const [paymentChain, setPaymentChain] = useState<string>("hashkey-testnet");
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [paymentQuote, setPaymentQuote] = useState<{
    amountFormatted: string;
    rateFormatted: string;
    isSwap: boolean;
  }>({
    amountFormatted: "$0.00",
    rateFormatted: "1 HSK ≈ $0.0894 USD (Uniswap Live)",
    isSwap: false,
  });

  const isSepoliaNetwork = walletChainId === "0xaa36a7" || walletChainId === "11155111";
  const isHashKeyNetwork = walletChainId === "0x85" || walletChainId === "133";

  const refreshBalances = async () => {
    if (!walletAddress) {
      setUsdcBalance(null);
      setHskBalance(null);
      return;
    }
    try {
      setIsLoadingBalance(true);
      const [usdc, hsk] = await Promise.all([
        fetchSepoliaUsdcBalance(walletAddress),
        fetchHashKeyHskBalance(walletAddress),
      ]);
      setUsdcBalance(usdc);
      setHskBalance(hsk);
    } catch (err) {
      console.warn("Could not query on-chain balances:", err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const refreshUsdcBalance = refreshBalances;

  const switchToHashKey = async () => {
    setIsSwitchingNetwork(true);
    try {
      const ok = await switchOrAddHashKeyNetwork();
      if (ok) {
        setTimeout(refreshBalances, 1000);
      }
    } finally {
      setIsSwitchingNetwork(false);
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
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

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
      const res = await fetch(`/api/listings?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.listings)) {
        const seen = new Set<string>();
        const unique = data.listings.filter((s: any) => {
          if (!s.id) return true;
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setAllOrderbookListings(unique);
        return unique;
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

  // On initial mount: read URL query parameters or auto-select active model
  useEffect(() => {
    let urlModelMatched = false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlModel = params.get("model");
      const urlThinking = params.get("thinking");
      if (urlModel) {
        const meta = getModelMetadata(urlModel);
        if (meta) {
          setSelectedProvider(meta.provider);
          setSelectedModel(meta.id);
          if (urlThinking && ["none", "low", "medium", "high"].includes(urlThinking)) {
            setThinkingLevel(urlThinking as ThinkingLevel);
          } else {
            setThinkingLevel(meta.supportsThinking ? "medium" : "none");
          }
          urlModelMatched = true;
        }
      }
    }

    fetchAllOrderbookListings().then((all) => {
      if (urlModelMatched) return;
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
    let isCancelled = false;

    const fetchSellers = (showSpinner: boolean = true) => {
      if (showSpinner) setLoadingSellers(true);
      fetch(`/api/listings?model=${selectedModel}&tMax=${bounds.totalMaxTokens}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (isCancelled) return;
          const list = data.listings || [];
          const seedIds = new Set([
            "arkiv_entity_gemini_2_flash_thinking",
            "arkiv_entity_gemini_15_pro",
            "arkiv_entity_claude_37_sonnet",
            "arkiv_entity_o3_mini",
            "arkiv_entity_groq_deepseek_r1",
          ]);
          const seen = new Set<string>();
          const unique = list.filter((s: any) => {
            if (!s.id) return true;
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
          });

          // Prioritize: connected wallet node first, then user-created nodes, then best price
          unique.sort((a: any, b: any) => {
            const aIsMine = walletAddress && (a.payoutAddress || a.ownerAddress)?.toLowerCase() === walletAddress.toLowerCase() ? -1 : 0;
            const bIsMine = walletAddress && (b.payoutAddress || b.ownerAddress)?.toLowerCase() === walletAddress.toLowerCase() ? -1 : 0;
            if (aIsMine !== bIsMine) return aIsMine - bIsMine;

            const aIsSeed = seedIds.has(a.id) ? 1 : 0;
            const bIsSeed = seedIds.has(b.id) ? 1 : 0;
            if (aIsSeed !== bIsSeed) return aIsSeed - bIsSeed;

            return (a.pricePer1kMicroUsdc || 10000) - (b.pricePer1kMicroUsdc || 10000);
          });

          setEligibleSellers(unique);
          if (selectedSeller && !unique.find((s: any) => s.id === selectedSeller.id)) {
            setSelectedSeller(null);
          } else if (!selectedSeller && unique.length > 0) {
            const myNode = walletAddress
              ? unique.find(
                  (s: any) =>
                    (s.payoutAddress || s.ownerAddress)?.toLowerCase() === walletAddress.toLowerCase()
                )
              : null;
            setSelectedSeller(myNode || unique[0]);
          }
          if (showSpinner) setLoadingSellers(false);
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Failed to query orderbook:", err);
          if (showSpinner) setLoadingSellers(false);
        });

      fetchAllOrderbookListings();
    };

    fetchSellers(true);
    const interval = setInterval(() => fetchSellers(false), 6000);
    const onFocus = () => fetchSellers(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [selectedModel, bounds.totalMaxTokens, walletAddress]);

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

  const handleThinkingChange = (newLevel: ThinkingLevel) => {
    setThinkingLevel(newLevel);
    setSelectedSeller(null);
    setExecutionResult(null);
    setDecryptedResult(null);
  };

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

  const handlePromptNow = (seller: any) => {
    setSelectedSeller(seller);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

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
            const unitsNeeded = (upfrontUsdc / usdcPerToken) * 1.005;
            const formattedRate = data.liveMarket?.rateFormatted || (usdcPerToken < 1 ? `1 ${paymentCurrency} ≈ $${usdcPerToken.toFixed(4)} USDC` : `1 ${paymentCurrency} ≈ $${usdcPerToken.toFixed(2)} USDC`);
            setPaymentQuote({
              amountFormatted: `${unitsNeeded < 0.001 ? unitsNeeded.toFixed(6) : unitsNeeded.toFixed(4)} ${paymentCurrency}`,
              rateFormatted: formattedRate,
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

    let activeBuyerAddress =
      forcedAddress ||
      walletAddress ||
      (typeof window !== "undefined" ? (window as any).ethereum?.selectedAddress : null);

    if (!activeBuyerAddress) {
      const ok = await connectWallet();
      if (!ok) return;
      activeBuyerAddress =
        (typeof window !== "undefined" ? (window as any).ethereum?.selectedAddress : null) || walletAddress;
      if (!activeBuyerAddress) return;
    }

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
      setExecutionStep("Sealing prompt & documents with AES-256-GCM in client RAM...");
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

      // Phase 2: Authentic On-Chain Multi-Currency Payment
      setExecutionStep(`Preparing MetaMask ${paymentCurrency} payment on ${paymentChain}...`);

      if (!activeBuyerAddress) {
        throw new Error("Wallet not connected. Please connect your Web3 wallet.");
      }

      setExecutionStep(
        paymentCurrency === "USDC"
          ? `Please sign the $${upfrontUsdc.toFixed(4)} USDC payment in MetaMask...`
          : `Please approve and sign the ${paymentCurrency} payment in MetaMask...`
      );

      const paymentResult = await executeBuyerUniversalPayment({
        buyerAddress: activeBuyerAddress,
        requiredMicroUsdc: upfrontMicroUsdc,
        tokenSymbol: paymentCurrency,
        chainKey: paymentChain,
      });

      const confirmedTxHash = paymentResult.txHash;
      setExecutionStep(`Payment broadcasted (${confirmedTxHash.slice(0, 10)}...). Waiting for block confirmation...`);
      await waitForSepoliaConfirmation(confirmedTxHash, paymentChain, 45000);

      setBuyerSepoliaTxHash(confirmedTxHash);
      setExecutionStep(`Payment confirmed. Enclave verifying transaction receipt...`);

      refreshUsdcBalance();

      // Phase 3: Sealed Enclave Execution
      setExecutionStep("Confidential Hardware Enclave executing inference with zero seller visibility...");
      const executeRes = await fetch("/api/blind-execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-402-Payment-TxId": confirmedTxHash,
          "X-Payment-Chain": paymentChain,
          "X-Payment-Token": paymentCurrency,
        },
        body: JSON.stringify({
          modelId: selectedModel,
          thinkingLevel,
          listingId: selectedSeller.id,
          encryptedEnvelope,
          paymentTxId: confirmedTxHash,
          buyerAddress: activeBuyerAddress,
          paymentCurrency,
          paymentChain,
        }),
      });

      if (!executeRes.ok) {
        const errJson = await executeRes.json().catch(() => ({}));
        if (errJson.refunded && errJson.refund) {
          setRefundReceipt(errJson.refund);
          setShowRefundModal(true);
          refreshUsdcBalance();
          const tokenFormatted =
            errJson.refund.refundAmountTokenFormatted ||
            (errJson.refund.refundAmountToken
              ? `${errJson.refund.refundAmountToken.toFixed(4)} ${errJson.refund.tokenSymbol || paymentCurrency || "HSK"}`
              : `${(errJson.refund.refundAmountUsdc / 0.0894).toFixed(4)} ${paymentCurrency || "HSK"}`);
          setExecutionStep(`API Rejected: 100% Refund of ${tokenFormatted} returned on-chain.`);
          return;
        }
        throw new Error(errJson.error || errJson.reason || "Enclave inference execution failed");
      }

      const executeData = await executeRes.json();
      setExecutionResult(executeData);

      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("shunyagrid_settlement_completed", { detail: executeData })
          );
          localStorage.setItem("shunyagrid_last_settlement_at", Date.now().toString());

          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("shunyagrid_channel");
            bc.postMessage({ type: "settlement_completed", detail: executeData });
            bc.close();
          }
        } catch (syncErr) {
          console.warn("[Buyer] Failed to dispatch balance sync event:", syncErr);
        }
      }

      // Phase 4: Local Decryption with K_return
      setExecutionStep("Decrypting sealed AI output locally in browser with K_return...");
      await new Promise((r) => setTimeout(r, 400));

      const decrypted = await decryptBuyerOutputInBrowser(
        executeData.encryptedOutput.encryptedOutputBase64,
        executeData.encryptedOutput.ivHex,
        executeData.encryptedOutput.authTagHex,
        buyerLocalReturnKeyBase64
      );

      setDecryptedResult(decrypted);
      setExecutionStep("Completed successfully with zero privacy leaks.");
    } catch (err: any) {
      console.error(err);
      alert(`Error during execution: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch (err) {
      console.warn("Failed to copy:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24 space-y-24 sm:space-y-36 text-zinc-900 dark:text-zinc-100">
      {/* Hero Header */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-200 border border-white/10 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-300" />
            100% Private & Encrypted
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Guaranteed Full Response
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900/80 text-zinc-300 border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring-emerald" />
            HashKey Horizon Block #35,100,370+ • Oct 31, 2026
          </span>
        </div>
        <div className="space-y-3.5 sm:space-y-4">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            AI Playground & Studio
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            Ask frontier AI models anything with total privacy and zero monthly commitments. Your prompts and files are encrypted directly in your browser before leaving your device.
          </p>
        </div>

        {/* Global Status Bar */}
        <div className="flex flex-wrap items-center gap-3.5 pt-3">
          {/* EF Anon-RPC Transport Badge */}
          <AnonRpcStatusBadge />

          {/* HashKey Chain Network Badge */}
          {walletAddress && (
            isHashKeyNetwork ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring-emerald" />
                <span className="font-semibold">HashKey Testnet (133)</span>
              </div>
            ) : (
              <button
                onClick={switchToHashKey}
                disabled={isSwitchingNetwork}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-600/40 text-xs text-emerald-300 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isSwitchingNetwork ? "Switching..." : "Switch to HashKey (HSK)"}</span>
              </button>
            )
          )}

          {/* HashKey Native HSK Balance */}
          {walletAddress && hskBalance !== null && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full liquid-glass-pill text-xs">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-semibold tabular-data">
                {hskBalance.toFixed(3)} HSK
              </span>
              <a
                href="https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"
                target="_blank"
                rel="noreferrer"
                title="View HSP Adapter on Blockscout"
                className="text-[11px] text-zinc-400 hover:text-white underline flex items-center gap-0.5 ml-1"
              >
                HSP <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}


          {/* World ID Verification Status */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full liquid-glass-pill text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring-emerald" />
              <span className="text-zinc-200 font-semibold tabular-data">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
              </span>
              <span className="text-emerald-400 font-medium">• Human Verified</span>
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
              className="btn-primary-apple px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{!walletAddress ? "Connect Wallet" : "Verify Human"}</span>
            </button>
          )}

          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="btn-secondary-apple px-4 py-2 text-xs font-medium flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>How It Works</span>
          </button>
        </div>
      </SpatialCard>

      {/* STEP 1: MODEL & REASONING CONFIGURATION */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Stage 1 of 3</span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Target Model & Reasoning Depth
            </h2>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-800/40 font-medium self-start sm:self-auto">
            Guaranteed Completion
          </span>
        </div>

        {/* AI Provider Switcher */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            Select Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {PROVIDERS.map((p) => {
              const isCurrent = selectedProvider === p.id;
              const nodeCount = allOrderbookListings.filter(
                (l) => l.status === "active" && (getModelMetadata(l.model)?.provider === p.id || l.provider === p.id)
              ).length;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-5 sm:p-6 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? "bg-white text-black font-semibold border-white"
                      : "liquid-glass-interactive border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className={`text-xs ${isCurrent ? "text-zinc-700 font-medium" : "text-zinc-500"}`}>
                    {nodeCount > 0 ? `${nodeCount} active node${nodeCount === 1 ? "" : "s"}` : "Standby"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Active Model Switcher Chips */}
        {activeOrderbookModels.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring-emerald" />
                Active Models Online ({activeOrderbookModels.reduce((acc, m) => acc + m.count, 0)} Verified Nodes Across Devices)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {activeOrderbookModels.map((item) => {
                const isSelected = selectedModel === item.modelId;
                return (
                  <button
                    key={item.modelId}
                    type="button"
                    onClick={() => selectModelDirectly(item.provider, item.modelId)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{item.modelName}</span>
                    <span className={`text-[10px] tabular-data ${isSelected ? "text-zinc-700 font-bold" : "text-zinc-500"}`}>
                      ({item.count} online)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Model Selection & Thinking Budget Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 pt-2">
          {/* Model Selector Card */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                Target AI Model
              </span>
              <span className="text-xs text-zinc-500 font-normal">
                {availableModels.length} models available
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-[#121316] border border-white/10 hover:border-white/20 focus:border-white/40 rounded-2xl px-5 py-4 text-sm text-white font-medium outline-none transition cursor-pointer appearance-none"
              >
                {availableModels.map((m) => {
                  const nodeCount = allOrderbookListings.filter(
                    (l) => l.status === "active" && l.model === m.id
                  ).length;
                  return (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                      {m.name} ({Math.round(m.contextWindow / 1000)}k ctx) {nodeCount > 0 ? `(${nodeCount} online)` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-400 text-xs">
                ▼
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {activeModelMeta.description}
            </p>
          </div>

          {/* Thinking Budget Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                Reasoning Depth Budget
              </span>
              <span className="text-xs text-zinc-500 font-normal">
                {activeModelMeta.supportsThinking ? "Thinking Mode Enabled" : "Direct Mode (Fast)"}
              </span>
            </label>

            {activeModelMeta.supportsThinking ? (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: "none" as ThinkingLevel, label: "None", tokens: "0 tok" },
                  { id: "low" as ThinkingLevel, label: "Low", tokens: "~4k tok" },
                  { id: "medium" as ThinkingLevel, label: "Medium", tokens: "~16k tok" },
                  { id: "high" as ThinkingLevel, label: "High", tokens: "~32k tok" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleThinkingChange(lvl.id)}
                    className={`py-3 px-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      thinkingLevel === lvl.id
                        ? "bg-white text-black font-semibold border-white"
                        : "liquid-glass-interactive border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs capitalize font-medium">{lvl.label}</span>
                    <span className={`text-[10px] tabular-data ${thinkingLevel === lvl.id ? "text-zinc-700" : "text-zinc-500"}`}>{lvl.tokens}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] text-xs text-zinc-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>This model answers directly without extra thinking steps.</span>
              </div>
            )}
            <p className="text-xs text-zinc-400">
              {activeModelMeta.supportsThinking
                ? `Allocates ${bounds.thinkingBudgetTokens.toLocaleString()} tokens for deep reasoning.`
                : "Executes directly without chain-of-thought overhead."}
            </p>
          </div>
        </div>

        {/* Mathematical Zero-Cutoff Invariant Spec */}
        <div className="p-6 sm:p-7 rounded-2xl bg-black/50 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-4 h-4 text-zinc-400" />
            <span className="font-semibold text-white">Reserved Token Capacity:</span>
            <span className="text-white font-bold tabular-data text-sm">
              {bounds.totalMaxTokens.toLocaleString()} tokens
            </span>
          </div>

          <div className="flex items-center gap-3.5 text-zinc-400 text-xs">
            <span>Thinking: <strong className="text-zinc-200 tabular-data">{bounds.thinkingBudgetTokens.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Input Cap: <strong className="text-zinc-200 tabular-data">{bounds.maxInputAndFileTokens.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Context: <strong className="text-zinc-200 tabular-data">{Math.round(bounds.contextWindow / 1000)}k</strong></span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[11px] font-medium hidden sm:inline-block">
              Guaranteed Full Response
            </span>
          </div>
        </div>
      </SpatialCard>

      {/* STEP 2: VERIFIED PROVIDER NODES TABLE */}
      <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Stage 2 of 3</span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Available AI Providers
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({eligibleSellers.length} qualified)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2.5 leading-relaxed">
              Only providers with enough verified token capacity ({bounds.totalMaxTokens.toLocaleString()} tokens) are listed, ensuring your answer never cuts off.
            </p>
          </div>

          {selectedSeller && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400 font-medium self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Selected: {selectedSeller.ensName}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingSellers && (
          <div className="p-12 text-center text-zinc-400 space-y-3">
            <Loader2 className="w-7 h-7 mx-auto animate-spin text-zinc-300" />
            <p className="text-xs">Querying verified provider nodes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingSellers && eligibleSellers.length === 0 && (
          <div className="p-8 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-300 space-y-5">
            <div className="flex items-center gap-3 font-semibold text-sm text-white">
              <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
              No active providers currently have enough token capacity for {activeModelMeta.name} ({bounds.totalMaxTokens.toLocaleString()} tokens)
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To guarantee your query completes without interruption, we only match you with providers holding full capacity.
            </p>

            {activeOrderbookModels.length > 0 && (
              <div className="p-5 rounded-xl bg-black/60 border border-white/[0.08] space-y-3">
                <span className="text-xs font-medium text-zinc-300 block">
                  Nodes are currently online for other models:
                </span>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {activeOrderbookModels.map((item) => (
                    <button
                      key={item.modelId}
                      type="button"
                      onClick={() => selectModelDirectly(item.provider, item.modelId)}
                      className="btn-secondary-apple px-4 py-2 text-xs font-medium flex items-center gap-2"
                    >
                      <span>Switch to {item.modelName}</span>
                      <span className="text-zinc-400 tabular-data text-[11px]">
                        ({item.count} online)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sellers Table */}
        {!loadingSellers && eligibleSellers.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40" data-ui="table-wrapper">
            <table className="w-full text-left text-xs" data-ui="sellers-table">
              <thead className="bg-black/80 text-zinc-400 uppercase text-[11px] font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="py-4 px-6 sm:px-7">Provider</th>
                  <th className="py-4 px-6 sm:px-7">Available Tokens</th>
                  <th className="py-4 px-6 sm:px-7">Price / 1k</th>
                  <th className="py-4 px-6 sm:px-7">Estimated Deposit</th>
                  <th className="py-4 px-6 sm:px-7">Payout Address</th>
                  <th className="py-4 px-6 sm:px-7 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {eligibleSellers.map((seller) => {
                  const isCurrent = selectedSeller?.id === seller.id;
                  const sellerDepositUsdc = (bounds.totalMaxTokens / 1000) * (seller.pricePer1kMicroUsdc / 1_000_000);

                  return (
                    <tr
                      key={seller.id}
                      className={`transition ${
                        isCurrent
                          ? "bg-white/[0.06]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="py-5 px-6 sm:px-7">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-semibold text-white">{seller.ensName}</span>
                          {(seller.payoutAddress || seller.ownerAddress)?.toLowerCase() === walletAddress?.toLowerCase() && (
                            <span className="text-[10px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-800/40 font-semibold">
                              Your Node
                            </span>
                          )}
                          {seller.humanVerified && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40 font-medium">
                              Human Verified
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-5 px-6 sm:px-7 whitespace-nowrap">
                        <div className="font-semibold text-white tabular-data">
                          {seller.availableTokens.toLocaleString()} tokens
                        </div>
                      </td>

                      <td className="py-5 px-6 sm:px-7 text-zinc-300 whitespace-nowrap font-medium tabular-data">
                        ${(seller.pricePer1kMicroUsdc / 1_000_000).toFixed(4)}
                      </td>

                      <td className="py-5 px-6 sm:px-7 whitespace-nowrap font-bold text-white tabular-data">
                        ${sellerDepositUsdc.toFixed(4)}
                      </td>

                      <td className="py-5 px-6 sm:px-7 text-zinc-400 tabular-data text-xs">
                        {seller.payoutAddress || seller.hedaraPayoutAccount || seller.ownerAddress}
                      </td>

                      <td className="py-5 px-6 sm:px-7 text-right whitespace-nowrap">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs">
                            <Check className="w-3.5 h-3.5" />
                            Selected
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromptNow(seller)}
                            className="btn-primary-apple inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold"
                          >
                            <span>Select Provider</span>
                            <ArrowRight className="w-3.5 h-3.5" />
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
      </SpatialCard>

      {/* STEP 3: CONFIDENTIAL PROMPT STUDIO */}
      <div ref={studioRef} className="space-y-6">
        {!selectedSeller ? (
          <SpatialCard maxTilt={1.5} className="p-12 sm:p-16 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
              <Lock className="w-7 h-7 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                Confidential Prompt Studio
              </h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Choose an available provider in Stage 2 above to begin your private query.
              </p>
            </div>
            {eligibleSellers.length > 0 && (
              <button
                onClick={() => handlePromptNow(eligibleSellers[0])}
                className="btn-primary-apple px-6 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-black" />
                Prompt with {eligibleSellers[0].ensName}
              </button>
            )}
          </SpatialCard>
        ) : (
          <SpatialCard maxTilt={1.5} className="p-8 sm:p-14 space-y-10">
            {/* Active Node Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-black/60 border border-white/[0.08]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center">
                  <Shield className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Selected Provider:</span>
                    <span className="text-sm font-semibold text-white">{selectedSeller.ensName}</span>
                    <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                      Node {selectedSeller.payoutAddress || selectedSeller.ownerAddress}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Quota: <span className="text-zinc-200 tabular-data font-medium">{selectedSeller.availableTokens.toLocaleString()} tokens</span> • Upper bound: <span className="text-white tabular-data font-semibold">{bounds.totalMaxTokens.toLocaleString()} tokens</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase block">Estimated Deposit</span>
                  <span className="text-sm font-bold text-white tabular-data">${upfrontUsdc.toFixed(4)} USDC</span>
                </div>
                <button
                  onClick={() => setSelectedSeller(null)}
                  className="btn-secondary-apple px-4 py-2 text-xs font-medium"
                >
                  Change Provider
                </button>
              </div>
            </div>

            {/* Prompt Text Input */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>Your Prompt / Question</span>
                </label>
                <span className="text-xs text-zinc-500 tabular-data">
                  ~{estimatedPromptTokens.toLocaleString()} tokens ({promptText.length} chars)
                </span>
              </div>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={7}
                placeholder="Enter your confidential instructions or prompt here..."
                className="w-full bg-[#121316] border border-white/10 rounded-2xl p-5 sm:p-6 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30 leading-relaxed resize-y transition"
              />
            </div>

            {/* File Drop and Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-zinc-400" />
                  Attach Documents & Files (Optional)
                </label>
                <span className="text-xs text-zinc-500 tabular-data">
                  {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} attached (~{estimatedFileTokens.toLocaleString()} tokens)
                </span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-10 sm:p-14 rounded-2xl border border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-white bg-white/[0.05]"
                    : "border-white/15 hover:border-white/30 bg-black/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
                  <Upload className="w-6 h-6 text-zinc-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Drag and drop files here, or <span className="underline">browse files</span>
                  </p>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Supports Solidity, Python, TypeScript, Text, JSON & Images. Sealed in client RAM before dispatch.
                  </p>
                </div>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {attachedFiles.map((f, idx) => {
                    const estTokens = f.type.startsWith("image/") ? 800 : Math.max(50, Math.ceil(f.size / 4));
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-zinc-200 font-medium block truncate">{f.name}</span>
                            <span className="text-[10px] text-zinc-500 tabular-data">
                              {(f.size / 1024).toFixed(1)} KB • ~{estTokens} tokens
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Multi-Currency Payment Selector */}
            <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-white">Pay With (Token & Network)</span>
                </div>
                <div className="text-xs text-zinc-300 tabular-data">
                  {isFetchingQuote ? (
                    <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-400" /> Quoting Uniswap V3...
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>
                        Total Required: <strong className="text-white font-bold">{paymentQuote.amountFormatted}</strong>{" "}
                        <span className="text-zinc-500 text-[11px]">(${upfrontUsdc.toFixed(4)} USD)</span>
                      </span>
                      {paymentQuote.rateFormatted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono text-[10px]">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          {paymentQuote.rateFormatted}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Currency Selector Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { symbol: "HSK", name: "HashKey", badge: "HSP Native" },
                  { symbol: "USDC", name: "USD Coin", badge: "Direct" },
                  { symbol: "ETH", name: "Ethereum", badge: "Native" },
                  { symbol: "DAI", name: "Dai", badge: "Uniswap" },
                  { symbol: "USDT", name: "Tether", badge: "Direct/Swap" },
                  { symbol: "UNI", name: "Uniswap", badge: "Uniswap" },
                ].map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => {
                      setPaymentCurrency(token.symbol);
                      if (token.symbol === "HSK") {
                        setPaymentChain("hashkey-testnet");
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-medium text-center transition ${
                      paymentCurrency === token.symbol
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-[#121316] border-white/[0.08] text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold">{token.symbol}</div>
                    <div className={`text-[9px] uppercase ${paymentCurrency === token.symbol ? "text-zinc-600" : "text-zinc-500"}`}>{token.badge}</div>
                  </button>
                ))}
              </div>

              {/* Chain Selector */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] text-zinc-400">Payment Chain:</span>
                {[
                  { id: "hashkey-testnet", name: "HashKey Testnet (133)" },
                  { id: "ethereum-sepolia", name: "Ethereum Sepolia" },
                  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia" },
                  { id: "base-sepolia", name: "Base Sepolia" },
                ].map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => {
                      setPaymentChain(chain.id);
                      if (chain.id === "hashkey-testnet" && paymentCurrency !== "USDC" && paymentCurrency !== "USDT") {
                        setPaymentCurrency("HSK");
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full border text-[11px] transition ${
                      paymentChain === chain.id
                        ? "bg-emerald-950/60 text-emerald-300 font-semibold border-emerald-500/30"
                        : "bg-black/60 border-white/[0.06] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {chain.name}
                  </button>
                ))}
                {paymentQuote.isSwap && (
                  <span className="ml-auto text-[11px] text-zinc-400 flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3 text-zinc-400" /> Auto-swapped via Uniswap V3 into Treasury
                  </span>
                )}
              </div>
            </div>

            {/* Sepolia Network & USDC Balance Warning Banners */}
            {paymentCurrency === "USDC" && paymentChain === "ethereum-sepolia" && walletAddress && !isSepoliaNetwork && (
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/30 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Wallet is not connected to Ethereum Sepolia. Switch to pay with testnet USDC.</span>
                </div>
                <button
                  onClick={switchToSepolia}
                  disabled={isSwitchingNetwork}
                  className="px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-xs transition"
                >
                  {isSwitchingNetwork ? "Switching..." : "Switch to Sepolia"}
                </button>
              </div>
            )}

            {paymentCurrency === "USDC" && paymentChain === "ethereum-sepolia" && walletAddress && isSepoliaNetwork && usdcBalance !== null && usdcBalance < upfrontUsdc && (
              <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>
                    Sepolia USDC balance (${usdcBalance.toFixed(2)}) is less than the required upfront deposit (${upfrontUsdc.toFixed(4)} USDC).
                  </span>
                </div>
                <a
                  href={CIRCLE_FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary-apple px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  Get Free Testnet USDC <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Token Safety & Budget Check */}
            <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Total Input Payload:</span>
                  <span className="text-xs font-semibold text-white tabular-data">
                    ~{totalEstimatedInputTokens.toLocaleString()} tokens
                  </span>
                  <span className="text-xs text-zinc-500 tabular-data">/ max {bounds.maxInputAndFileTokens.toLocaleString()} tokens</span>
                </div>
                {!isInputWithinLimits ? (
                  <p className="text-xs text-red-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Input payload exceeds model&apos;s T_input cap ({bounds.maxInputAndFileTokens.toLocaleString()} tokens). Please shorten prompt or files.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Your prompt and files fit well within capacity. Full response guaranteed.
                  </p>
                )}
              </div>

              {/* Nike-Style Decisive Action Button */}
              <button
                disabled={!selectedSeller || !isInputWithinLimits || isExecuting || !promptText.trim()}
                onClick={() => executePrompt()}
                className={`btn-primary-apple px-8 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  !selectedSeller || !isInputWithinLimits || isExecuting || !promptText.trim()
                    ? "opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-400"
                    : ""
                }`}
              >
                <Shield className="w-4 h-4" />
                {isExecuting
                  ? "Running Encrypted Query..."
                  : !walletAddress
                  ? `Connect Wallet & Lock (${paymentQuote.amountFormatted})`
                  : !worldIdVerified
                  ? `Verify Human & Lock (${paymentQuote.amountFormatted})`
                  : `Run AI Query (${paymentQuote.amountFormatted})`}
              </button>
            </div>

            {/* Execution Progress Banner */}
            {isExecuting && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/20 text-xs text-zinc-200 space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>{executionStep}</span>
                </div>
              </div>
            )}

            {/* Automated Refund In-Page Card */}
            {refundReceipt && (
              <div className="p-6 rounded-3xl bg-zinc-900 border border-white/20 text-xs space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400 block">
                        Zero-Cutoff Escrow Protection
                      </span>
                      <h4 className="text-base font-bold text-white">
                        API Rejected • 100% Refund Issued On-Chain
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRefundModal(true)}
                      className="btn-secondary-apple px-3.5 py-1.5 text-xs font-medium"
                    >
                      Receipt Details
                    </button>
                    <button
                      onClick={() => setRefundReceipt(null)}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Dismiss notice"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Refund Recipient</span>
                    <span className="text-white font-semibold truncate block tabular-data" title={refundReceipt.recipientAccount}>
                      {refundReceipt.recipientAccount}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Amount Refunded</span>
                    <span className="text-emerald-400 font-bold text-sm block tabular-data">
                      {refundReceipt.refundAmountTokenFormatted ||
                        (refundReceipt.refundAmountToken
                          ? `${refundReceipt.refundAmountToken.toFixed(4)} ${refundReceipt.tokenSymbol || paymentCurrency || "HSK"}`
                          : `${(refundReceipt.refundAmountUsdc / 0.0894).toFixed(4)} ${paymentCurrency || "HSK"}`)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block pt-0.5 tabular-data">
                      (${Number(refundReceipt.refundAmountUsdc || 0).toFixed(4)} USD value)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Refund Tx</span>
                    <a
                      href={refundReceipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white font-semibold hover:underline truncate block flex items-center gap-1 tabular-data"
                    >
                      {refundReceipt.refundTxHash.slice(0, 14)}... <ExternalLink className="w-3 h-3 inline shrink-0" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  <strong>Rejection Detail:</strong> {refundReceipt.reason}
                </p>
              </div>
            )}

            {/* Decrypted Results Card */}
            {decryptedResult && executionResult && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d11] border border-white/20 space-y-6 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      Your AI Response (Private & Decrypted)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Decrypted safely in your browser. Nobody else could read your prompt or answer.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(decryptedResult.aiOutputText)}
                      className="btn-secondary-apple px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
                    >
                      {copiedOutput ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Copy Response</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-medium">
                      AES-256-GCM Verified
                    </span>
                  </div>
                </div>

                {/* Reasoning Tokens Trace */}
                {decryptedResult.reasoningText && (
                  <div className="p-5 rounded-2xl bg-black/60 border border-white/[0.08] space-y-2">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-zinc-400" />
                      Frontier Reasoning Process ({selectedModel})
                    </span>
                    <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {decryptedResult.reasoningText}
                    </div>
                  </div>
                )}

                {/* Final Synthesized Output */}
                <div className="p-6 rounded-2xl bg-black/60 border border-white/[0.08] space-y-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-zinc-300" />
                    Final Synthesized Output
                  </span>
                  <div className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                    {decryptedResult.aiOutputText}
                  </div>
                </div>

                {/* Token Settlement Accounting Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Tokens Reserved (T_max)</span>
                    <span className="font-semibold text-white text-sm tabular-data">
                      {executionResult.tokenAccounting.tMaxReserved.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Actual Used (T_used)</span>
                    <span className="font-semibold text-white text-sm tabular-data">
                      {executionResult.tokenAccounting.tUsedActual.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Seller Payout</span>
                    <span className="font-semibold text-emerald-400 text-sm tabular-data">
                      ${Number(executionResult.tokenAccounting.sellerPayoutUsdc || 0).toFixed(6)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[11px]">Protocol Commission</span>
                    <span className="font-semibold text-zinc-300 text-sm tabular-data">
                      ${Number(executionResult.tokenAccounting.protocolCommissionUsdc || 0).toFixed(6)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                  Settlement Breakdown: The seller received <span className="text-emerald-400 font-semibold tabular-data">${Number(executionResult.tokenAccounting.sellerPayoutUsdc || 0).toFixed(6)} USDC</span> for actual tokens used. The remaining balance of <span className="text-zinc-200 font-semibold tabular-data">${Number(executionResult.tokenAccounting.protocolCommissionUsdc || 0).toFixed(6)} USDC</span> is retained as protocol commission.
                </p>

                {/* Proofs & Dual Verified On-Chain Receipts */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3.5 text-xs">
                  <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Dual Verified On-Chain Receipts & Audit Consensus:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* 1. Ethereum Sepolia Payment Receipt */}
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col justify-between gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-zinc-400" />
                          Ethereum Sepolia (USDC)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-200">
                          Buyer Payment
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 break-all tabular-data">
                        Tx: {executionResult.sepoliaPayment?.txHash || executionResult.hashKeySettlement?.buyerSepoliaTxHash || buyerSepoliaTxHash || executionResult.hashKeySettlement?.buyerX402TxId}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <span className="text-xs text-zinc-400 tabular-data">
                          Amount: ${(executionResult.sepoliaPayment?.amountUsdc || upfrontUsdc).toFixed(6)} USDC
                        </span>
                        {(executionResult.sepoliaPayment?.etherscanUrl || executionResult.hashKeySettlement?.sepoliaEtherscanUrl || buyerSepoliaTxHash) && (
                          <a
                            href={
                              executionResult.sepoliaPayment?.etherscanUrl ||
                              executionResult.hashKeySettlement?.sepoliaEtherscanUrl ||
                              (paymentChain === "arbitrum-sepolia"
                                ? `https://sepolia.arbiscan.io/tx/${buyerSepoliaTxHash}`
                                : paymentChain === "base-sepolia"
                                ? `https://sepolia.basescan.org/tx/${buyerSepoliaTxHash}`
                                : paymentChain === "hashkey-testnet"
                                ? `https://testnet-explorer.hskchain.net/tx/${buyerSepoliaTxHash}`
                                : `https://sepolia.etherscan.io/tx/${buyerSepoliaTxHash}`)
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-white hover:underline flex items-center gap-1 font-semibold text-xs"
                          >
                            View on {paymentChain === "arbitrum-sepolia" ? "Arbiscan" : paymentChain === "base-sepolia" ? "Basescan" : paymentChain === "hashkey-testnet" ? "Blockscout" : "Etherscan"}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 2. HashKey HSP Audit Consensus */}
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col justify-between gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          HashKey HSP Mandate Consensus
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                          {executionResult.hashKeySettlement?.status || "SETTLED"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 tabular-data">
                        Mandate: <span className="text-zinc-200">{executionResult.hashKeySettlement?.mandateId?.slice(0, 16) || "0x..."}...</span>
                        {executionResult.hashKeySettlement?.blockNumber && (
                          <span className="block text-[10px] text-zinc-500 mt-0.5">
                            Block #{executionResult.hashKeySettlement.blockNumber} • HashKey Testnet (ID 133)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <span className="text-xs text-zinc-400 tabular-data">
                          Payout: +{Number(executionResult.hashKeySettlement?.sellerPayoutHsk || 0).toFixed(4)} HSK
                        </span>
                        <a
                          href={executionResult.hashKeySettlement?.blockscoutUrl || "https://testnet-explorer.hskchain.net/address/0x40A633EeF249F21D95C8803b7144f19AAfeEF7ae"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-xs"
                        >
                          View on Blockscout
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* 3. HashKey Chain HSP Settlement Receipt */}
                    {executionResult.hashKeySettlement && (
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between gap-2.5 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            HashKey Chain • HSP Settlement (Chain ID 133)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Status: {executionResult.hashKeySettlement.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-300 pt-1">
                          <div>
                            <span className="text-zinc-500 block text-[10px]">HSP Adapter</span>
                            <span className="font-mono text-[11px] truncate block text-emerald-400" title={executionResult.hashKeySettlement.hspAdapterAddress}>
                              {executionResult.hashKeySettlement.hspAdapterAddress.slice(0, 10)}...{executionResult.hashKeySettlement.hspAdapterAddress.slice(-8)}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Settlement Routing</span>
                            <span className="text-zinc-200 text-[11px]">Seller: {executionResult.hashKeySettlement.sellerPayoutHsk} HSK</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Conservation of Value</span>
                            <span className="text-emerald-400 text-[11px]">Enforced On-Chain</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                          <span className="text-xs text-zinc-400 tabular-data">
                            Attestation: {executionResult.hashKeySettlement.attestationHash?.slice(0, 14)}...
                          </span>
                          <a
                            href={
                              executionResult.hashKeySettlement.paymentTxHash?.startsWith("0x")
                                ? `https://testnet-explorer.hskchain.net/tx/${executionResult.hashKeySettlement.paymentTxHash}`
                                : `https://testnet-explorer.hskchain.net/address/${executionResult.hashKeySettlement.hspAdapterAddress}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-300 hover:text-white hover:underline flex items-center gap-1 font-semibold text-xs"
                          >
                            Verify on HashKey Blockscout
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Hardware Enclave Attestation Receipt */}
                  {executionResult.zeroGVerification && (
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-zinc-400">Hardware Enclave Attestation:</span>
                        <span className="text-zinc-200 tabular-data font-semibold">
                          {executionResult.zeroGVerification.attestationHash?.slice(0, 18)}...
                        </span>
                      </div>
                      <span className="text-zinc-500 text-[11px]">
                        Enclave: {executionResult.zeroGVerification.enclaveId?.replace(/^0g-/i, "TEE-") || "TEE-IntelSGX-V2"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </SpatialCard>
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

      {/* Automated Buyer Escrow Refund Modal */}
      {showRefundModal && refundReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" data-ui="modal">{/* taste-skill-ignore */}
          <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/20 bg-[#0d0e12] space-y-6" data-ui="modal-content">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-emerald-400 block">
                    Zero-Cutoff Escrow Protection
                  </span>
                  <h3 className="text-xl font-bold text-white">100% Automatic Refund Issued</h3>
                </div>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Refunded Amount:</span>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold text-base tabular-data block">
                      {refundReceipt.refundAmountTokenFormatted ||
                        (refundReceipt.refundAmountToken
                          ? `${refundReceipt.refundAmountToken.toFixed(4)} ${refundReceipt.tokenSymbol || paymentCurrency || "HSK"}`
                          : `${(refundReceipt.refundAmountUsdc / 0.0894).toFixed(4)} ${paymentCurrency || "HSK"}`)}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-normal block tabular-data">
                      (${Number(refundReceipt.refundAmountUsdc || 0).toFixed(4)} USD equivalent)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Refunded Token:</span>
                  <span className="text-emerald-400 font-semibold uppercase">
                    {refundReceipt.tokenSymbol || paymentCurrency || "HSK"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Recipient Account:</span>
                  <span className="text-white truncate max-w-[200px] tabular-data" title={refundReceipt.recipientAccount}>
                    {refundReceipt.recipientAccount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Payment Network:</span>
                  <span className="text-zinc-200 uppercase font-semibold">{refundReceipt.paymentRail}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-black/60 border border-white/[0.08]">
                <span className="text-[11px] text-zinc-400 block font-medium">Upstream Rejection Reason:</span>
                <p className="text-zinc-200 text-xs leading-relaxed break-words">
                  {refundReceipt.reason}
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-2xl bg-black/60 border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-medium">Refund Transaction Hash:</span>
                  <a
                    href={refundReceipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline flex items-center gap-1 font-semibold"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-xs text-zinc-300 block truncate bg-zinc-950 p-2.5 rounded-xl border border-white/[0.06] tabular-data">
                  {refundReceipt.refundTxHash}
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                In ShunyaGrid, buyers never pay for rejected prompts, provider rate limits, or upstream API failures. All upfront escrow reservations are returned to your funding account automatically.
              </p>
            </div>

            <button
              onClick={() => setShowRefundModal(false)}
              className="btn-primary-apple w-full py-3.5 px-5 text-xs font-semibold transition"
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
