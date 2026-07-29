import { Platform } from "react-native";
import type { HealthProvider } from "./HealthProvider";
import { providerRegistry } from "./ProviderRegistry";

export function getHealthProvider(): HealthProvider {
  const id = Platform.OS === "android" ? "health_connect" : "healthkit";
  const provider = providerRegistry.getProvider(id);
  if (!provider) {
    throw new Error(`Provider ${id} not found in ProviderRegistry`);
  }
  return provider;
}
