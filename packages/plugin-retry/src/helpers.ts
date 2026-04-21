import { BlazionError } from '@blazion/core';

const MAX_RETRY_DELAY = 30000;

// Abortable sleep helper
const sleep = (ms: number, signal?: AbortSignal | null): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // If the signal was already aborted before we started, fail immediately.
    if (signal?.aborted) return reject(signal.reason);

    // Start a timer that will resolve the Promise after the given delay.
    const timer = setTimeout(resolve, ms);

    // If an AbortSignal is provided, listen for abort events.
    signal?.addEventListener(
      'abort',
      () => {
        // Stop the timer so it does not resolve later. with promise rejection
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
};

// Execute recursion with backoff
export const executeWithRetry = async <T>(
  fn: () => Promise<T>,
  retryCount: number,
  retryDelay: number,
  backoff: 'fixed' | 'exponential' = 'exponential',
  signal?: AbortSignal | null // Support null from config
): Promise<T> => {
  // --- 1. RETRY LOOP ---
  let lastError: BlazionError | Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as BlazionError | Error;

      // Fail early if error is not retryable
      if (lastError instanceof BlazionError && !lastError.retryable) {
        throw lastError;
      }

      // Final attempt fail
      if (attempt === retryCount) throw lastError;

      // Calculate delay
      const delay = (backoff === 'exponential')
        ? Math.min(retryDelay * Math.pow(2, attempt), MAX_RETRY_DELAY)
        : retryDelay;

      // Wait (abortable)
      await sleep(delay, signal);
    }
  }

  throw lastError;
};
