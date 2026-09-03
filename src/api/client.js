export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function errorMessage(body, fallback) {
  return typeof body?.error?.message === 'string' ? body.error.message : fallback;
}

function errorCode(body, fallback) {
  return typeof body?.error?.code === 'string' ? body.error.code : fallback;
}

export function createApiClient({ baseUrl = '', fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be greater than zero.');

  async function get(path, { signal } = {}) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abortFromCaller = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abortFromCaller, { once: true });
    if (signal?.aborted) abortFromCaller();

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });

      let body;
      try {
        body = await response.json();
      } catch (cause) {
        throw new ApiError(`The server returned an invalid response for ${path}.`, {
          status: response.status,
          code: 'INVALID_RESPONSE',
          cause,
        });
      }

      if (!response.ok) {
        throw new ApiError(errorMessage(body, `Request to ${path} failed with status ${response.status}.`), {
          status: response.status,
          code: errorCode(body, 'HTTP_ERROR'),
        });
      }

      return body;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) {
        throw new ApiError(`The server did not respond to ${path} within ${timeoutMs} ms.`, {
          code: 'REQUEST_TIMEOUT',
          cause: error,
        });
      }
      if (signal?.aborted) {
        throw new ApiError(`The request to ${path} was cancelled.`, { code: 'REQUEST_ABORTED', cause: error });
      }
      throw new ApiError(`Could not reach the server at ${path}. Check that it is running and try again.`, {
        code: 'NETWORK_ERROR',
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  return {
    getHealth: (options) => get('/api/health', options),
    getVersion: (options) => get('/api/version', options),
  };
}

export const apiClient = createApiClient();
