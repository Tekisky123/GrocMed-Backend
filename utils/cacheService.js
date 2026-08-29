// High performance in-memory cache service for Railway backend API response acceleration
const cacheStore = new Map();

export const cacheService = {
  /**
   * Get cached item if valid
   */
  get: (key) => {
    const item = cacheStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      cacheStore.delete(key);
      return null;
    }
    return item.value;
  },

  /**
   * Set cached item with TTL in seconds (default 60 seconds)
   */
  set: (key, value, ttlSeconds = 60) => {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    cacheStore.set(key, { value, expiresAt });
  },

  /**
   * Clear keys matching a pattern (e.g. 'products', 'categories', 'banners')
   */
  clearPattern: (pattern) => {
    for (const key of cacheStore.keys()) {
      if (key.includes(pattern)) {
        cacheStore.delete(key);
      }
    }
  },

  /**
   * Clear all cached keys
   */
  flushAll: () => {
    cacheStore.clear();
  }
};
