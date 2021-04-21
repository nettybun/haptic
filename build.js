import esbuild from 'esbuild';

const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(h|w)$/ }, (args) => {
      // Resolve as 'h' or 'w'
      const lastChar = args.path[args.path.length - 1];
      return { path: `./${lastChar}`, external: true };
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
    entryPoints: ['src/h/index.ts'],
    outfile: 'publish/h/index.js',
    ...shared,
  }),
  esbuild.build({
    entryPoints: ['src/w/index.ts'],
    outfile: 'publish/w/index.js',
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
