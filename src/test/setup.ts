import "@testing-library/jest-dom";

// Node 25 ships an experimental global `localStorage` that is not a complete Storage (no clear(), etc.) and shadows
// the one jsdom provides. Install a plain in-memory Storage so tests behave the same on every Node version.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.has(key) ? (this.data.get(key) as string) : null; }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}
for (const name of ["localStorage", "sessionStorage"] as const) {
  const store = new MemoryStorage();
  Object.defineProperty(window, name, { value: store, configurable: true });
  Object.defineProperty(globalThis, name, { value: store, configurable: true });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
