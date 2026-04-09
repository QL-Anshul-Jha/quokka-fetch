import { HttpMethod, ResponseType, BlazionErrorCode, BlazionPluginName } from './enums';

export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

// **BodyInit** is the **complete union type** for **all valid fetch` request bodies**
export type RequestPayload = JSONValue | BodyInit | null;

export interface ProgressEventData {
  loaded: number;
  total: number;
  progress: number;
}

export interface BlazionPluginConfig { } // eslint-disable-line @typescript-eslint/no-empty-object-type
export interface BlazionPluginIndividualRequestConfig { } // eslint-disable-line @typescript-eslint/no-empty-object-type

export type FetchOptions = Omit<RequestInit, 'method' | 'body'> &
  BlazionPluginIndividualRequestConfig & {
    method?: HttpMethod;
    query?: QueryParams;
    body?: RequestPayload;
    timeout?: number;
    responseType?: ResponseType;
  };

export interface BlazionRequestConfig extends FetchOptions {
  url: string;
}

export type InterceptedResponseData = JSONValue | BodyInit;

export interface BlazionInterceptors {
  request: Array<(config: BlazionRequestConfig) => BlazionRequestConfig | Promise<BlazionRequestConfig>>;
  response: Array<(data: InterceptedResponseData, response: Response) => InterceptedResponseData | Promise<InterceptedResponseData>>;
  error: Array<(error: Error) => Promise<void> | void>;
}

// Used for initializing the Blazion instance : Config
export interface BlazionConfig extends BlazionPluginConfig {
  baseURL: string;
  headers?: HeadersInit;
  responseType?: ResponseType;
  timeout?: number;
}

export interface BlazionPlugin {
  name: BlazionPluginName;
  install(instance: BlazionInternalPublic): void;
}

export interface BlazionInternalPublic {
  config: BlazionConfig;
  interceptors: BlazionInterceptors;
  engineAdapter?: (url: string, config: BlazionRequestConfig, body: BodyInit | null | undefined, rootFetch: typeof fetch) => Promise<Response>;
  executionWrapper?: <T = InterceptedResponseData>(executor: () => Promise<T>, config: BlazionRequestConfig) => Promise<T>;
  clearCacheFn?: () => void;
}

export interface BlazionRequestPayload extends Omit<FetchOptions, 'method' | 'body'> {
  url: string;
  method?: HttpMethod;
  payload?: RequestPayload;
  params?: QueryParams;
}

export interface BlazionCallable {
  <T = JSONValue>(payload: BlazionRequestPayload): Promise<T>;

  // Fluent Event Hooks
  onRequest(handler: (config: BlazionRequestConfig) => BlazionRequestConfig | Promise<BlazionRequestConfig>): this;
  onResponse(handler: (data: InterceptedResponseData, response: Response) => InterceptedResponseData | Promise<InterceptedResponseData>): this;
  onError(handler: (error: Error) => Promise<void> | void): this;

  // Cache Management
  clearCache(): void;

  // Plugin System
  use(plugin: BlazionPlugin): this;

  // Instance Creation
  create(config: BlazionConfig): BlazionCallable;
}

export interface BlazionErrorParams {
  code: BlazionErrorCode;
  message: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  data?: JSONValue;
  headers?: Record<string, string>;
  cause?: Error;
  config: BlazionRequestConfig;
  raw?: JSONValue;
}

export interface CacheEntry {
  data: InterceptedResponseData;
  timestamp: number;
  ttl: number;
}

export class BlazionError extends Error {
  public override name: string = 'BlazionError';
  public code: BlazionErrorCode;
  public status?: number;
  public statusText?: string;
  public details: JSONValue;
  public timestamp: string;
  public requestId: string;
  public url: string;
  public method: string;
  public headers: Record<string, string>;
  public cause?: Error;
  public retryable: boolean;
  public isNetworkError: boolean;
  public isTimeoutError: boolean;
  public isAbortError: boolean;
  public raw?: JSONValue;
  public config: BlazionRequestConfig;

  constructor(params: BlazionErrorParams) {
    super(params.message);
    this.code = params.code;
    this.status = params.status;
    this.statusText = params.statusText;
    this.details = params.data || null;
    this.timestamp = new Date().toISOString();
    this.requestId = Math.random().toString(36).substring(7).toUpperCase();
    this.url = params.url;
    this.method = params.method;
    this.headers = params.headers || {};
    this.cause = params.cause;
    this.raw = params.raw;
    this.config = params.config;

    // Retryable logic
    this.isTimeoutError = params.code === BlazionErrorCode.TIMEOUT;
    this.isNetworkError = params.code === BlazionErrorCode.NETWORK_ERROR;
    this.isAbortError = params.code === BlazionErrorCode.ABORT;
    this.retryable = this.isTimeoutError || (this.isNetworkError && params.method === 'GET') || (!!this.status && this.status >= 500);

    // Properly capture stack trace for V8 engines (Chrome/Node)
    const v8Error = Error as { captureStackTrace?: (target: object, constructor?: typeof BlazionError) => void };
    if (v8Error.captureStackTrace) {
      v8Error.captureStackTrace(this, BlazionError);
    }
  }
}
