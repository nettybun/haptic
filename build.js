import esbuild from 'esbuild';
import { gzipSync } from 'fflate';
import { readFileSync, writeFileSync } from 'fs';

const entryPoints = [
  'src/dom/index.ts',
  'src/state/index.ts',
  'src/stdlib/index.ts',
  'src/index.ts',
];

// About 100 characters saved this way
const define = {
  S_RUNNING: 4,
  S_SKIP_RUN_QUEUE: 2,
  S_NEEDS_RUN: 1,
};

// This is explained in ./src/index.ts. Haptic's bundle entrypoint isn't a self
// contained bundle. This is to support unbundled developement workflows that
// are ESM-only. For production, your bundler can re-bundle it.
const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(dom|state)/ }, (args) => {
      const [, name] = args.path.match(/(dom|state)/);
      // console.log(args, name);
      return { path: `haptic/${name}`, external: true };
    });
  },
};

esbuild.build({
  entryPoints,
  outdir: 'publish',
  plugins: [
    externalPlugin,
  ],
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: true,
  metafile: true,
  define,

}).then(async (build) => {
  // All bundles are "index.js" so far
  const sourceComment = '\n//# sourceMappingURL=index.js.map';
  const pad = (x, n) => String(x).padEnd(n);

  // Using buildResult.outputFiles would skip needing to read the file
  for (const file of Object.keys(build.metafile.outputs)) {
    if (file.endsWith('.map')) continue;
    const min = readFileSync(file).subarray(0, -sourceComment.length);
    const mingz = gzipSync(min, { consume: false, level: 9 });
    writeFileSync(file + '.gz', mingz);
    const name = file.replace('publish/', '');
    console.log(
      `${pad(name, 15)} min:${pad(min.length, 5)} min+gzip:${mingz.length}`);
  }
}).catch((err) => {
  console.error('ESM', err);
  process.exit(1);
});

// CommonJS for older Node and require()
esbuild.build({
  entryPoints,
  outdir: 'publish',
  outExtension: { '.js': '.cjs' },
  plugins: [
    externalPlugin,
  ],
  format: 'cjs',
  bundle: true,
  minify: true,
  define,
}).catch((err) => {
  console.error('CJS', err);
  process.exit(1);
});
