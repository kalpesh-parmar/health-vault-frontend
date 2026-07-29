// Mock native modules for standalone Node environment execution
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request: string) {
  if (request === "react-native") {
    return { Platform: { OS: "android" } };
  }
  if (request === "react-native-health-connect") {
    return {
      getSdkStatus: async () => 3,
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3, SDK_UNAVAILABLE: 1 },
      getGrantedPermissions: async () => [],
      initialize: async () => true,
      requestPermission: async () => [],
      readRecords: async () => ({ records: [] }),
    };
  }
  if (request === "expo-secure-store") {
    const store: Record<string, string> = {};
    return {
      getItemAsync: async (k: string) => store[k] ?? null,
      setItemAsync: async (k: string, v: string) => { store[k] = v; },
      deleteItemAsync: async (k: string) => { delete store[k]; },
    };
  }
  return originalRequire.apply(this, arguments as any);
};

const { providerRegistry } = require("./ProviderRegistry");
const { StubProvider } = require("./stubProvider");

async function runTests() {
  console.log("[Test] Starting Wearable Provider Layer tests...");

  // 1. Test ProviderRegistry Reliability Ordering
  console.log("[Test] Verifying ProviderRegistry sorting...");
  const providers = await providerRegistry.getAvailableProviders();
  
  // Verify order
  const recommendedIdx = providers.findIndex((p: any) => p.reliability === "recommended");
  const directIdx = providers.findIndex((p: any) => p.reliability === "direct");
  const indirectIdx = providers.findIndex((p: any) => p.reliability === "indirect");

  if (recommendedIdx !== -1 && directIdx !== -1 && recommendedIdx > directIdx) {
    throw new Error("Sorting failed: recommended provider must be sorted before direct provider");
  }
  if (directIdx !== -1 && indirectIdx !== -1 && directIdx > indirectIdx) {
    throw new Error("Sorting failed: direct provider must be sorted before indirect provider");
  }
  console.log("[Test] ProviderRegistry reliability sorting passed.");

  // 2. Test StubProvider State Transitions (all 8 states)
  console.log("[Test] Verifying StubProvider connection states...");
  const stub = providerRegistry.getProvider("stub_provider");
  if (!stub) {
    throw new Error("StubProvider not registered in ProviderRegistry");
  }

  const observedStates: string[] = [];
  const unsubscribe = stub.onStateChange((state: string) => {
    observedStates.push(state);
  });

  // State 1: not_connected (default)
  const state1 = await stub.getState();
  if (state1 !== "not_connected") throw new Error(`Expected not_connected, got ${state1}`);

  // State 2: connecting (transient during connect) & State 3: connected
  await stub.connect();
  const state3 = await stub.getState();
  if (state3 !== "connected") throw new Error(`Expected connected, got ${state3}`);

  // State 4: needs_permission
  stub.setMockState("needs_permission");
  const state4 = await stub.getState();
  if (state4 !== "needs_permission") throw new Error(`Expected needs_permission, got ${state4}`);

  // State 5: needs_companion_app
  stub.setMockAvailable(false);
  const state5 = await stub.getState();
  if (state5 !== "needs_companion_app") throw new Error(`Expected needs_companion_app, got ${state5}`);
  stub.setMockAvailable(true);

  // State 6: syncing
  stub.setMockState("syncing");
  const state6 = await stub.getState();
  if (state6 !== "syncing") throw new Error(`Expected syncing, got ${state6}`);

  // State 7: stale
  stub.setMockState("stale");
  const state7 = await stub.getState();
  if (state7 !== "stale") throw new Error(`Expected stale, got ${state7}`);

  // State 8: error
  stub.setMockState("error");
  const state8 = await stub.getState();
  if (state8 !== "error") throw new Error(`Expected error, got ${state8}`);

  unsubscribe();

  // Validate observed transitions
  if (!observedStates.includes("connecting")) throw new Error("Transition history missing 'connecting'");
  if (!observedStates.includes("connected")) throw new Error("Transition history missing 'connected'");
  if (!observedStates.includes("needs_permission")) throw new Error("Transition history missing 'needs_permission'");
  if (!observedStates.includes("needs_companion_app")) throw new Error("Transition history missing 'needs_companion_app'");

  console.log("[Test] StubProvider ConnectionState machine verification passed.");
  console.log("[Test] All tests completed successfully!");
}

runTests().catch((e) => {
  console.error("[Test] Test execution failed:", e);
  process.exit(1);
});
