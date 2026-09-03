import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 4173;

const DEFAULT_DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url));
const DEFAULT_PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url));

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function sendJson(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(payload);
}

function requestPath(request) {
  const rawPath = (request.url ?? '/').split(/[?#]/, 1)[0];
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { error: 'The request path is not valid URL encoding.' };
  }

  if (decodedPath.includes('\0')) {
    return { error: 'The request path contains an invalid character.' };
  }

  const segments = decodedPath.replaceAll('\\', '/').split('/');
  if (segments.includes('..')) {
    return { error: 'The request path is outside the public directory.' };
  }

  return { path: decodedPath };
}

function safeFilePath(distDir, pathname) {
  const root = resolve(distDir);
  const candidate = resolve(root, `.${pathname.replaceAll('\\', '/')}`);
  const fromRoot = relative(root, candidate);

  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || fromRoot === '') {
    return fromRoot === '' && pathname === '/' ? resolve(root, 'index.html') : null;
  }

  return candidate;
}

function pathIsWithin(root, candidate) {
  const fromRoot = relative(root, candidate);
  return fromRoot !== '' && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`);
}

async function existingPublicFile(root, path) {
  try {
    const [realRoot, realFile] = await Promise.all([realpath(root), realpath(path)]);
    return pathIsWithin(realRoot, realFile) && (await stat(realFile)).isFile();
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
    throw error;
  }
}

function isSpaRoute(pathname) {
  const finalSegment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  return !extname(finalSegment);
}

async function sendFile(request, response, path) {
  const contents = await readFile(path);
  response.writeHead(200, {
    'content-type': MIME_TYPES.get(extname(path).toLowerCase()) ?? 'application/octet-stream',
    'content-length': contents.byteLength,
    'cache-control': extname(path).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  });
  response.end(request.method === 'HEAD' ? undefined : contents);
}

export async function readPackageMetadata(packagePath = DEFAULT_PACKAGE_PATH) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(packagePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read application metadata from ${packagePath}.`, { cause: error });
  }

  if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string') {
    throw new Error(`Application metadata in ${packagePath} must include string name and version fields.`);
  }

  return { name: parsed.name, version: parsed.version };
}

export function createRequestHandler({ distDir = DEFAULT_DIST_DIR, metadata, logger = console } = {}) {
  if (!metadata) throw new TypeError('metadata is required');

  return async function handleRequest(request, response) {
    try {
      const parsedPath = requestPath(request);
      if (parsedPath.error) {
        sendJson(response, 400, { error: { code: 'INVALID_PATH', message: parsedPath.error } });
        return;
      }

      const pathname = parsedPath.path;
      if (pathname === '/api/health' || pathname === '/api/version') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          sendJson(
            response,
            405,
            { error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET and HEAD are supported for this endpoint.' } },
            { allow: 'GET, HEAD' },
          );
          return;
        }

        const body = pathname === '/api/health' ? { ok: true } : metadata;
        if (request.method === 'HEAD') {
          response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          response.end();
        } else {
          sendJson(response, 200, body);
        }
        return;
      }

      if (pathname.startsWith('/api/')) {
        sendJson(response, 404, {
          error: { code: 'API_NOT_FOUND', message: `No API endpoint exists at ${pathname}.` },
        });
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, {
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Static content only supports GET and HEAD.' },
        }, { allow: 'GET, HEAD' });
        return;
      }

      const requestedFile = safeFilePath(distDir, pathname);
      if (!requestedFile) {
        sendJson(response, 400, {
          error: { code: 'INVALID_PATH', message: 'The request path is outside the public directory.' },
        });
        return;
      }

      if (await existingPublicFile(distDir, requestedFile)) {
        await sendFile(request, response, requestedFile);
        return;
      }

      const indexFile = resolve(distDir, 'index.html');
      if (isSpaRoute(pathname) && await existingPublicFile(distDir, indexFile)) {
        await sendFile(request, response, indexFile);
        return;
      }

      sendJson(response, 404, {
        error: { code: 'NOT_FOUND', message: `No public file exists at ${pathname}.` },
      });
    } catch (error) {
      logger.error?.('Request failed.', error);
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: { code: 'INTERNAL_ERROR', message: 'The server could not complete the request.' },
        });
      } else {
        response.destroy();
      }
    }
  };
}

export async function createProductionServer(options = {}) {
  const metadata = options.metadata ?? await readPackageMetadata(options.packagePath);
  return createServer(createRequestHandler({ ...options, metadata }));
}

export function resolvePort(value = process.env.PORT) {
  if (value === undefined || value === '') return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer from 1 to 65535; received ${value}.`);
  }
  return port;
}
