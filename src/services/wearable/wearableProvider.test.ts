import { describe, it, expect, jest } from "@jest/globals";
import { providerRegistry } from "./ProviderRegistry";
import { StubProvider } from "./stubProvider";
import { ConnectionState } from "./types";

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("react-native-health-connect", () => ({
  getSdkStatus: jest.fn().mockResolvedValue(3),
  SdkAvailabilityStatus: { SDK_AVAILABLE: 3, SDK_UNAVAILABLE: 1 },
  getGrantedPermissions: jest.fn().mockResolvedValue([]),
  initialize: jest.fn().mockResolvedValue(true),
  requestPermission: jest.fn().mockResolvedValue([]),
  readRecords: jest.fn().mockResolvedValue({ records: [] }),
}));

jest.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn().mockImplementation(async (k: string) => store[k] ?? null),
    setItemAsync: jest.fn().mockImplementation(async (k: string, v: string) => { store[k] = v; }),
    deleteItemAsync: jest.fn().mockImplementation(async (k: string) => { delete store[k]; }),
  };
});

describe("Wearable Provider Layer & State Machine Tests", () => {
  it("should correctly sort providers in ProviderRegistry by reliability (recommended > direct > indirect)", async () => {
    const providers = await providerRegistry.getAvailableProviders();
    const recommendedIdx = providers.findIndex((p) => p.reliability === "recommended");
    const directIdx = providers.findIndex((p) => p.reliability === "direct");
    const indirectIdx = providers.findIndex((p) => p.reliability === "indirect");

    if (recommendedIdx !== -1 && directIdx !== -1) {
      expect(recommendedIdx).toBeLessThan(directIdx);
    }
    if (directIdx !== -1 && indirectIdx !== -1) {
      expect(directIdx).toBeLessThan(indirectIdx);
    }
    if (recommendedIdx !== -1 && indirectIdx !== -1) {
      expect(recommendedIdx).toBeLessThan(indirectIdx);
    }
  });

  it("should exercise all 8 ConnectionState transitions on StubProvider", async () => {
    const stub = providerRegistry.getProvider("stub_provider") as StubProvider;
    expect(stub).toBeDefined();

    const observedStates: ConnectionState[] = [];
    const unsubscribe = stub.onStateChange((state) => {
      observedStates.push(state);
    });

    // 1. not_connected (default)
    expect(await stub.getState()).toBe("not_connected");

    // 2 & 3. connecting & connected
    await stub.connect();
    expect(await stub.getState()).toBe("connected");

    // 4. needs_permission
    stub.setMockState("needs_permission");
    expect(await stub.getState()).toBe("needs_permission");

    // 5. needs_companion_app
    stub.setMockAvailable(false);
    expect(await stub.getState()).toBe("needs_companion_app");
    stub.setMockAvailable(true);

    // 6. syncing
    stub.setMockState("syncing");
    expect(await stub.getState()).toBe("syncing");

    // 7. stale
    stub.setMockState("stale");
    expect(await stub.getState()).toBe("stale");

    // 8. error
    stub.setMockState("error");
    expect(await stub.getState()).toBe("error");

    unsubscribe();

    expect(observedStates).toContain("connecting");
    expect(observedStates).toContain("connected");
    expect(observedStates).toContain("needs_permission");
    expect(observedStates).toContain("needs_companion_app");
  });
});
