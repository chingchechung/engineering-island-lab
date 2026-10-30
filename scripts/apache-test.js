import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
// Pinned local validation image; this script never contacts a school server.
export const APACHE_IMAGE =
  'httpd@sha256:d3accb516506c05ae0068bb54ba6798a10b249b64db91268fca692326cb02b4b';

async function docker(...args) {
  const env = { ...process.env };
  for (const key of [
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
  ])
    delete env[key];
  const { stdout, stderr } = await exec('docker', ['--host=unix:///var/run/docker.sock', ...args], {
    env,
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return (args[0] === 'logs' ? stdout + stderr : stdout).trim();
}

async function makePublicCopyReadable(directory) {
  // Cloud sources intentionally use 0700/0600. Change only the disposable copy;
  // Apache's unprivileged worker needs traversal/read access, as on a real host.
  await chmod(directory, 0o755);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await makePublicCopyReadable(path);
    else if (entry.isFile()) await chmod(path, 0o644);
    else throw new Error('Apache test root must contain only regular static files');
  }
}

// Also documented in APACHE_DEPLOYMENT.md. No rewrite, no .htaccess dependency.
export const APACHE_CONFIG = `ServerRoot "/usr/local/apache2"
Listen 80
ServerName localhost
LoadModule mpm_event_module modules/mod_mpm_event.so
LoadModule unixd_module modules/mod_unixd.so
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule mime_module modules/mod_mime.so
LoadModule dir_module modules/mod_dir.so
LoadModule headers_module modules/mod_headers.so
User www-data
Group www-data
PidFile /tmp/island-httpd.pid
ErrorLog /proc/self/fd/2
LogLevel warn
DocumentRoot "/usr/local/apache2/htdocs"
TypesConfig conf/mime.types
AddType text/javascript .js
AddType text/css .css
AddType application/json .json
AddType image/svg+xml .svg
<Directory />
  AllowOverride None
  Require all denied
</Directory>
<Directory "/usr/local/apache2/htdocs">
  Require all granted
  Options -Indexes -MultiViews
  AllowOverride None
  DirectoryIndex index.html
  <FilesMatch "\\.(html|json)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>
  <FilesMatch "-[A-Za-z0-9_-]{8,}\\.(js|css)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</Directory>
`;

export async function startApacheServer({ root, mountPath = '/course/' }) {
  if (!/^\/(?:[A-Za-z0-9_~-]+\/)*$/.test(mountPath))
    throw new Error('Apache test mountPath must be an absolute directory URL');
  const stage = await mkdtemp(join(tmpdir(), 'island-apache-'));
  let id;
  const close = async () => {
    try {
      if (id) await docker('rm', '--force', id);
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  };
  try {
    const html = join(stage, 'htdocs');
    await mkdir(html);
    await cp(resolve(root), join(html, mountPath.slice(1)), { recursive: true });
    await makePublicCopyReadable(html);
    const config = join(stage, 'httpd.conf');
    await writeFile(config, APACHE_CONFIG);
    id = await docker(
      'create',
      '--label',
      'engineering-island-lab.phase5=true',
      '--publish',
      '127.0.0.1::80',
      APACHE_IMAGE,
    );
    await docker('cp', `${html}/.`, `${id}:/usr/local/apache2/htdocs/`);
    await docker('cp', config, `${id}:/usr/local/apache2/conf/httpd.conf`);
    await docker('start', id);
    const port = await docker('port', id, '80/tcp');
    if (!/^127\.0\.0\.1:\d+$/.test(port)) throw new Error('Apache must bind only loopback');
    const baseUrl = `http://${port}${mountPath}`;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          return {
            baseUrl,
            kind: 'docker-apache-2.4.69',
            image: APACHE_IMAGE,
            close,
            // Test-only fixture update, never a remote deployment operation.
            async replaceFile(relative, data) {
              if (!/^(?:course-config\.json|assignments\/manifest\.json)$/.test(relative))
                throw new Error('Only test config/Manifest replacement is supported');
              const file = join(stage, 'replacement.json');
              await writeFile(file, data);
              await chmod(file, 0o644);
              await docker('cp', file, `${id}:/usr/local/apache2/htdocs${mountPath}${relative}`);
            },
          };
        }
      } catch {
        // The isolated container may need a moment to start listening.
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    const logs = await docker('logs', '--tail', '12', id);
    throw new Error(`Isolated Apache did not become ready: ${logs}`);
  } catch (error) {
    await close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { runSmokeTests } = await import('./smoke-test.js');
  console.log(`Actual local Apache: ${APACHE_IMAGE}; loopback only; no school deployment`);
  await runSmokeTests({ startServer: startApacheServer });
}
