import { HttpMethod, InterceptedResponseData, BlazionPlugin, BlazionPluginName, BlazionInternalPublic, BlazionRequestConfig } from '@blazion/core';
import { CacheOptions } from './types';
import { BlazionCache } from './helpers';

export const CachePlugin = (options?: CacheOptions): BlazionPlugin => {
  // --- 1. PLUGIN DEFINITION ---
  return {
    name: BlazionPluginName.CACHE,
    install(instance: BlazionInternalPublic) {
      const cache = new BlazionCache();

      const globalCacheEnabled = options?.globalCacheEnabled ?? instance.config.qCache ?? false;
      const globalCacheTime = options?.globalCacheTime ?? instance.config.qCacheTime ?? 300000;

      // --- 2. CACHE INITIALIZATION ---
      instance.clearCacheFn = () => cache.clear();

      // --- 3. EXECUTION WRAPPER ---
      const currentWrapper = instance.executionWrapper;

      instance.executionWrapper = async <T = InterceptedResponseData>(executor: () => Promise<T>, config: BlazionRequestConfig): Promise<T> => {
        const isCacheEnabled = config.qCache ?? globalCacheEnabled;
        const cacheTime = config.qCacheTime ?? globalCacheTime;
        const method = config.method || HttpMethod.GET;

        // 1. GET Cache check
        let cacheKey = '';
        if (isCacheEnabled && method === HttpMethod.GET) {
          cacheKey = cache.generateKey(method, config.url, config.query);
          const cachedData = cache.get(cacheKey);
          if (cachedData !== undefined) return cachedData as T;
        }

        // 2. Request Deduplication (Debounce)
        if (isCacheEnabled && method === HttpMethod.GET) {
          const existingPromise = cache.getInFlight(cacheKey);
          if (existingPromise) return await (existingPromise as Promise<T>);
        }

        const executeAndTrack = async (): Promise<T> => {
          try {
            const data = currentWrapper ? await (currentWrapper(executor, config) as Promise<T>) : await executor();
            // Cache result if valid
            if (isCacheEnabled && method === HttpMethod.GET) {
              cache.set(cacheKey, data as InterceptedResponseData, cacheTime);
            }
            return data;
          } finally {
            // Always clean up in-flight reference
            if (cacheKey) cache.deleteInFlight(cacheKey);
          }
        };

        const activePromise = executeAndTrack();
        if (cacheKey) cache.setInFlight(cacheKey, activePromise as Promise<InterceptedResponseData>);

        return await activePromise;
      };
    }
  };
};
