import esbuild from 'esbuild';
import http from 'http';
import fs from 'fs';
import path from 'path';

let __dirname = path.dirname(new URL(import.meta.url).pathname);

esbuild
  .serve({ port: 3000 }, {
    entryPoints: ['./index.tsx'],
    format: 'esm',
    bundle: true,
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

let mime = {
  '.html': 'text/html',
  '.css': 'text/css',
};
let server = http.createServer((req, res) => {
  let filename = req.url && req.url !== '/' ? req.url : 'index.html';
  let filepath = path.join(__dirname, filename);
  if (fs.existsSync(filepath)) {
    let stream = fs.createReadStream(filepath);
    stream.on('ready', () => {
      let type = mime[path.parse(filepath).ext] || 'application/octet-stream';
      console.log(`${req.method} ${req.url} => 200 ${type}`);
      res.writeHead(200, { 'content-type': type });
      stream.pipe(res);
    });
    stream.on('error', err => {
      console.log(`${req.method} ${req.url} => 500 ${filepath} ${err.name}`);
      res.writeHead(500, err.name);
      res.end(JSON.stringify(err));
    });
  } else {
    let reqProxy = http.request({ path: req.url, port: 3000 });
    reqProxy.on('response', resProxy => {
      let type = resProxy.headers['content-type'];
      console.log(`${req.method} ${req.url} => ${resProxy.statusCode} ${type} via esbuild`);
      res.writeHead(resProxy.statusCode, { 'content-type': type });
      resProxy.pipe(res);
    });
    req.pipe(reqProxy);
  }
});
server.listen(4000, err => {
  if (err) throw err;
  console.log('Served on http://localhost:4000');
});
