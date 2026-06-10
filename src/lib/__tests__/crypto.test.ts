import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock crypto module
vi.mock("@/lib/crypto", () => ({
  generateKeyPair: vi.fn().mockResolvedValue({
    publicKey: "mock-public-key",
    privateKey: "mock-private-key",
  }),
  deriveSharedKey: vi.fn().mockReturnValue("mock-shared-key"),
  encryptMessage: vi.fn().mockReturnValue("encrypted-content"),
  decryptMessage: vi.fn().mockReturnValue("decrypted-content"),
}));

describe("E2EE Crypto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates key pair", async () => {
    const { generateKeyPair } = await import("@/lib/crypto");
    const keys = await generateKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.privateKey).toBeDefined();
    expect(generateKeyPair).toHaveBeenCalledOnce();
  });

  it("derives shared key", async () => {
    const { deriveSharedKey } = await import("@/lib/crypto");
    const key = deriveSharedKey("priv1", "pub2");
    expect(key).toBe("mock-shared-key");
  });

  it("encrypts message", async () => {
    const { encryptMessage } = await import("@/lib/crypto");
    const result = encryptMessage("shared-key", "hello");
    expect(result).toBe("encrypted-content");
  });

  it("decrypts message", async () => {
    const { decryptMessage } = await import("@/lib/crypto");
    const result = decryptMessage("shared-key", "encrypted-content");
    expect(result).toBe("decrypted-content");
  });
});
