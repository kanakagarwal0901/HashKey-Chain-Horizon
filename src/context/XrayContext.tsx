"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface XrayContextType {
  hostXrayMode: boolean;
  setHostXrayMode: (enabled: boolean) => void;
  toggleHostXrayMode: () => void;
}

const XrayContext = createContext<XrayContextType>({
  hostXrayMode: false,
  setHostXrayMode: () => {},
  toggleHostXrayMode: () => {},
});

export function XrayProvider({ children }: { children: React.ReactNode }) {
  const [hostXrayMode, setHostXrayMode] = useState<boolean>(false);

  const toggleHostXrayMode = () => {
    setHostXrayMode((prev) => !prev);
  };

  useEffect(() => {
    if (hostXrayMode) {
      document.documentElement.classList.add("host-xray-active");
    } else {
      document.documentElement.classList.remove("host-xray-active");
    }
  }, [hostXrayMode]);

  return (
    <XrayContext.Provider value={{ hostXrayMode, setHostXrayMode, toggleHostXrayMode }}>
      {children}
    </XrayContext.Provider>
  );
}

export function useXray() {
  return useContext(XrayContext);
}
