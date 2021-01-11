import esbuild from 'esbuild';

// TODO: Reverse proxy for esbuild's serve?

// import http from 'http';
// import fs from 'fs';
// import path from 'path';

esbuild
  .serve({
    port: 3000,
  }, {
    entryPoints: ['./index.tsx'],
    format: 'esm',
    bundle: true,
  })
  .then(serve => {
    console.log('Served on http://localhost:3000');
    process.on('SIGINT', () => {
      serve.stop();
      process.exit(0);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
