// Signal

// This implements the Observer Pattern architecture where subjects maintain a
// list of update methods of their observers. This code is forked from Sinuous
// which describe subjects as "Observables" despite the term already being used
// in the JS ecosystem to refer to stream-focused architectures. To avoid
// confusion this uses "Signal" instead, which comes from the Solid framework.

// This API exports two types of signals. Signal<T> is read-write and updates
// only when written directly. ComputedSignal<T> is read-only and updates
// automatically when any of its defining Signals or ComputedSignals change.

// An update method exists for each ComputedSignal. It holds a list of Signals
// it depends on, and a list of any nested update methods from ComputedSignals.

/* eslint-disable @typescript-eslint/no-explicit-any */

type X = any
type Fn = () => unknown

type Base<T> = {
  (): T
  $o: 1
}

type Signal<T> = Base<T> & {
  (nextValue: T): T
  observers: Set<Update<X>>
  observersRan: Set<Update<X>> | undefined
  pending: T | []
}

type ComputedSignal<T> = Base<T> & {
  update: Update<T>
}

type Update<T> = {
  (): T
  stale: boolean
  signals: Signal<X>[]
  children: Update<X>[]
}

const EMPTY_ARR: [] = [];

let runningUpdateFn: Update<X> | undefined;
let transactionQueue: Signal<X>[] | undefined;

function createSignal<T>(value: T): Signal<T> {
  const signal: Signal<T> = (...args: T[]) => {
    if (!args.length) {
      if (runningUpdateFn && !signal.observers.has(runningUpdateFn)) {
        signal.observers.add(runningUpdateFn);
        runningUpdateFn.signals.push(signal);
      }
      return value;
    }

    const [nextValue] = args;

    if (transactionQueue) {
      if (signal.pending === EMPTY_ARR) {
        transactionQueue.push(signal);
      }
      signal.pending = nextValue;
      return nextValue;
    }

    value = nextValue;

    // Temporarily clear `runningUpdateFn` otherwise a update triggered by a
    // set in another update is marked as a listener
    const prevUpdateFn = runningUpdateFn;
    runningUpdateFn = undefined;

    // Update can alter signal.observers so make a copy before running
    signal.observersRan = new Set(signal.observers);
    signal.observersRan.forEach(c => { c.stale = true; });
    signal.observersRan.forEach(c => { if (c.stale) c(); });

    runningUpdateFn = prevUpdateFn;
    return value;
  };
  // Used in h/nodeProperty.ts
  signal.$o = 1 as const;
  signal.observers = new Set<Update<X>>();
  signal.observersRan = undefined;
  // The 'not set' value must be unique so `nullish` can be set in a transaction
  signal.pending = EMPTY_ARR;

  return signal;
}

function createComputedSignal<F extends Fn, T = ReturnType<F>>(fn: F): ComputedSignal<T> {
  let value: T;
  const update: Update<T> = () => {
    const prevUpdateFn = runningUpdateFn;
    if (runningUpdateFn) {
      runningUpdateFn.children.push(update);
    }
    const prevChildren = update.children;

    removeConnections(update);
    update.stale = false;
    runningUpdateFn = update;
    value = fn() as T;

    // If any children updates were removed mark them as fresh (not stale)
    // Check the diff of the children list between pre and post update
    prevChildren.forEach(c => {
      if (update.children.indexOf(c) === -1) {
        c.stale = false;
      }
    });

    // TODO: Remove this with a while/stack
    const getChildrenDeep = (children: Update<X>[]): Update<X>[] =>
      children.reduce(
        (acc, curr) => acc.concat(curr, getChildrenDeep(curr.children)),
        [] as Update<X>[]
      );
    // If any listeners were marked as fresh remove their signals from the run lists
    const allChildren = getChildrenDeep(update.children);
    allChildren.forEach(child => {
      if (!child.stale) {
        child.signals.forEach(signal => {
          signal.observersRan && signal.observersRan.delete(child);
        });
      }
    });
    runningUpdateFn = prevUpdateFn;
    return value;
  };
  update.stale = true;
  update.signals = [];
  update.children = [];

  const computedSignal: ComputedSignal<T> = () => {
    if (!update.stale) {
      update.signals.forEach(signal => { signal(); });
    } else {
      value = update();
    }
    return value;
  };
  // Used in h/nodeProperty.ts
  computedSignal.$o = 1 as const;
  computedSignal.update = update;
  (fn as F & { update: Update<X> }).update = update;

  // eslint-disable-next-line eqeqeq
  // if (runningUpdate == null) {
  //   console.warn('Update has no parent so it will never be disposed');
  // }

  resetUpdate(update);
  update();

  return computedSignal;
}

function subscribe<F extends Fn>(fn: F) {
  createComputedSignal(fn);
  return () => unsubscribe(fn as F & { update: Update<X> });
}

function unsubscribe<F extends Fn & { update: Update<X> }>(fn: F) {
  return removeConnections(fn.update);
}

function removeConnections(update: Update<X>) {
  update.children.forEach(removeConnections);

  update.signals.forEach(signal => {
    signal.observers.delete(update);
    signal.observersRan && signal.observersRan.delete(update);
  });

  resetUpdate(update);
}

function resetUpdate(update: Update<X>) {
  // Keep track of which signals trigger updates. Needed for unsubscribe.
  update.signals = [];
  update.children = [];
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
  const prevUpdateFn = runningUpdateFn;
  runningUpdateFn = undefined;
  const value = fn();
  runningUpdateFn = prevUpdateFn;
  return value;
}

function on(signals: Signal<X>[], fn: Fn, options = { onlyChanges: true }) {
  signals = ([] as Signal<X>[]).concat(signals);
  return createComputedSignal(() => {
    signals.forEach(signal => { signal(); });
    let value;
    if (!options.onlyChanges) value = sample(fn);
    options.onlyChanges = false;
    return value;
  });
}

// Types
export { Signal, ComputedSignal, Update };

export {
  createSignal as s,
  createSignal as signal,
  createComputedSignal as computed,
  subscribe,
  unsubscribe,
  transaction,
  sample,
  on
};
