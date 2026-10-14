import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port ${String(port)}. Use --port with an integer from 1 to 65535.`);
  process.exit(1);
}
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = args.includes('--dist') ? resolve(repo, 'dist') : repo;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('This static server accepts GET and HEAD requests.');
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    let file = resolve(root, `.${pathname}`);
    if (pathname.includes('\0') || (file !== root && !file.startsWith(`${root}${sep}`))) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('The requested path is outside the game directory.');
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) file = resolve(file, 'index.html');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status = error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : error instanceof URIError ? 400 : 500;
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 404 ? 'This game file was not found. Check the path, or run npm run build before using --dist.' : status === 400 ? 'The requested URL contains invalid escaping. Use a valid game file path.' : 'The game file could not be read. Check the source directory and try again.');
  }
});

server.on('error', (error) => {
  console.error(`Could not serve Emberwake on 127.0.0.1:${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Emberwake: http://127.0.0.1:${port} (PID ${process.pid}; Ctrl+C stops the server)`));
const stop = () => { server.closeAllConnections(); server.close(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
