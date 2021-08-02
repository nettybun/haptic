import esbuild from 'esbuild';
import { gzip as gzipCallback } from 'fflate';
import { minify } from 'terser';
import { readFile, writeFile } from 'fs/promises';
import { promisify } from 'util';

const gzip = promisify(gzipCallback);

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

// All bundles are "index.js" so far
const sourceComment = '\n//# sourceMappingURL=index.js.map';
const terserCacheFile = 'terser-name-cache.json';

let terserCache = {};
try {
  const file = await readFile(terserCacheFile, 'utf-8');
  if (file.length) {
    terserCache = JSON.parse(file);
  }
} catch (e) {}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const processFile = async (file) => {
  const srcDataFull = await readFile(file);
  const indexEndOfCode = srcDataFull.length - sourceComment.length;
  const srcData = srcDataFull.subarray(0, indexEndOfCode);
  // Awkward encode/decode because Terser doesn't support buffers
  const { code: minText } = await minify(decoder.decode(srcData), {
    module: true,
    nameCache: terserCache,
    compress: {
      passes: 5,
      ecma: 2021,
    },
  });
  const minData = encoder.encode(minText);
  // Using async mostly for consistency:
  // https://github.com/101arrowz/fflate/issues/55#issuecomment-827218603
  const mingzData = await gzip(minData, {
    // TypeError: Cannot perform Construct on a detached ArrayBuffer
    consume: false,
    level: 9,
  });
  const [withoutJS] = file.split('.js');
  // XXX: Is this safe without a Promise.all()? I need Node to stay alive...
  await Promise.all([
    writeFile(withoutJS + '.src.js', srcData),
    writeFile(withoutJS + '.min.js', minData),
    writeFile(withoutJS + '.min.js.gz', mingzData),
  ]);
  return {
    file,
    src: srcData.length,
    min: minData.length,
    mingz: mingzData.length,
  };
};

// const [...] = buildResult.outputFiles;
esbuild.build({
  entryPoints,
  outdir: 'publish',
  plugins: [
    externalPlugin,
  ],
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: false, // Terser below
  metafile: true,
  define,
}).then(async (build) => {
  const sizes = await Promise.all(
    Object.keys(build.metafile.outputs)
      .filter((filePath) => !filePath.endsWith('.map'))
      .map(processFile)
  );
  const pad = (n) => String(n).padEnd(5);
  sizes.forEach(({ file, src, min, mingz }) => {
    file = file.replace('publish/', '');
    console.log(
      `${file.padEnd(15)} src:${pad(src)} min:${pad(min)} min+gzip:${mingz}`);
  });
  await writeFile(terserCacheFile, JSON.stringify(terserCache, null, 2));
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
  // Don't bother with Terser for legacy formats
  minify: true,
  define,
}).catch((err) => {
  console.error('CJS', err);
  process.exit(1);
});
