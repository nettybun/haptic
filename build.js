import esbuild from 'esbuild';

const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(h|v)$/ }, args => {
      // Resolve as 'h' or 'v'
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
};

Promise.all([
  esbuild.build({
    entryPoints: ['src/h/index.ts'],
    outfile: 'publish/h/index.js',
    ...shared,
  }),
  esbuild.build({
    entryPoints: ['src/v/index.ts'],
    outfile: 'publish/v/index.js',
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
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
