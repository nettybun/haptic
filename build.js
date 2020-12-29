import esbuild from 'esbuild';

const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(?:h|v)$/ }, args => {
      return { path: args.path, external: true };
    });
  },
};

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'publish/index.js',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: true,
  plugins: [
    externalPlugin,
  ],
  logLevel: 'info',
}).catch(err => {
  console.error(err);
  process.exit(1);
});
