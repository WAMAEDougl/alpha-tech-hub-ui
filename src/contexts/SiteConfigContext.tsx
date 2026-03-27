import React, { createContext, useContext, useState, useEffect } from "react";

export interface SiteConfig {
  companyName: string;
  email: string;
  logoLight: string;
  logoDark: string;
  mapLat: number;
  mapLng: number;
  phone: string;
  whatsappNumber: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  companyName: "Alpha Computers Nanyuki",
  email: "info@alphacomputersnanyuki.co.ke",
  logoLight: "/logo-light.png",
  logoDark: "/logo-dark.png",
  mapLat: -0.0167,
  mapLng: 37.0667,
  phone: "+254700000000",
  whatsappNumber: "+254700000000",
};

const STORAGE_KEY = "siteConfig";

function loadConfig(): SiteConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

interface SiteConfigContextValue {
  config: SiteConfig;
  setConfig: (config: SiteConfig) => void;
}

export const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
});

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<SiteConfig>(loadConfig);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, [config]);

  function setConfig(newConfig: SiteConfig) {
    setConfigState(newConfig);
  }

  return (
    <SiteConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
