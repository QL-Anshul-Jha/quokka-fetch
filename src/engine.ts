import {
  ResponseType, BlazionErrorCode,
  FetchOptions, BlazionConfig, BlazionInterceptors, BlazionRequestConfig, InterceptedResponseData, BlazionError,
  buildQueryString, mergeHeaders, parseResponseBody, handleResponseError, resolvePayloadAndHeaders, getTimeoutController, resolveFinalSignal,
  BlazionInternalPublic
} from './utils';

export class BlazionInternal implements BlazionInternalPublic {
  public config: BlazionConfig;

  public engineAdapter?: (url: string, config: BlazionRequestConfig, body: BodyInit | null | undefined, rootFetch: typeof fetch) => Promise<Response>;
  public executionWrapper?: <T = InterceptedResponseData>(executor: () => Promise<T>, config: BlazionRequestConfig) => Promise<T>;
  public clearCacheFn?: () => void;

  public interceptors: BlazionInterceptors = {
    request: [],
    response: [],
    error: [],
  };

  constructor(config: BlazionConfig) {
    const {
      baseURL = '',
      headers = { 'Accept': 'application/json, text/plain, */*' },
      responseType = ResponseType.JSON,
      ...restConfig
    } = config;

    this.config = { ...restConfig, baseURL, headers, responseType };
  }

  public async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { baseURL, headers: globalHeaders, timeout: globalTimeout, responseType: globalResponseType } = this.config;

    // --- 1. CONFIGURATION SETUP ---
    let config: BlazionRequestConfig = {
      url: baseURL + endpoint,
      ...options,
      headers: mergeHeaders(globalHeaders as HeadersInit, options.headers),
    };

    // --- 2. REQUEST INTERCEPTOR PIPELINE ---
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }

    const {
      url, query, timeout, responseType, body: rawBody,
      ...customOptions
    } = config;

    // --- 3. RESOLVE RETRY & CACHE CONFIG ---
    const finalTimeout = timeout ?? globalTimeout;

    // --- 5. QUERY PARAMETERS ---
    const qs = buildQueryString(query);
    const finalUrl = qs ? `${url}?${qs}` : url;

    // --- 6. HEADERS ---
    const headers = new Headers(customOptions.headers);

    // --- 7. PAYLOADS & CONTENT-TYPE ---
    const finalBody = resolvePayloadAndHeaders(rawBody, headers);

    // --- 8. EXECUTE WITH RETRY ---
    const executeFetch = async (): Promise<T> => {
      const { controller, timeoutSignal, timeoutId } = getTimeoutController(finalTimeout);
      const finalSignal = resolveFinalSignal(finalTimeout, customOptions.signal, controller, timeoutSignal);

      try {
        let response: Response;

        if (this.engineAdapter) {
          response = await this.engineAdapter(finalUrl, { ...config, signal: finalSignal }, finalBody, fetch);
        } else {
          response = await fetch(finalUrl, { ...customOptions, headers, body: finalBody, signal: finalSignal });
        }

        const expectedType = responseType || (globalResponseType as ResponseType);

        let data = await parseResponseBody(response, expectedType);
        handleResponseError(response, expectedType, data, config);

        for (const interceptor of this.interceptors.response) {
          data = await interceptor(data, response);
        }

        return data as Extract<typeof data, T>;
      } catch (e) {
        if (e instanceof BlazionError) throw e;

        const error = e as Error;
        let code = BlazionErrorCode.NETWORK_ERROR;
        let message = error.message;

        if (error.name === 'AbortError') {
          code = finalTimeout ? BlazionErrorCode.TIMEOUT : BlazionErrorCode.ABORT;
          message = finalTimeout ? `Request timed out after ${finalTimeout}ms` : 'Request was manually aborted';
        }

        const qfError = new BlazionError({
          code,
          message,
          url: finalUrl,
          method: config.method || 'GET',
          cause: error,
          config
        });

        for (const interceptor of this.interceptors.error) {
          await interceptor(qfError);
        }

        throw qfError;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    if (this.executionWrapper) {
      return this.executionWrapper(executeFetch, config);
    }

    return executeFetch();
  }

  public clearCache(): void {
    if (this.clearCacheFn) this.clearCacheFn();
  }
}
