declare module '@blazion/core' {
  interface BlazionPluginConfig {
    retry?: number;
    retryDelay?: number;
    backoff?: 'fixed' | 'exponential';
  }
  interface BlazionPluginIndividualRequestConfig {
    retry?: number;
    retryDelay?: number;
    backoff?: 'fixed' | 'exponential';
  }
}

export interface RetryOptions {
  globalRetry?: number;
  globalRetryDelay?: number;
  backoff?: 'fixed' | 'exponential';
}
