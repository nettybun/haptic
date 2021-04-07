import esbuild from 'esbuild';
import path from 'path';

let __dirname = path.dirname(new URL(import.meta.url).pathname);

esbuild
  .serve({
    port: 3000,
    servedir: __dirname,
  }, {
    entryPoints: [path.join(__dirname, 'index.tsx')],
    format: 'esm',
    bundle: true,
    write: false,
  })
  .then(sr => {
    console.log(`Listening on http://${sr.host}:${sr.port}`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
