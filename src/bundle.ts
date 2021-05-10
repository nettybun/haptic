// For testing bundle size with `npm run bundlesize`
export * from './';
export { signal, core } from './wire';

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
