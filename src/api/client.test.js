import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client.js';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('API client', () => {
  it('reads health and version through the focused endpoints', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ name: 'openresume-builder', version: '2.2.6' }));
    const client = createApiClient({ baseUrl: 'https://example.test', fetchImpl });

    await expect(client.getHealth()).resolves.toEqual({ ok: true });
    await expect(client.getVersion()).resolves.toEqual({ name: 'openresume-builder', version: '2.2.6' });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://example.test/api/health',
      'https://example.test/api/version',
    ]);
  });

  it('surfaces structured server errors', async () => {
    const client = createApiClient({
      fetchImpl: async () => jsonResponse({ error: { code: 'UNAVAILABLE', message: 'Try again shortly.' } }, { status: 503 }),
    });

    await expect(client.getHealth()).rejects.toMatchObject({
      name: 'ApiError', status: 503, code: 'UNAVAILABLE', message: 'Try again shortly.',
    });
  });

  it('identifies malformed JSON responses', async () => {
    const client = createApiClient({ fetchImpl: async () => new Response('not json') });
    await expect(client.getVersion()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('turns network failures into actionable errors', async () => {
    const client = createApiClient({ fetchImpl: async () => { throw new TypeError('offline'); } });
    await expect(client.getHealth()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('Check that it is running'),
    });
  });

  it('honors an already-cancelled caller signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const client = createApiClient({
      fetchImpl: async (_url, { signal }) => {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      },
    });

    await expect(client.getHealth({ signal: controller.signal })).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
    });
  });

  it('aborts slow requests at the configured timeout', async () => {
    vi.useFakeTimers();
    const client = createApiClient({
      timeoutMs: 25,
      fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    });
    const request = client.getHealth();
    const rejection = expect(request).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(25);

    await rejection;
    vi.useRealTimers();
  });

  it('exports a recognizable error type', () => {
    expect(new ApiError('Nope')).toBeInstanceOf(Error);
  });
});
