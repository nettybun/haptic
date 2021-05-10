import esbuild from 'esbuild';
import { gzip } from 'fflate';
import { readFile, writeFile } from 'fs/promises';

const entryPoints = [
  'src/dom/index.ts',
  'src/wire/index.ts',
  'src/utils/index.ts',
  'src/index.ts',
];

// About 100 characters saved this way
const define = {
  STATE_RESET: 0,
  STATE_RUNNING: 1,
  STATE_WIRED_WAITING: 2,
  STATE_WIRED_PAUSED: 3,
  STATE_WIRED_STALE: 4,
};

// This is explained in ./src/index.ts. Haptic's bundle entrypoint isn't a self
// contained bundle. This is to support unbundled developement workflows that
// are ESM-only. For production, your bundler can re-bundle it.
const externalPlugin = {
  name: 'external',
  setup(build) {
    build.onResolve({ filter: /\.\/(dom|wire)$/ }, (args) => {
      const importPath = args.path.replace(/^.+\//, 'haptic/');
      return { path: importPath, external: true };
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
}).then((build) => Promise.all(
  Object.keys(build.metafile.outputs)
    .filter((filePath) => !filePath.endsWith('.map'))
    .map(async (file) => {
      const readDataFull = await readFile(file);
      const sourceComment = '\n//# sourceMappingURL=index.js.map';
      const indexEndOfCode = readDataFull.length - sourceComment.length;
      const readData = readDataFull.subarray(0, indexEndOfCode);
      const writeData = await new Promise((res, rej) => {
        gzip(readData, { consume: true, level: 9 }, (err, data) => {
          if (err) rej(err);
          // Emit the .gz file so webservers can serve that directly
          writeFile(file + '.gz', data);
          res(data);
        });
      });
      return {
        file,
        min: readData.length,
        mingz: writeData.length,
      };
    })
)).then((sizeObjects) => {
  sizeObjects.forEach(({ file, min, mingz }) => {
    file = file.replace('publish/', '');
    console.log(
      `${file.padEnd(15)} min:${String(min).padEnd(5)} min+gzip:${mingz}`);
  });
}).catch((err) => {
  console.error('ESM', err);
  process.exit(1);
});

// CommonJS for older Node and require()
esbuild.build({
  entryPoints,
  entryNames: '[dir]/[name]-cjs',
  outdir: 'publish',
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
