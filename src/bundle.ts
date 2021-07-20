// For testing bundle size with `npm run bundlesize`. This assumes they're using
// the default `api` and won't use `svg()`.
export { h } from './index.js';
export { signal, core } from './wire/index.js';

/*
> esbuild
  --bundle src/bundle.ts
  --format=esm
  --minify
  --define:STATE_RESET=0
  --define:STATE_RUNNING=1
  --define:STATE_WIRED_WAITING=2
  --define:STATE_WIRED_PAUSED=3
  --define:STATE_WIRED_STALE=4 | gzip -9 | wc -c
*/
