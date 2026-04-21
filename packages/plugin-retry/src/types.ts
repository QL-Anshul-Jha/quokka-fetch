declare module '@blazion/core' {
  interface BlazionPluginConfig {
    retry?: number;
    retryDelay?: number;
  }
  interface BlazionPluginIndividualRequestConfig {
    retry?: number;
    retryDelay?: number;
  }
}

export interface RetryOptions {
  globalRetry?: number;
  globalRetryDelay?: number;
}
