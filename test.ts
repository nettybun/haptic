import { watch } from 'fs';
import { fileURLToPath } from 'url';
import type { ChildProcess } from 'child_process';

// Usage: `node test ./test/**` which expands to full relative paths via shell

// Previous test runner ideas:
// - Using `fdir` and `picomatch` to find **/*.test.ts. Over-engineered.
// - Using `fs.readdir(TEST_DIR)` paired with CLI substring filters. Ditto.
// - Using `vm.createScript` and `vm.runInNewContext` since ESM doesn't have a
//   replacement for `delete require.cache[name]` and reload a module. Insanely
//   complicated and experimental for ESM. No bueno. Just full process fork...

// Experimental loader enables this by side-stepping
const __filename = fileURLToPath(import.meta.url);

const args = process.argv.slice(2);
const options: string[] = [];
const files: string[] = [];

for (const arg of args) {
  if (arg.startsWith('--')) options.push(arg);
  else files.push(arg);
}
const isTestExecutorProcess = files[0] === 'run' && files.shift();

if (files.length === 0) {
  console.log('No test files specified');
  process.exit(1);
}

if (isTestExecutorProcess) {
  console.log(`Testing ${files.join(', ')}`);
  const { hold, report } = await import('zora');
  hold();
  const { createDiffReporter } = await import('zora-reporters');
  await Promise.all(
    files.map((file) => {
      // Automatic transform handled by esbuild-node-loader ✨
      return import(file);
    })
  );
  await report({
    reporter: createDiffReporter(),
  });
} else {
  const { spawn } = await import('child_process');
  let ac: AbortController | undefined;
  let child: ChildProcess | undefined;

  const reload = () => {
    if (child) {
      ac!.abort();
    }
    ac = new AbortController();
    child = spawn('node', [
      '--experimental-loader', 'esbuild-node-loader',
      __filename, 'run', ...files,
    ], {
      signal: ac.signal,
      stdio: [ 'ignore', 'inherit', 'inherit' ],
    });
    child.on('spawn', () => {
      console.log(`Runner started. PID ${child!.pid!}`);
    });
    child.on('close', (code) => {
      console.log(`Runner stopped. PID ${child!.pid!}. Exit code: ${code!}`);
      console.log('Waiting to reload...');
    });
  };

  let debounceTimer: NodeJS.Timeout | undefined;
  if (options.includes('--watch')) {
    console.log('Watching for test file changes');
    for (const file of files) {
      watch(file, (eventName) => {
        console.log(`Watch ${file} event ${eventName}`);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          reload();
        }, 500);
      });
    }
  }
  process.stdin.on('data', (chunk) => {
    const text = chunk.toString();
    if (text === 're\n' || text === 'reload\n') {
      console.log('Manual reload');
      reload();
    }
  });
  reload();
}
