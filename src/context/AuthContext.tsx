"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AuthContextType {
  walletAddress: string | null;
  walletChainId: string | null;
  isConnectingWallet: boolean;
  worldIdVerified: boolean;
  nullifierHash: string | null;
  merkleRoot: string | null;
  proofPayload: string | null;
  isAuthenticated: boolean;
  // Real ENS Properties
  ensName: string | null;
  ensAvatar: string | null;
  isLoadingEns: boolean;
  refreshEns: () => Promise<void>;
  // Seller Hedera Payout Account Login
  sellerHederaAccount: string | null;
  isConnectingHedera: boolean;
  connectSellerHedera: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  disconnectSellerHedera: () => void;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  completeWorldIdVerification: (proofData: {
    nullifierHash: string;
    merkleRoot: string;
    proofPayload: string;
  }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  walletAddress: null,
  walletChainId: null,
  isConnectingWallet: false,
  worldIdVerified: false,
  nullifierHash: null,
  merkleRoot: null,
  proofPayload: null,
  isAuthenticated: false,
  ensName: null,
  ensAvatar: null,
  isLoadingEns: false,
  refreshEns: async () => {},
  sellerHederaAccount: null,
  isConnectingHedera: false,
  connectSellerHedera: async () => ({ success: false }),
  disconnectSellerHedera: () => {},
  connectWallet: async () => false,
  disconnectWallet: () => {},
  completeWorldIdVerification: () => {},
  logout: () => {},
});

