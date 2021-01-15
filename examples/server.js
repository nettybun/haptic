import esbuild from 'esbuild';
import http from 'http';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

let serve;
let exit;

const exitHandler = () => {
  if (exit) return;
  exit = true;
  console.log();
  if (serve) {
    console.log('Turning off esbuild');
    serve.stop();
  }
  if (server) {
    console.log('Turning off webserver');
    server.close();
  }
};
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);

esbuild
  .serve({
    port: 3000,
  }, {
    entryPoints: ['./index.tsx'],
    format: 'esm',
    bundle: true,
  })
  .then(serveProcess => {
    serve = serveProcess;
    server.listen(4000, err => {
      if (err) throw err;
      console.log('Served on http://localhost:4000');
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

const server = http.createServer((req, res) => {
  console.log(`${req.method}: ${req.url}`);
  if (!req.url) {
    res.writeHead(400, 'No URL');
    res.end();
    return;
  }
  if (req.url.endsWith('.js')) {
    const proxyReq = http.request({ path: req.url, port: 3000 });
    proxyReq.on('response', proxyRes => {
      for (const key in proxyRes.headers) {
        res.setHeader(key, proxyRes.headers[key]);
      }
      console.log(`Proxy: ${req.url}: ${proxyRes.statusCode} ${proxyRes.headers['content-type']}`);
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
    return;
  }

  // Send file
  const filename = req.url !== '/' ? req.url : 'index.html';
  const filepath = path.join(__dirname, filename);
  const { ext } = path.parse(filepath);
  /* eslint-disable key-spacing */
  const mimetypes = {
    '.html': 'text/html',
    '.css' : 'text/css',
  };
  res.writeHead(200, {
    'Content-Type': mimetypes[ext] || 'application/octet-stream',
  });
  const stream = fs.createReadStream(filepath);
  stream.on('error', err => {
    const errStr = String(err);
    console.log(`Stream error: ${filepath}, ${errStr}`);
    res.writeHead(404, 'Stream error');
    res.write(errStr);
    res.end();
  });
  stream.pipe(res);
});
