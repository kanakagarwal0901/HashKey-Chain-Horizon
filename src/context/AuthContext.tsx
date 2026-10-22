"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface AuthContextType {
  walletAddress: string | null;
  walletChainId: string | null;
  isConnectingWallet: boolean;
  worldIdVerified: boolean;
  nullifierHash: string | null;
  merkleRoot: string | null;
  proofPayload: string | null;
  isAuthenticated: boolean;
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
  connectWallet: async () => false,
  disconnectWallet: () => {},
  completeWorldIdVerification: () => {},
  logout: () => {},
});

const STORAGE_KEY = "shunyagrid_auth_session_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [worldIdVerified, setWorldIdVerified] = useState<boolean>(false);
  const [nullifierHash, setNullifierHash] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [proofPayload, setProofPayload] = useState<string | null>(null);

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
          }
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
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [walletAddress, worldIdVerified, nullifierHash, merkleRoot, proofPayload, walletChainId]);

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

  // Log Out: Clears wallet, World ID session, and storage
  const logout = () => {
    setWalletAddress(null);
    setWalletChainId(null);
    setWorldIdVerified(false);
    setNullifierHash(null);
    setMerkleRoot(null);
    setProofPayload(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
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