const STORAGE_KEY = "shunyagrid_auth_session_v1";
const HEDERA_STORAGE_KEY = "shunyagrid_seller_hedera_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [worldIdVerified, setWorldIdVerified] = useState<boolean>(false);
  const [nullifierHash, setNullifierHash] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [proofPayload, setProofPayload] = useState<string | null>(null);

  // Real ENS State
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [isLoadingEns, setIsLoadingEns] = useState<boolean>(false);

  // Seller Hedera Account Login State
  const [sellerHederaAccount, setSellerHederaAccount] = useState<string | null>(null);
  const [isConnectingHedera, setIsConnectingHedera] = useState<boolean>(false);

  // Load persisted session on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.walletAddress && parsed.worldIdVerified) {
            setWalletAddress(parsed.walletAddress);
            setWalletChainId(parsed.walletChainId || null);
            setWorldIdVerified(true);
            setNullifierHash(parsed.nullifierHash || null);
            setMerkleRoot(parsed.merkleRoot || null);
            setProofPayload(parsed.proofPayload || null);
            if (parsed.ensName) setEnsName(parsed.ensName);
            if (parsed.ensAvatar) setEnsAvatar(parsed.ensAvatar);
          }
        }
        const savedHedera = localStorage.getItem(HEDERA_STORAGE_KEY);
        if (savedHedera && /^0\.0\.\d+$/.test(savedHedera.trim())) {
          setSellerHederaAccount(savedHedera.trim());
        }
      } catch (e) {
        console.error("Failed to parse saved auth session:", e);
      }
    }
  }, []);

  // Save session when authenticated
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (walletAddress && worldIdVerified) {
        const session = {
          walletAddress,
          walletChainId,
          worldIdVerified: true,
          nullifierHash,
          merkleRoot,
          proofPayload,
          ensName,
          ensAvatar,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [walletAddress, worldIdVerified, nullifierHash, merkleRoot, proofPayload, walletChainId, ensName, ensAvatar]);

  // Live Reverse ENS Lookup on wallet address change
  const refreshEns = useCallback(async () => {
    if (!walletAddress) {
      setEnsName(null);
      setEnsAvatar(null);
      return;
    }

    setIsLoadingEns(true);
    try {
      const res = await fetch(`/api/ens/reverse?address=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setEnsName(data.ensName || null);
        setEnsAvatar(data.avatarUrl || null);
      }
    } catch (err) {
      console.warn("[AuthContext] Reverse ENS resolution error:", err);
    } finally {
      setIsLoadingEns(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    refreshEns();
  }, [refreshEns]);

  // Listen to Web3 provider account changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          logout();
        }
      };

      const handleChain = (chainId: string) => {
        setWalletChainId(chainId);
      };

      (window as any).ethereum.on("accountsChanged", handleAccounts);
      (window as any).ethereum.on("chainChanged", handleChain);

      return () => {
        (window as any).ethereum.removeListener("accountsChanged", handleAccounts);
        (window as any).ethereum.removeListener("chainChanged", handleChain);
      };
    }
  }, []);

  // Connect Crypto Wallet (MetaMask, Coinbase Wallet, Brave, Rainbow)
  const connectWallet = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("No Ethereum browser wallet found. Please install MetaMask, Coinbase Wallet, or Brave Wallet.");
      return false;
    }

    setIsConnectingWallet(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setWalletAddress(addr);

        try {
          const chainId = await (window as any).ethereum.request({ method: "eth_chainId" });
          setWalletChainId(chainId);
        } catch {
          // Non-critical
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      alert(err.message || "Failed to connect crypto wallet.");
      return false;
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletChainId(null);
    setWorldIdVerified(false);
    setNullifierHash(null);
    setMerkleRoot(null);
    setProofPayload(null);
    setEnsName(null);
    setEnsAvatar(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Save authentic World ID verification result from real Worldcoin Simulator / World App
  const completeWorldIdVerification = (proofData: {
    nullifierHash: string;
    merkleRoot: string;
    proofPayload: string;
  }) => {
    setNullifierHash(proofData.nullifierHash);
    setMerkleRoot(proofData.merkleRoot);
    setProofPayload(proofData.proofPayload);
    setWorldIdVerified(true);
  };

  // Seller Hedera Account Connection & Testnet Verification
  const connectSellerHedera = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = accountId.trim();
    if (!cleanId) {
      return { success: false, error: "Please enter a valid Hedera Account ID." };
    }
    const hederaRegex = /^0\.0\.\d+$/;
    if (!hederaRegex.test(cleanId)) {
      return { success: false, error: "Invalid format. Expected 0.0.xxxxx (e.g. 0.0.11145557)." };
    }

    setIsConnectingHedera(true);
    try {
      const res = await fetch(`/api/seller/hedera-balance?accountId=${cleanId}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: data.error || "Failed to verify Hedera account on testnet." };
      }
      setSellerHederaAccount(cleanId);
      if (typeof window !== "undefined") {
        localStorage.setItem(HEDERA_STORAGE_KEY, cleanId);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to verify Hedera account." };
    } finally {
      setIsConnectingHedera(false);
    }
  };

  const disconnectSellerHedera = () => {
    setSellerHederaAccount(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HEDERA_STORAGE_KEY);
    }
  };

  // Log Out: Clears wallet, World ID session, and storage
  const logout = () => {
    setWalletAddress(null);
    setWalletChainId(null);
    setWorldIdVerified(false);
    setNullifierHash(null);
    setMerkleRoot(null);
    setProofPayload(null);
    setEnsName(null);
    setEnsAvatar(null);
    setSellerHederaAccount(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HEDERA_STORAGE_KEY);
    }
  };

  const isAuthenticated = Boolean(walletAddress && worldIdVerified);

  return (
    <AuthContext.Provider
      value={{
        walletAddress,
        walletChainId,
        isConnectingWallet,
        worldIdVerified,
        nullifierHash,
        merkleRoot,
        proofPayload,
        isAuthenticated,
        ensName,
        ensAvatar,
        isLoadingEns,
        refreshEns,
        sellerHederaAccount,
        isConnectingHedera,
        connectSellerHedera,
        disconnectSellerHedera,
        connectWallet,
        disconnectWallet,
        completeWorldIdVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
