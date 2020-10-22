import { signal, computed } from '../s/index.js';

const signalCounts = new Map<string, number>();
const base = typeof window !== 'undefined'
  ? window.origin
  : process.cwd();

// This works but I think using origin is more effective
// Even in Node, since the origin can be the absolute working directory
// const stackTraceV8 = / at (\w+) \(.*(\/.+?\.js.+)\)/;
// const stackTraceSpiderMoney = /(\w+)@.*(\/.+?\.js.+)/;

const stackTraceV8 = new RegExp(` at (\\w+) \\(${base}(.+\\.js.+)\\)`);
const stackTraceSpiderMonkey = new RegExp(`(\\w+)@${base}(.+\\.js.+)`);

const getSourceLocation = () => {
  let error;
  try { throw Error(''); } catch (err) { error = err as Error; }
  if (!error.stack) {
    throw new Error('JS engine did not provide an error stack');
  }
  error = error.stack.split('\n');
  // V8-based browsers do this
  if (error[0] === 'Error') error.shift();
  const [, callerLine] = error;
  const match
    = callerLine.startsWith('    at ')
      ? stackTraceV8.exec(callerLine)
      : stackTraceSpiderMonkey.exec(callerLine);
  if (match) {
    const [, callerFn, callerLocation] = match;
    const loc = `${callerFn}@${callerLocation}`;
    const count = (signalCounts.get(loc) ?? 0) + 1;
    signalCounts.set(loc, count);
    console.log(`Signal declared at ${loc}#${count}`);
  }
};

const createWritableSignal: typeof signal = (...args) => {
  getSourceLocation();
  return signal(...args);
};

const createComputedSignal: typeof computed = (...args) => {
  getSourceLocation();
  return computed(...args);
};

export { getSourceLocation, createWritableSignal, createComputedSignal };
