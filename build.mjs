import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const serverDir = path.join(dist, 'server');

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';
}

const assets = {
  '/': {
    contentType: contentType('index.html'),
    encoding: 'utf8',
    body: fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
  },
};

function addDirectory(directory, prefix = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    const urlPath = `${prefix}/${entry.name}`.replaceAll('\\', '/');
    if (entry.isDirectory()) addDirectory(source, urlPath);
    else {
      const binary = /\.(png|jpe?g|gif|webp|ico)$/i.test(entry.name);
      assets[urlPath] = {
        contentType: contentType(entry.name),
        encoding: binary ? 'base64' : 'utf8',
        body: binary
          ? fs.readFileSync(source).toString('base64')
          : fs.readFileSync(source, 'utf8'),
      };
    }
  }
}

addDirectory(path.join(root, 'vendor'), '/vendor');
addDirectory(path.join(root, 'assets'), '/assets');

const workerSource = fs.readFileSync(path.join(root, 'worker', 'index.js'), 'utf8');
const marker = 'const assets = __ASSETS__;';
if (!workerSource.includes(marker)) throw new Error('Worker asset marker is missing');
const worker = workerSource.replace(marker, `const assets = ${JSON.stringify(assets)};`);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(path.join(dist, '.openai'), { recursive: true });
fs.writeFileSync(path.join(serverDir, 'index.js'), worker);
fs.copyFileSync(path.join(root, '.openai', 'hosting.json'), path.join(dist, '.openai', 'hosting.json'));
console.log(`Built Sites Worker with ${Object.keys(assets).length} embedded assets`);
