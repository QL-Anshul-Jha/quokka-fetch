declare module '../../utils/types' {
  interface BlazionPluginConfig {
    qCache?: boolean;
    qCacheTime?: number;
  }
  interface BlazionPluginIndividualRequestConfig {
    qCache?: boolean;
    qCacheTime?: number;
  }
}

export interface CacheOptions {
  globalCacheEnabled?: boolean;
  globalCacheTime?: number;
}
