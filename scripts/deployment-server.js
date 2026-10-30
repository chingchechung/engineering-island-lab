import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function contained(root, path) {
  const name = relative(root, path);
  return name === '' || (!isAbsolute(name) && name !== '..' && !name.startsWith(`..${sep}`));
}

/** Strict local HTTP simulation, not an Apache or school-server deployment. */
export async function startDeploymentServer({ root, mountPath = '/course/' }) {
  if (typeof root !== 'string' || !root) throw new Error('A static root is required');
  if (
    typeof mountPath !== 'string' ||
    !/^\/(?:[A-Za-z0-9_~.-]+\/)*$/.test(mountPath) ||
    mountPath.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error('mountPath must be an absolute directory URL ending in /');
  const directory = await realpath(resolve(root));
  if (!(await stat(directory)).isDirectory()) throw new Error('Static root must be a directory');
  const server = createServer(async (request, response) => {
    const finish = (status, body, headers = {}) => {
      response.writeHead(status, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
        ...headers,
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      finish(405, 'Method not allowed', { allow: 'GET, HEAD' });
      return;
    }
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (mountPath !== '/' && url.pathname === mountPath.slice(0, -1)) {
        finish(308, 'Directory redirect', { location: `${mountPath}${url.search}` });
        return;
      }
      if (!url.pathname.startsWith(mountPath)) {
        finish(404, 'Not found');
        return;
      }
      let name;
      try {
        name = decodeURIComponent(url.pathname.slice(mountPath.length));
      } catch {
        finish(400, 'Invalid URL encoding');
        return;
      }
      if (name.includes('\\') || name.includes('\0') || name.split('/').some((p) => p === '..')) {
        finish(404, 'Not found');
        return;
      }
      let filename = resolve(directory, name || '.');
      if (!contained(directory, filename)) {
        finish(404, 'Not found');
        return;
      }
      filename = await realpath(filename);
      if (!contained(directory, filename)) {
        finish(404, 'Not found');
        return;
      }
      if ((await stat(filename)).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          finish(308, 'Directory redirect', { location: `${url.pathname}/${url.search}` });
          return;
        }
        filename = await realpath(resolve(filename, 'index.html'));
      }
      if (!contained(directory, filename) || !(await stat(filename)).isFile()) {
        finish(404, 'Not found');
        return;
      }
      const bytes = await readFile(filename);
      const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
      const immutable = /^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(name);
      const headers = {
        'content-type': MIME[extname(filename).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        'x-content-type-options': 'nosniff',
        etag,
      };
      if (request.headers['if-none-match'] === etag) {
        response.writeHead(304, headers);
        response.end();
        return;
      }
      response.writeHead(200, { ...headers, 'content-length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      // Missing files stay real 404s. Never return index.html as an SPA fallback.
      finish(['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code) ? 404 : 500, 'Not found');
    }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  return {
    baseUrl: new URL(mountPath, `http://127.0.0.1:${server.address().port}`).href,
    kind: 'node-http-simulation',
    close: async () => {
      await new Promise((accept, reject) =>
        server.close((error) => (error ? reject(error) : accept())),
      );
    },
  };
}

export function parseDeploymentArguments(args) {
  const options = { root: 'dist', mountPath: '/', help: false },
    seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help' || flag === '-h') {
      options.help = true;
      continue;
    }
    if (
      !['--root', '--mount'].includes(flag) ||
      seen.has(flag) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error('Invalid arguments; use --help');
    seen.add(flag);
    options[flag === '--root' ? 'root' : 'mountPath'] = args[++i];
  }
  return options;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = parseDeploymentArguments(process.argv.slice(2));
    if (options.help) {
      console.log('用法：node scripts/deployment-server.js [--root dist] [--mount /course/]');
    } else {
      const server = await startDeploymentServer(options);
      console.log(`Local static HTTP simulation (not Apache): ${server.baseUrl}`);
      console.log('Loopback only; press Ctrl+C to stop. No school deployment performed.');
      let closing = false;
      const stop = async () => {
        if (closing) return;
        closing = true;
        await server.close();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
