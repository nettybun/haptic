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
    // About 100 characters saved this way
    define: {
      STATE_OFF: 0,
      STATE_ON: 1,
      STATE_RUNNING: 2,
      STATE_PAUSED: 3,
      STATE_STALE: 4,
    },
  })
  .then((sr) => {
    console.log(`Listening on http://${sr.host}:${sr.port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
