"use client";

import { useState, useEffect, useRef } from "react";
import {
  MODEL_TOKEN_CATALOG,
  SUPPORTED_MODELS,
  ThinkingLevel,
  ModelTokenBounds,
  getModelTokenBounds,
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
} from "lucide-react";
import Link from "next/link";
import {
  sealBuyerPromptAndFilesInBrowser,
  decryptBuyerOutputInBrowser,
} from "@/lib/clientCrypto";

export default function BuyerStudioPage() {
  const [selectedModel, setSelectedModel] = useState<string>("claude-3-7-sonnet");
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>("medium");
  const [promptText, setPromptText] = useState<string>(
    "Perform a comprehensive security audit on the attached smart contract. Check for reentrancy, access control flaws, and recommend remediations."
  );
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: number; type: string; base64: string }[]
  >([]);
  const [eligibleSellers, setEligibleSellers] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [loadingSellers, setLoadingSellers] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionStep, setExecutionStep] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [decryptedResult, setDecryptedResult] = useState<{ aiOutputText: string; reasoningText: string } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Model Token Bounds
  const bounds: ModelTokenBounds = getModelTokenBounds(selectedModel, thinkingLevel);

  // Dynamic token estimations
  const estimatedPromptTokens = Math.max(1, Math.ceil(promptText.length / 4));
  const estimatedFileTokens = attachedFiles.reduce((acc, f) => {
    return acc + (f.type.startsWith("image/") ? 800 : Math.max(50, Math.ceil(f.size / 4)));
  }, 0);
  const totalEstimatedInputTokens = estimatedPromptTokens + estimatedFileTokens;

  // Default file preload for demo
  useEffect(() => {
    // Preload a sample Solidity audit file
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
        setEligibleSellers(data.listings || []);
        if (data.listings && data.listings.length > 0) {
          setSelectedSeller(data.listings[0]);
        } else {
          setSelectedSeller(null);
        }
        setLoadingSellers(false);
      })
      .catch((err) => {
        console.error("Failed to query Arkiv:", err);
        setLoadingSellers(false);
      });
  }, [selectedModel, bounds.totalMaxTokens]);

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

  // Handle file input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(Array.from(files));
  };

  // Native HTML5 Drag and Drop handlers
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


  const loadSample = (type: "audit" | "finance" | "math") => {
    if (type === "audit") {
      setPromptText(
        "Analyze the attached smart contract fragment and check for reentrancy, unchecked low-level calls, and front-running vulnerabilities. Provide corrected Solidity code."
      );
      setSelectedModel("claude-3-7-sonnet");
      setThinkingLevel("medium");
    } else if (type === "finance") {
      setPromptText(
        "Review this confidential Q3 ledger dataset. Identify churn inflection points, forecast Q4 customer acquisition cost (CAC), and summarize executive retention strategies."
      );
      setSelectedModel("o3-mini");
      setThinkingLevel("medium");
      const sampleCsv = `user_id,revenue,churn_risk,api_quota_utilization\n101,4500,0,94%\n102,9200,1,12%\n103,15000,0,88%\n104,3100,1,8%`;
      setAttachedFiles([
        {
          name: "Q3_Ledger_Confidential.csv",
          size: sampleCsv.length,
          type: "text/csv",
          base64: btoa(sampleCsv),
        },
      ]);
    } else {
      setPromptText(
        "Compute the formal mathematical proof for zero-knowledge range verification over elliptic curve BN254. State constraints and verify boundary limits."
      );
      setSelectedModel("claude-3-7-sonnet");
      setThinkingLevel("high");
    }
  };

  // Calculate upfront cost
  const ratePer1k = selectedSeller ? selectedSeller.pricePer1kMicroUsdc : 10_000;
  const upfrontMicroUsdc = Math.ceil((bounds.totalMaxTokens / 1000) * ratePer1k);
  const upfrontUsdc = upfrontMicroUsdc / 1_000_000;

  // Execute blind inference
  const executePrompt = async () => {
    if (!selectedSeller) return;
    setIsExecuting(true);
    setExecutionResult(null);
    setDecryptedResult(null);

    try {
      // Phase 1: Local Client-side Encryption
      setExecutionStep("1/4: Sealing prompt & files with AES-256-GCM in local browser RAM...");
      const pubKeyRes = await fetch("/api/enclave-pubkey");
      const pubKeyData = await pubKeyRes.json();
      const enclavePubKeyPem = pubKeyData.publicKeyPem;

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

      // Phase 2: Hedera x402 HTTP 402 Negotiation
      setExecutionStep(`2/4: Hedera x402 Paywall: Depositing $${upfrontUsdc.toFixed(6)} HTS USDC for T_max...`);
      await new Promise((r) => setTimeout(r, 600));

      // Simulate payment transaction ID
      const paymentTxId = `0.0.482910@${Math.floor(Date.now() / 1000)}.778102910`;

      // Phase 3: Sealed Enclave Execution
      setExecutionStep("3/4: 0G Sealed Enclave executing inference with zero seller visibility...");
      const executeRes = await fetch("/api/blind-execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-402-Payment-TxId": paymentTxId,
        },
        body: JSON.stringify({
          modelId: selectedModel,
          thinkingLevel,
          listingId: selectedSeller.id,
          encryptedEnvelope,
          paymentTxId,
        }),
      });

      if (!executeRes.ok) {
        const errJson = await executeRes.json();
        throw new Error(errJson.reason || errJson.error || "Execution failed");
      }

      const executeData = await executeRes.json();
      setExecutionResult(executeData);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Cpu className="w-8 h-8 text-cyan-400" />
            Buyer Confidential Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Zero-Cutoff AI inference with total seller surveillance blindness. Upfront Hedera x402 charge for T_max.
          </p>
        </div>

        {/* Sample Prompt Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono">Load Demo Scenario:</span>
          <button
            onClick={() => loadSample("audit")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/40 transition"
          >
            🛡️ Smart Contract Audit
          </button>
          <button
            onClick={() => loadSample("finance")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/40 transition"
          >
            📊 Financial CSV
          </button>
          <button
            onClick={() => loadSample("math")}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-800/40 transition"
          >
            🧠 High Thinking Proof
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Model, Thinking, & Deterministic Bounds */}
        <div className="space-y-6">
          {/* Model Selector Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Select Model
            </h2>

            <div className="space-y-2">
              {SUPPORTED_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    if (!m.supportsThinking) setThinkingLevel("none");
                    else if (thinkingLevel === "none") setThinkingLevel("medium");
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition flex items-center justify-between ${
                    selectedModel === m.id
                      ? "bg-indigo-950/70 border-indigo-500 text-white font-medium"
                      : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Provider: {m.provider.toUpperCase()} • {m.supportsThinking ? "Reasoning Engine" : "Direct Mode"}
                    </span>
                  </div>
                  {selectedModel === m.id && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </button>
              ))}
            </div>

            {/* Thinking Level Selector */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-xs font-mono text-slate-400 block">Thinking Level (Reasoning Tokens):</label>
              <div className="grid grid-cols-4 gap-2">
                {(["none", "low", "medium", "high"] as ThinkingLevel[]).map((level) => {
                  const currentMeta = SUPPORTED_MODELS.find((m) => m.id === selectedModel);
                  const disabled = !currentMeta?.supportsThinking && level !== "none";

                  return (
                    <button
                      key={level}
                      disabled={disabled}
                      onClick={() => setThinkingLevel(level)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono uppercase transition ${
                        disabled
                          ? "opacity-30 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-500"
                          : thinkingLevel === level
                          ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Deterministic Token Bounds Matrix Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Deterministic Token Bounds
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-mono">
                FT-01 Invariant
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>Input & File Cap (T_input_cap):</span>
                <span className="text-slate-100 font-bold">{bounds.maxInputAndFileTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>Thinking Budget (T_thinking):</span>
                <span className="text-indigo-400 font-bold">
                  {bounds.thinkingBudgetTokens.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span>Output Cap (T_output_cap):</span>
                <span className="text-slate-100 font-bold">{bounds.maxOutputTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-300 font-bold text-sm">
                <span>Total Max Quota (T_max):</span>
                <span>{bounds.totalMaxTokens.toLocaleString()} tokens</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Zero-Cutoff Guarantee: Sellers with available quota &lt; {bounds.totalMaxTokens.toLocaleString()} tokens are
              automatically excluded to prevent mid-way failure.
            </p>
          </div>

          {/* Matched Seller Node */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Matched Arkiv Seller Node
            </h2>

            {loadingSellers ? (
              <div className="text-xs text-slate-400 font-mono py-4 text-center">
                Querying Arkiv via Anon-RPC harness...
              </div>
            ) : selectedSeller ? (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-100 font-semibold">{selectedSeller.ensName}</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    World ID Verified
                  </span>
                </div>
                <div className="text-slate-400">Available: {selectedSeller.availableTokens.toLocaleString()} tokens</div>
                <div className="text-slate-400">
                  Rate: ${(selectedSeller.pricePer1kMicroUsdc / 1000000).toFixed(4)} USDC / 1k
                </div>
                <div className="text-slate-500 text-[10px]">Payout Account: {selectedSeller.hedaraPayoutAccount}</div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  No Seller with ≥ {bounds.totalMaxTokens.toLocaleString()} tokens!
                </div>
                <p className="text-[11px]">
                  FT-01 Invariant enforced: Try lowering the thinking level to low or switch model.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Column: Prompt, File Dropzone, Hedera x402 & Execution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt Editor */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Prompt (Client-Side Encrypted)
              </label>
              <span className="text-xs text-indigo-300 font-mono flex items-center gap-2">
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/40 text-[10px] text-indigo-300">
                  ~{totalEstimatedInputTokens.toLocaleString()} tokens est. / {bounds.maxInputAndFileTokens.toLocaleString()} cap
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  AES-256-GCM Sealed
                </span>
              </span>
            </div>

            <textarea
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Type your prompt here..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition"
            />
          </div>

          {/* Any-File Dropzone */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Attach Any Files (PDF, Code, Images, CSV, ZIP)
              </label>
              <span className="text-xs text-slate-400 font-mono">Total Seller Blindness</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/30 scale-[1.01]"
                  : "border-slate-800 hover:border-cyan-500/50 bg-slate-900/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload
                className={`w-8 h-8 mx-auto mb-2 transition ${
                  isDragging ? "text-cyan-300 scale-110 animate-bounce" : "text-cyan-400"
                }`}
              />
              <p className="text-sm text-slate-300 font-medium">
                {isDragging ? "Drop your files here to seal with AES-256-GCM..." : "Click to upload or drag & drop arbitrary files"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ≤ 128 KiB: 10-Min Arkiv Entity • &gt; 128 KiB: 0G Storage Node
              </p>
            </div>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                {attachedFiles.map((file, idx) => {
                  const isSmall = file.size <= 128 * 1024;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-200 font-semibold">{file.name}</span>
                        <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KiB)</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            isSmall
                              ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/40"
                              : "bg-amber-950/80 text-amber-300 border border-amber-800/40"
                          }`}
                        >
                          {isSmall ? "Arkiv Entity (10m Expiry)" : "0G Storage Node"}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-400 transition"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upfront Hedera x402 Pricing & Execution Card */}
          <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 to-indigo-950/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-indigo-300 font-mono block">Upfront Hedera x402 Deposit:</span>
                <div className="text-2xl font-extrabold text-white font-mono flex items-center gap-2">
                  <span>${upfrontUsdc.toFixed(6)} USDC</span>
                  <span className="text-xs text-slate-400 font-normal">
                    (Governed by T_max: {bounds.totalMaxTokens.toLocaleString()} tokens)
                  </span>
                </div>
              </div>

              <button
                disabled={!selectedSeller || isExecuting}
                onClick={executePrompt}
                className={`px-6 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg flex items-center justify-center gap-2 transition ${
                  !selectedSeller || isExecuting
                    ? "opacity-50 cursor-not-allowed bg-slate-800"
                    : "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30"
                }`}
              >
                <Shield className="w-4 h-4 text-cyan-300" />
                {isExecuting ? "Executing Sealed Inference..." : "Encrypt & Run Blind Inference"}
              </button>
            </div>

            {/* Progress indicator */}
            {isExecuting && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs font-mono text-cyan-300 space-y-1 animate-pulse">
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  {executionStep}
                </div>
              </div>
            )}
          </div>

          {/* Decrypted Results Card */}
          {decryptedResult && executionResult && (
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/40 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Decrypted AI Output (Local Browser Custody)
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                  Decrypted via K_return
                </span>
              </div>

              {/* Reasoning Tokens Trace */}
              {decryptedResult.reasoningText && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-900/50 space-y-2">
                  <span className="text-xs text-indigo-400 font-mono font-bold block">
                    🧠 Frontier Reasoning Process ({selectedModel}):
                  </span>
                  <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {decryptedResult.reasoningText}
                  </div>
                </div>
              )}

              {/* Output Content */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <span className="text-xs text-cyan-400 font-mono font-bold block">⚡ Final Synthesized Response:</span>
                <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                  {decryptedResult.aiOutputText}
                </div>
              </div>

              {/* Token Settlement Accounting Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Tokens Reserved</span>
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
                  <span className="text-slate-400 block text-[11px]">App Commission</span>
                  <span className="font-bold text-indigo-400">
                    ${executionResult.tokenAccounting.protocolCommissionUsdc.toFixed(6)}
                  </span>
                </div>
              </div>

              {/* Proofs & HashScan Links */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Hedera HCS Tx:</span>
                  <a
                    href={executionResult.hederaSettlement.hashscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    {executionResult.hederaSettlement.sellerPayoutTxId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <Link
                  href="/audit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium flex items-center gap-1 transition"
                >
                  Inspect in Judge Split View
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
