import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { gzipSync } from 'fflate';

const entryPoints = [
  'src/dom/index.ts',
  'src/state/index.ts',
  'src/stdlib/index.ts',
  'src/index.ts',
];

// About 100 characters saved this way. Strings of JS code, so numbers.
const define = {
  S_RUNNING: '4',
  S_SKIP_RUN_QUEUE: '2',
  S_NEEDS_RUN: '1',
};

// This is explained in ./src/index.ts. Haptic's bundle entrypoint isn't a self
// contained bundle. This is to support unbundled developement workflows that
// are ESM-only. For production, your bundler can re-bundle it.
const external = [
  'haptic',
  'haptic/dom',
  'haptic/state',
  'haptic/stdlib',
];

const noComment = (a: Uint8Array) => a.subarray(0, -'\n//# sourceMappingURL=index.js.map'.length);
const gzip = (a: Uint8Array) => gzipSync(a, { level: 9 });
const relName = (filepath: string) => filepath.replace(/.*publish\//, '');
const pad = (x: unknown, n: number) => String(x).padEnd(n);

function walk(dir: string, ext: string, matches: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const filename of files) {
    const filepath = path.join(dir, filename);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, ext, matches);
    } else if (path.extname(filename) === ext) {
      matches.push(filepath);
    }
  }
  return matches;
}

// Gather existing sizes to compare to later on
const prevJSFiles = walk('publish', '.js');
const prevJSSizes: { [k: string]: number } = {};
prevJSFiles.forEach((filepath) => {
  prevJSSizes[relName(filepath)]
    = gzip(noComment(fs.readFileSync(filepath))).length;
});

esbuild.build({
  entryPoints,
  outdir: 'publish',
  external,
  format: 'esm',
  bundle: true,
  sourcemap: true,
  // This is better than Terser
  minify: true,
  write: false,
  define,
}).then((build) => {
  const byExt: { [filepath: string]: esbuild.OutputFile[] } = {};
  for (const outFile of build.outputFiles) {
    const x = path.extname(outFile.path);
    (byExt[x] || (byExt[x] = [])).push(outFile);
  }
  // Fix path since esbuild does it wrong based off the Chrome debugger...
  for (const { text, path: filepath } of byExt['.map']!) {
    fs.writeFileSync(filepath, text.replace(/"[./]+src/g, '"./src'));
  }
  for (const { contents, path: filepath } of byExt['.js']!) {
    const name = relName(filepath);
    const min = noComment(contents);
    const mingz = gzip(min);
    let delta = '';
    if (prevJSSizes[name]) {
      const num = mingz.length - prevJSSizes[name]!;
      delta = `Δ:${num > 0 ? `+${num}` : num}`;
    }
    fs.writeFileSync(filepath, contents);
    console.log(
      `${pad(name, 16)} min:${pad(min.length, 5)} min+gzip:${pad(mingz.length, 4)} ${delta}`
    );
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
  external,
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  minify: true,
  define,
}).catch((err) => {
  console.error('CJS', err);
  process.exit(1);
});

// Other files for publishing
fs.copyFileSync('./license', './publish/license');
fs.copyFileSync('./src/jsx.d.ts', './publish/jsx.d.ts');

fs.writeFileSync('./publish/readme.md',
  fs.readFileSync('./readme.md', 'utf-8')
    .replace(
      /.\/src\/(\w+)\/readme.md/g,
      'https://github.com/heyheyhello/haptic/tree/main/src/$1/')
);

// Need to tweak package.json on write
fs.writeFileSync('./publish/package.json',
  fs.readFileSync('./package.json', 'utf-8')
    .replaceAll('./publish/', './')
    .replace(/,?\s*"scripts": {.*?}/ms, '')
    .replace(/,?\s*"devDependencies": {.*?}/ms, '')
);
