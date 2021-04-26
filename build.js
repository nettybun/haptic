import esbuild from 'esbuild';

const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(dom|wire)$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

const shared = {
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: true,
  // About 100 characters saved this way
  define: {
    STATE_OFF: 0,
    STATE_ON: 1,
    STATE_RUNNING: 2,
    STATE_PAUSED: 3,
    STATE_STALE: 4,
  },
};

Promise.all([
  esbuild.build({
    entryPoints: ['src/dom/index.ts'],
    outfile: 'publish/dom/index.js',
    ...shared,
  }),
  esbuild.build({
    entryPoints: ['src/wire/index.ts'],
    outfile: 'publish/wire/index.js',
    ...shared,
  }),
  esbuild.build({
    entryPoints: ['src/extras/index.ts'],
    outfile: 'publish/extras/index.js',
    plugins: [
      externalPlugin,
    ],
    ...shared,
  }),
  esbuild.build({
    entryPoints: ['src/index.ts'],
    outfile: 'publish/index.js',
    plugins: [
      externalPlugin,
    ],
    ...shared,
  }),
])
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
