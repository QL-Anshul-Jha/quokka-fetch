import { BlazionErrorCode, BlazionError, BlazionRequestConfig, ProgressEventData } from '@blazion/core';

export const executeXhrWithUploadProgress = (
  url: string,
  config: BlazionRequestConfig,
  finalBody: BodyInit | null | undefined
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === 'undefined') {
      return reject(new BlazionError({
        code: BlazionErrorCode.NOT_IMPLEMENTED,
        message: 'Upload progress relies on XMLHttpRequest which is not available in full execution environments.',
        url,
        method: config.method || 'GET',
        config
      }));
    }

    const xhr = new XMLHttpRequest();
    xhr.open(config.method || 'GET', url, true);
    xhr.responseType = 'blob';

    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value as string));
    }

    const bindProgress = (event: ProgressEvent, callback?: (data: ProgressEventData) => void) => {
      if (event.lengthComputable && callback) {
        const safeTotal = Math.max(event.total, event.loaded);
        callback({
          loaded: event.loaded,
          total: safeTotal,
          progress: safeTotal ? Number((event.loaded / safeTotal).toFixed(4)) : 0
        });
      }
    };

    if (config.onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => bindProgress(e, config.onUploadProgress);
    }

    config.signal?.addEventListener('abort', () => xhr.abort());
    if (config.timeout) xhr.timeout = config.timeout;

    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
        const [header, ...valParts] = line.split(': ');
        if (header) responseHeaders.append(header, valParts.join(': '));
      });

      resolve(new Response(xhr.response as Blob, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders
      }));
    };

    const handleRejection = (code: BlazionErrorCode, message: string) => () => {
      reject(new BlazionError({ code, message, url, method: config.method || 'GET', config }));
    };

    xhr.onerror = handleRejection(BlazionErrorCode.NETWORK_ERROR, 'Network Error during XHR execution');
    xhr.onabort = handleRejection(BlazionErrorCode.ABORT, 'Request aborted manually');
    xhr.ontimeout = handleRejection(BlazionErrorCode.TIMEOUT, 'Request timed out');

    xhr.send((finalBody as XMLHttpRequestBodyInit) || null);
  });
};
