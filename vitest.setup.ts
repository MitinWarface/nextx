import "@testing-library/jest-dom/vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock navigator.mediaDevices
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});

// Mock AudioContext
(globalThis as any).AudioContext = class {
  createMediaStreamSource() { return { connect: vi.fn() }; }
  createAnalyser() { return { fftSize: 256, frequencyBinCount: 128, getByteFrequencyData: vi.fn() }; }
  close() { return Promise.resolve(); }
};
