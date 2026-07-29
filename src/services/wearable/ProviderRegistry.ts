import type { HealthProvider } from "./HealthProvider";
import { HealthConnectAdapter } from "./healthConnectAdapter";
import { HealthKitAdapter } from "./healthKitAdapter";
import { StubProvider } from "./stubProvider";
import { Reliability } from "./types";

const RELIABILITY_ORDER: Record<Reliability, number> = {
  recommended: 3,
  direct: 2,
  indirect: 1,
};

class ProviderRegistry {
  private providers: HealthProvider[] = [];

  constructor() {
    // Register platform adapters and the test stub provider
    this.providers.push(new HealthConnectAdapter());
    this.providers.push(new HealthKitAdapter());
    this.providers.push(new StubProvider());
  }

  registerProvider(provider: HealthProvider) {
    this.providers.push(provider);
  }

  getProviders(): HealthProvider[] {
    return this.providers;
  }

  getProvider(id: string): HealthProvider | null {
    return this.providers.find((p) => p.id === id) || null;
  }

  async getAvailableProviders(): Promise<HealthProvider[]> {
    const available: HealthProvider[] = [];
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }

    // Sort descending by reliability rank
    return available.sort((a, b) => {
      const rankA = RELIABILITY_ORDER[a.reliability] || 0;
      const rankB = RELIABILITY_ORDER[b.reliability] || 0;
      return rankB - rankA;
    });
  }
}

export const providerRegistry = new ProviderRegistry();
