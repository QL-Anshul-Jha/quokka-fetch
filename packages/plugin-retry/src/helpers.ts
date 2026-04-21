import { BlazionError } from '@blazion/core';

const MAX_RETRY_DELAY = 30000;

// Execute with exponential backoff
export const executeWithRetry = async <T>(
  fn: () => Promise<T>,
  retryCount: number,
  retryDelay: number,
  backoff: 'fixed' | 'exponential' = 'exponential'
): Promise<T> => {
  // --- 1. RETRY LOOP ---
  let lastError: BlazionError | Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as BlazionError | Error;

      // If the error is a BlazionError, only retry if it's retryable
      if (lastError instanceof BlazionError && !lastError.retryable) {
        throw lastError;
      }

      // If we've exhausted all retries, throw
      if (attempt === retryCount) throw lastError;

      // Calculate delay based on strategy
      const delay = (backoff === 'exponential')
        ? Math.min(retryDelay * Math.pow(2, attempt), MAX_RETRY_DELAY)
        : retryDelay;

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
};
