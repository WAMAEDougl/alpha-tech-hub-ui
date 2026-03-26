import { describe, it, expect, beforeEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { ThemeProvider, useTheme } from "next-themes";

// Helper component that exposes setTheme via a button
function ThemeToggler({ targetTheme }: { targetTheme: string }) {
  const { setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(targetTheme)}>
      Set {targetTheme}
    </button>
  );
}

function renderWithTheme(targetTheme: string) {
  const { getByRole } = render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={false}>
      <ThemeToggler targetTheme={targetTheme} />
    </ThemeProvider>
  );
  return getByRole("button");
}

describe("Theme toggle — <html> class updates", () => {
  beforeEach(() => {
    // Reset html class and cleanup DOM between tests
    document.documentElement.className = "";
    cleanup();
  });

  it("sets 'dark' class on <html> when theme is toggled to dark", async () => {
    const button = renderWithTheme("dark");

    await act(async () => {
      button.click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("sets 'light' class on <html> when theme is toggled to light", async () => {
    const button = renderWithTheme("light");

    await act(async () => {
      button.click();
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("removes 'dark' class when switching from dark to light", async () => {
    // First set dark
    const darkButton = renderWithTheme("dark");
    await act(async () => {
      darkButton.click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Cleanup and re-render with light theme
    cleanup();
    const lightButton = renderWithTheme("light");
    await act(async () => {
      lightButton.click();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
