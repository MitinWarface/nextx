import { describe, it, expect } from "vitest";

describe("Offline Queue", () => {
  it("exports expected functions", async () => {
    const mod = await import("@/lib/offline-queue");
    expect(typeof mod.enqueueAction).toBe("function");
    expect(typeof mod.getQueuedActions).toBe("function");
    expect(typeof mod.removeAction).toBe("function");
    expect(typeof mod.clearQueue).toBe("function");
    expect(typeof mod.getQueueSize).toBe("function");
  });
});
