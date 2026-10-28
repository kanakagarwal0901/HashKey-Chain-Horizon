"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

interface AuthContextType {
  walletAddress: string | null;
  walletChainId: string | null;
  isConnectingWallet: boolean;
  worldIdVerified: boolean;
  nullifierHash: string | null;
  merkleRoot: string | null;
  proofPayload: string | null;
  isAuthenticated: boolean;
  ensName: string | null;
  ensAvatar: string | null;
  isLoadingEns: boolean;
  refreshEns: () => Promise<void>;
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

  // Real ENS State
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [isLoadingEns, setIsLoadingEns] = useState<boolean>(false);

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
      } catch (e) {
        console.warn("Failed to load auth session:", e);
      }
    }
  }, []);

  // Save session to localStorage when auth state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (walletAddress && worldIdVerified) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            walletAddress,
            walletChainId,
            worldIdVerified,
            nullifierHash,
            merkleRoot,
            proofPayload,
            ensName,
            ensAvatar,
          })
        );
      }
    }
  }, [walletAddress, walletChainId, worldIdVerified, nullifierHash, merkleRoot, proofPayload, ensName, ensAvatar]);

  // Reverse ENS Resolution
  const resolveEns = async (address: string) => {
    if (!address) return;
    setIsLoadingEns(true);
    try {
      const res = await fetch(`/api/ens/reverse?address=${address}`);
      const data = await res.json();
      if (data.ensName) {
        setEnsName(data.ensName);
        if (data.avatar) setEnsAvatar(data.avatar);
      } else {
        setEnsName(null);
        setEnsAvatar(null);
      }
    } catch {
      setEnsName(null);
      setEnsAvatar(null);
    } finally {
      setIsLoadingEns(false);
    }
  };

  const refreshEns = async () => {
    if (walletAddress) {
      await resolveEns(walletAddress);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      resolveEns(walletAddress);
    }
  }, [walletAddress]);

  // Connect Web3 EVM Wallet (MetaMask)
  const connectWallet = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("No Ethereum Web3 wallet found. Please install MetaMask to use ShunyaGrid.");
      return false;
    }

    setIsConnectingWallet(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);

        const chainIdHex = await (window as any).ethereum.request({
          method: "eth_chainId",
        });
        setWalletChainId(chainIdHex);

        (window as any).ethereum.on("accountsChanged", (newAccounts: string[]) => {
          if (newAccounts.length > 0) {
            setWalletAddress(newAccounts[0]);
          } else {
            logout();
          }
        });

        (window as any).ethereum.on("chainChanged", (newChainId: string) => {
          setWalletChainId(newChainId);
        });

        return true;
      }
      return false;
    } catch (err: any) {
      if (err.code === 4001) {
        console.log("User rejected wallet connection request.");
      } else {
        console.error("Wallet connection error:", err);
      }
      return false;
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = () => {
    logout();
  };

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

  const logout = () => {
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
