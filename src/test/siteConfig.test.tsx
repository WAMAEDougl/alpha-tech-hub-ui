import { describe, it, expect, beforeEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { useContext } from "react";
import {
  SiteConfigProvider,
  SiteConfigContext,
  useSiteConfig,
  SiteConfig,
} from "@/contexts/SiteConfigContext";

const DEFAULT_CONFIG: SiteConfig = {
  companyName: "Alpha Computers Nanyuki",
  logoLight: "/logo-light.png",
  logoDark: "/logo-dark.png",
  mapLat: -0.0167,
  mapLng: 37.0667,
  phone: "+254700000000",
  whatsappNumber: "+254700000000",
};

// Helper component that reads config and exposes a setter via a button
function ConfigReader({
  onRead,
  newConfig,
}: {
  onRead: (config: SiteConfig) => void;
  newConfig?: SiteConfig;
}) {
  const { config, setConfig } = useSiteConfig();
  onRead(config);
  return newConfig ? (
    <button onClick={() => setConfig(newConfig)}>update</button>
  ) : null;
}

function renderWithProvider(
  onRead: (config: SiteConfig) => void,
  newConfig?: SiteConfig
) {
  return render(
    <SiteConfigProvider>
      <ConfigReader onRead={onRead} newConfig={newConfig} />
    </SiteConfigProvider>
  );
}

describe("SiteConfigContext", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("loads the default config when localStorage is empty", () => {
    let captured: SiteConfig | null = null;
    renderWithProvider((c) => {
      captured = c;
    });
    expect(captured).toEqual(DEFAULT_CONFIG);
  });

  it("reads a previously stored config from localStorage on mount", () => {
    const stored: SiteConfig = {
      ...DEFAULT_CONFIG,
      companyName: "My Custom Shop",
      phone: "+254711111111",
    };
    localStorage.setItem("siteConfig", JSON.stringify(stored));

    let captured: SiteConfig | null = null;
    renderWithProvider((c) => {
      captured = c;
    });

    expect(captured).toEqual(stored);
  });

  it("persists updated config to localStorage after setConfig is called", async () => {
    const updated: SiteConfig = {
      ...DEFAULT_CONFIG,
      companyName: "Updated Name",
    };

    let captured: SiteConfig | null = null;
    const { getByRole } = renderWithProvider((c) => {
      captured = c;
    }, updated);

    await act(async () => {
      getByRole("button").click();
    });

    const stored = JSON.parse(localStorage.getItem("siteConfig") ?? "{}");
    expect(stored.companyName).toBe("Updated Name");
  });

  it("reflects the updated config in the context after setConfig is called", async () => {
    const updated: SiteConfig = {
      ...DEFAULT_CONFIG,
      companyName: "Reflected Name",
    };

    const reads: SiteConfig[] = [];
    const { getByRole } = renderWithProvider((c) => {
      reads.push(c);
    }, updated);

    await act(async () => {
      getByRole("button").click();
    });

    const last = reads[reads.length - 1];
    expect(last.companyName).toBe("Reflected Name");
  });

  it("useSiteConfig returns config and a setConfig function", () => {
    let configValue: SiteConfig | null = null;
    let setConfigType = "";

    function Inspector() {
      const { config, setConfig } = useSiteConfig();
      configValue = config;
      setConfigType = typeof setConfig;
      return null;
    }

    render(
      <SiteConfigProvider>
        <Inspector />
      </SiteConfigProvider>
    );

    expect(configValue).not.toBeNull();
    expect(setConfigType).toBe("function");
  });

  it("falls back to default config when localStorage contains invalid JSON", () => {
    localStorage.setItem("siteConfig", "not-valid-json");

    let captured: SiteConfig | null = null;
    renderWithProvider((c) => {
      captured = c;
    });

    expect(captured).toEqual(DEFAULT_CONFIG);
  });

  it("merges partial stored config with defaults", () => {
    localStorage.setItem("siteConfig", JSON.stringify({ companyName: "Partial" }));

    let captured: SiteConfig | null = null;
    renderWithProvider((c) => {
      captured = c;
    });

    expect(captured?.companyName).toBe("Partial");
    expect(captured?.phone).toBe(DEFAULT_CONFIG.phone);
  });
});
