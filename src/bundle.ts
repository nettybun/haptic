// For testing bundle size with `npm run bundlesize`. This assumes they're using
// the default `api` and won't use `svg()`.
export { h } from './index.js';
export { signal, wire } from './state/index.js';

/*
> esbuild
  --bundle src/bundle.ts
  --format=esm
  --minify
  --define:S_RUNNING=4
  --define:S_SKIP_RUN_QUEUE=2
  --define:S_NEEDS_RUN=1 | gzip -9 | wc -c
*/
