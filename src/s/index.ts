// Signal

// This is an implementation of the Observer Pattern for updating data; forked
// from Sinuous. The architecture contains subjects and observers. Sinuous
// describes these as "Observables", despite the term already being used in the
// JS ecosystem to refer to stream-focused generator-like architectures. To
// avoid confusion this uses "Signals", which comes from the Solid framework.

// The API exports two types of signals. WritableSignal is a read-write data
// store that updates only when written directly. Each one maintains a list of
// observers to notify of changes. An observer is a ComputedSignal, which is a
// read-only data stores that updates when any of defining signals change.

/* eslint-disable @typescript-eslint/no-explicit-any */

type X = any
type Fn = () => unknown

type Base<T> = {
  (): T
  $o: 1
}

type WritableSignal<T> = Base<T> & {
  (nextValue: T): T
  cs: Set<ComputedSignal<X>>
  csRun?: Set<ComputedSignal<X>>
  pending: T | []
}

type ComputedSignal<T> = Base<T> & {
  stale: boolean
  ws: WritableSignal<X>[]
  csNested: ComputedSignal<X>[]
}

type Signal<T> = WritableSignal<T> | ComputedSignal<T>

const EMPTY_ARR: [] = [];

let runningComputed: ComputedSignal<X> | undefined;
let transactionQueue: WritableSignal<X>[] | undefined;

function createWritableSignal<T>(value: T) {
  const ws: WritableSignal<T> = (...args: T[]) => {
    if (!args.length) {
      if (runningComputed && !ws.cs.has(runningComputed)) {
        ws.cs.add(runningComputed);
        runningComputed.ws.push(ws);
      }
      return value;
    }
    const [nextValue] = args;

    if (transactionQueue) {
      if (ws.pending === EMPTY_ARR) {
        transactionQueue.push(ws);
      }
      ws.pending = nextValue;
      return nextValue;
    }
    value = nextValue;
    // Temporarily clear `runningComputed` otherwise a update triggered by a
    // set in another update is marked as a listener
    const prevComputed = runningComputed;
    runningComputed = undefined;

    // Update can alter signal.observers so make a copy before running
    ws.csRun = new Set(ws.cs);
    ws.csRun.forEach(c => { c.stale = true; });
    ws.csRun.forEach(c => { if (c.stale) c(); });

    runningComputed = prevComputed;
    return value;
  };
  // Used in h/nodeProperty.ts
  ws.$o = 1 as const;
  ws.cs = new Set();
  // The 'not set' value must be unique so `nullish` can be set in a transaction
  ws.pending = EMPTY_ARR;

  return ws;
}

function createComputedSignal<F extends Fn, T = ReturnType<F>>(updateFn: F) {
  let value: T;
  const cs: ComputedSignal<T> = () => {
    if (!cs.stale) {
      if (runningComputed) {
        // If inside a running computed, pass this computed's signals to it
        cs.ws.forEach(ws => { ws(); });
      }
      return value;
    }

    // Stale, so update the value
    const prevComputed = runningComputed;
    if (prevComputed) {
      prevComputed.csNested.push(cs);
    }
    unsubscribe(cs);
    cs.stale = false;
    runningComputed = cs;
    value = updateFn() as T;
    runningComputed = prevComputed;

    return value;
  };
  // Used in h/nodeProperty.ts
  cs.$o = 1 as const;
  cs.stale = true;
  cs.ws = [];
  cs.csNested = [];
  // Lazy eval would be nice but h() needs this to work correctly
  cs();
  return cs;
}

// In Sinuous `fn` gains a new property, but I don't agree with that...
function subscribe(fn: Fn) {
  const cs = createComputedSignal(fn);
  return () => unsubscribe(cs);
}

function unsubscribe(cs: ComputedSignal<X>) {
  cs.csNested.forEach(unsubscribe);

  cs.ws.forEach(ws => {
    ws.cs.delete(cs);
    ws.csRun && ws.csRun.delete(cs);
  });

  cs.ws = [];
  cs.csNested = [];
}

function capture(fn: (unsubscribe?: () => void) => unknown): void {
  const prevComputed = runningComputed;
  // Twice `as` since type is wrong but sufficient
  const cap = (() => {}) as unknown as ComputedSignal<X>;
  cap.ws = [];
  cap.csNested = [];
  runningComputed = cap;
  fn(() => {
    unsubscribe(cap);
    runningComputed = undefined;
  });
  runningComputed = prevComputed;
}

function transaction<T>(fn: () => T): T {
  const prevQueue = transactionQueue;
  transactionQueue = [];
  const value = fn();
  const signals = transactionQueue;
  transactionQueue = prevQueue;
  signals.forEach(s => {
    if (s.pending !== EMPTY_ARR) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { pending } = s;
      s.pending = EMPTY_ARR;
      s(pending);
    }
  });
  return value;
}

function sample<T>(fn: () => T): T {
  const prevComputed = runningComputed;
  runningComputed = undefined;
  const value = fn();
  runningComputed = prevComputed;
  return value;
}

function on(signals: Signal<X>[], fn: Fn, options = { onlyChanges: false }) {
  return createComputedSignal(() => {
    signals.forEach(signal => { signal(); });
    let value;
    if (options.onlyChanges) value = sample(fn);
    options.onlyChanges = false;
    return value;
  });
}

// Types
export { Signal, WritableSignal, ComputedSignal };

export {
  createWritableSignal as s,
  createWritableSignal as signal,
  createComputedSignal as c,
  createComputedSignal as computed,
  capture,
  subscribe,
  unsubscribe,
  transaction,
  sample,
  on
};
