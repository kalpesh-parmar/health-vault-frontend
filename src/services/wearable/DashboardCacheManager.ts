// Local client-side caching to optimize dashboard refresh requests.
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry {
  timestamp: number;
  data: any;
}

class DashboardCacheManager {
  private memoryCache: Record<string, CacheEntry> = {};
  private readonly MEMORY_CACHE_EXPIRY_MS = 5 * 60 * 1000;      // 5 Minutes
  private readonly PERSISTENT_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 Hours

  private cacheKey(metric: string): string {
    return `dashboard_metric_cache_${metric}`;
  }

  /**
   * Retrieves dashboard metrics from cache.
   * Falls back to persistent AsyncStorage cache if memory cache is stale or missing.
   */
  async getCachedMetrics(metric: string): Promise<any | null> {
    const now = Date.now();

    // 1. Check Memory Cache
    const memEntry = this.memoryCache[metric];
    if (memEntry && now - memEntry.timestamp < this.MEMORY_CACHE_EXPIRY_MS) {
      console.log(`[DashboardCacheManager] Memory Cache Hit for metric: ${metric}`);
      return memEntry.data;
    }

    // 2. Fall back to AsyncStorage Cache
    try {
      const serialized = await AsyncStorage.getItem(this.cacheKey(metric));
      if (serialized) {
        const entry: CacheEntry = JSON.parse(serialized);
        if (now - entry.timestamp < this.PERSISTENT_CACHE_EXPIRY_MS) {
          console.log(`[DashboardCacheManager] AsyncStorage Cache Hit for metric: ${metric}`);
          // Hydrate memory cache
          this.memoryCache[metric] = entry;
          return entry.data;
        }
      }
    } catch (e) {
      console.warn(`[DashboardCacheManager] Failed to read from AsyncStorage:`, e);
    }

    return null;
  }

  /**
   * Sets the dashboard metrics in both memory and AsyncStorage cache.
   */
  async setCachedMetrics(metric: string, data: any): Promise<void> {
    const entry: CacheEntry = {
      timestamp: Date.now(),
      data,
    };

    // Update memory
    this.memoryCache[metric] = entry;

    // Update AsyncStorage
    try {
      await AsyncStorage.setItem(this.cacheKey(metric), JSON.stringify(entry));
      console.log(`[DashboardCacheManager] Cached metric: ${metric}`);
    } catch (e) {
      console.warn(`[DashboardCacheManager] Failed to write to AsyncStorage:`, e);
    }
  }

  /**
   * Clears memory cache and removes AsyncStorage variables.
   */
  async clearCache(): Promise<void> {
    console.log("[DashboardCacheManager] Invalidation triggered. Clearing cache...");
    this.memoryCache = {};
  }

  /**
   * Explicitly clear cache for a specific metric.
   */
  async invalidateMetric(metric: string): Promise<void> {
    delete this.memoryCache[metric];
    try {
      await AsyncStorage.removeItem(this.cacheKey(metric));
    } catch (e) {
      // ignore
    }
  }
}

export const dashboardCacheManager = new DashboardCacheManager();
