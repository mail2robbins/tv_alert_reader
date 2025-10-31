// In-memory cache for account configurations to reduce database calls

import { DhanAccountConfig, MultiAccountConfig } from './multiAccountManager';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class AccountConfigCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL
  
  /**
   * Set cache TTL in milliseconds
   */
  setTTL(ttlMs: number) {
    this.defaultTTL = ttlMs;
  }
  
  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Set cache data with optional custom TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }
  
  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      ttl: this.defaultTTL
    };
  }
}

// Singleton instance
const accountConfigCache = new AccountConfigCache();

// Run cleanup every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    accountConfigCache.cleanup();
  }, 10 * 60 * 1000);
}

// Cache keys
const CACHE_KEYS = {
  ALL_CONFIGS: 'all_account_configs',
  ACCOUNT_BY_ID: (id: number) => `account_config_${id}`,
  ACCOUNT_BY_CLIENT_ID: (clientId: string) => `account_config_client_${clientId}`,
  ACTIVE_CONFIGS: 'active_account_configs',
  CONFIG_SUMMARY: 'config_summary'
};

/**
 * Get all account configurations with caching
 */
export async function getCachedAccountConfigurations(
  loadFunction: () => Promise<MultiAccountConfig>
): Promise<MultiAccountConfig> {
  const cached = accountConfigCache.get<MultiAccountConfig>(CACHE_KEYS.ALL_CONFIGS);
  
  if (cached) {
    console.log('✅ Using cached account configurations');
    return cached;
  }
  
  console.log('🔄 Loading account configurations from database');
  const config = await loadFunction();
  accountConfigCache.set(CACHE_KEYS.ALL_CONFIGS, config);
  
  // Also cache individual accounts for faster lookup
  for (const account of config.accounts) {
    accountConfigCache.set(CACHE_KEYS.ACCOUNT_BY_ID(account.accountId), account);
    accountConfigCache.set(CACHE_KEYS.ACCOUNT_BY_CLIENT_ID(account.clientId), account);
  }
  
  return config;
}

/**
 * Get specific account configuration with caching
 */
export async function getCachedAccountConfiguration(
  accountId: number,
  loadFunction: (id: number) => Promise<DhanAccountConfig | null>
): Promise<DhanAccountConfig | null> {
  const cacheKey = CACHE_KEYS.ACCOUNT_BY_ID(accountId);
  const cached = accountConfigCache.get<DhanAccountConfig>(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached account configuration for account ${accountId}`);
    return cached;
  }
  
  console.log(`🔄 Loading account configuration for account ${accountId} from database`);
  const account = await loadFunction(accountId);
  
  if (account) {
    accountConfigCache.set(cacheKey, account);
    accountConfigCache.set(CACHE_KEYS.ACCOUNT_BY_CLIENT_ID(account.clientId), account);
  }
  
  return account;
}

/**
 * Get account configuration by client ID with caching
 */
export async function getCachedAccountConfigurationByClientId(
  clientId: string,
  loadFunction: (clientId: string) => Promise<DhanAccountConfig | null>
): Promise<DhanAccountConfig | null> {
  const cacheKey = CACHE_KEYS.ACCOUNT_BY_CLIENT_ID(clientId);
  const cached = accountConfigCache.get<DhanAccountConfig>(cacheKey);
  
  if (cached) {
    console.log(`✅ Using cached account configuration for client ${clientId}`);
    return cached;
  }
  
  console.log(`🔄 Loading account configuration for client ${clientId} from database`);
  const account = await loadFunction(clientId);
  
  if (account) {
    accountConfigCache.set(cacheKey, account);
    accountConfigCache.set(CACHE_KEYS.ACCOUNT_BY_ID(account.accountId), account);
  }
  
  return account;
}

/**
 * Invalidate account configuration cache
 * Call this when account settings are updated
 */
export function invalidateAccountConfigCache(accountId?: number): void {
  if (accountId) {
    console.log(`🗑️ Invalidating cache for account ${accountId}`);
    accountConfigCache.invalidate(CACHE_KEYS.ACCOUNT_BY_ID(accountId));
    // We don't know the clientId, so invalidate all configs to be safe
    accountConfigCache.invalidate(CACHE_KEYS.ALL_CONFIGS);
    accountConfigCache.invalidate(CACHE_KEYS.ACTIVE_CONFIGS);
    accountConfigCache.invalidate(CACHE_KEYS.CONFIG_SUMMARY);
  } else {
    console.log('🗑️ Invalidating all account configuration cache');
    accountConfigCache.invalidateAll();
  }
}

/**
 * Set cache TTL (in milliseconds)
 * Default is 5 minutes
 */
export function setAccountConfigCacheTTL(ttlMs: number): void {
  accountConfigCache.setTTL(ttlMs);
  console.log(`⏱️ Account config cache TTL set to ${ttlMs}ms (${ttlMs / 1000}s)`);
}

/**
 * Get cache statistics
 */
export function getAccountConfigCacheStats() {
  return accountConfigCache.getStats();
}

export { accountConfigCache };
