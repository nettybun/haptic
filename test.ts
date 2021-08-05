import { Worker, isMainThread, workerData } from 'worker_threads';
import { watch } from 'fs';

// Usage: `node test ./test/**` which expands to full relative paths via shell

// Previous test runner ideas:
// - Using `fdir` and `picomatch` to find **/*.test.ts. Over-engineered.
// - Using `fs.readdir(TEST_DIR)` paired with CLI substring filters. Ditto.
// - Using `vm.createScript` and `vm.runInNewContext` since ESM doesn't have a
//   replacement for `delete require.cache[name]` and reload a module. Insanely
//   complicated and experimental for ESM. No bueno.
// - Spawn a Node process and use AbortController: #95f9b198ae19

if (isMainThread) {
  const args = process.argv.slice(2);
  const options: string[] = [];
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--')) options.push(arg);
    else files.push(arg);
  }

  if (files.length === 0) {
    console.log('No test files specified');
    process.exit(1);
  }

  const watchMode = options.includes('--watch');
  // Automatic transform handled by esbuild-node-loader ✨
  const workerUrl = new URL(`data:text/javascript,import('${import.meta.url}');`);
  let worker: Worker | undefined;

  const reload = () => {
    if (worker) {
      void worker.terminate();
    }
    worker = new Worker(workerUrl, { workerData: files });
    worker.on('online', () => {
      console.log('Worker started');
    });
    worker.on('error', (err) => {
      console.log(`Worker error ❌ ${err}`);
    });
    worker.on('exit', (exitCode) => {
      if (exitCode === 0) console.log('Worker exit OK');
      if (watchMode) console.log('Waiting for reload...');
    });
  };

  let debounceTimer: NodeJS.Timeout | undefined;
  if (watchMode) {
    console.log('Watching for changes');
    for (const file of files) {
      watch(file, (eventName) => {
        console.log(`Watch ${file} event ${eventName}`);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          reload();
        }, 500);
      });
    }
    process.stdin.on('data', (chunk) => {
      const text = chunk.toString();
      if (text === 're\n' || text === 'reload\n') {
        console.log('Manual reload');
        reload();
      }
    });
  }
  reload();
} else {
  // Colours in TTY
  process.stdout.isTTY = true;
  process.stderr.isTTY = true;

  const files = workerData as string[];
  console.log(`Testing ${files.join(', ')}`);
  const { hold, report } = await import('zora');
  hold();
  const { createDiffReporter } = await import('zora-reporters');
  // Automatic transform handled by esbuild-node-loader ✨
  await Promise.all(files.map((file) => import(file)));
  await report({ reporter: createDiffReporter() });
}
