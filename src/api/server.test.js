// @vitest-environment node

import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProductionServer, DEFAULT_PORT, readPackageMetadata, resolvePort } from '../../server/app.js';

const temporaryDirectories = [];
const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixtureDetails() {
  const distDir = await mkdtemp(join(tmpdir(), 'openresume-server-'));
  temporaryDirectories.push(distDir);
  await writeFile(join(distDir, 'index.html'), '<h1>OpenResume</h1>');
  await writeFile(join(distDir, 'app.js'), 'export const ready = true;');
  const server = await createProductionServer({ distDir, logger: { error() {} } });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, distDir };
}

async function fixture() {
  return (await fixtureDetails()).baseUrl;
}

describe('production server', () => {
  it('uses package.json as the version authority', async () => {
    const baseUrl = await fixture();
    const expected = await readPackageMetadata();
    const response = await fetch(`${baseUrl}/api/version`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
  });

  it('reports health as JSON', async () => {
    const response = await fetch(`${await fixture()}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('serves files with their MIME type and supports HEAD', async () => {
    const baseUrl = await fixture();
    const response = await fetch(`${baseUrl}/app.js`);
    const head = await fetch(`${baseUrl}/app.js`, { method: 'HEAD' });

    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(await response.text()).toContain('ready');
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('falls back to the SPA only for extensionless routes', async () => {
    const baseUrl = await fixture();
    const route = await fetch(`${baseUrl}/profiles/current`);
    const missingAsset = await fetch(`${baseUrl}/missing.css`);

    expect(route.status).toBe(200);
    expect(await route.text()).toContain('OpenResume');
    expect(missingAsset.status).toBe(404);
    expect((await missingAsset.json()).error.code).toBe('NOT_FOUND');
  });

  it('rejects encoded traversal and unknown API paths with JSON errors', async () => {
    const baseUrl = await fixture();
    const traversal = await fetch(`${baseUrl}/%2e%2e%2fpackage.json`);
    const unknownApi = await fetch(`${baseUrl}/api/unknown`);

    expect(traversal.status).toBe(400);
    expect((await traversal.json()).error.code).toBe('INVALID_PATH');
    expect(unknownApi.status).toBe(404);
    expect((await unknownApi.json()).error.code).toBe('API_NOT_FOUND');
  });

  it('does not follow public-directory symlinks to files outside dist', async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), 'openresume-private-'));
    temporaryDirectories.push(outsideDir);
    await writeFile(join(outsideDir, 'secret.txt'), 'not public');
    const { baseUrl, distDir } = await fixtureDetails();
    await symlink(outsideDir, join(distDir, 'leak'), 'junction');

    const response = await fetch(`${baseUrl}/leak/secret.txt`);
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe('NOT_FOUND');
  });

  it('rejects unsupported methods explicitly', async () => {
    const response = await fetch(`${await fixture()}/api/health`, { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect((await response.json()).error.code).toBe('METHOD_NOT_ALLOWED');
  });
});

describe('server configuration', () => {
  it('uses stable port 4173 by default and validates overrides', () => {
    expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
    expect(resolvePort('8080')).toBe(8080);
    expect(() => resolvePort('random')).toThrow(/PORT must be an integer/);
  });
});
