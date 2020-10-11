// Signal

// This implements the Observer Pattern architecture where subjects maintain a
// list of update methods of their observers. This code is forked from Sinuous
// which describe subjects as "Observables" despite the term already being used
// in the JS ecosystem to refer to stream-focused architectures. To avoid
// confusion this uses "Signal" instead, which comes from the Solid framework

// This API exports two types of signals. WritableSignal<T> is read-write and
// updates only when written to directly. Meanwhile a ComputedSignal<T> is
// read-only and updates automatically when any of its defining signals change

// An update method is made for each ComputedSignal which is responsible for
// pulling from the WritableSignals it depends on and calling any nested update
// methods (children ComputedSignals)

/* eslint-disable @typescript-eslint/no-explicit-any */

type X = any
type Fn = () => unknown
type FnUpdated<F> = F & { update: Update<X> }

type Base<T> = {
  (): T
  $o: 1
}

type WritableSignal<T> = Base<T> & {
  (nextValue: T): T
  obs: Set<Update<X>>
  obsLive: Set<Update<X>> | undefined
  pending: T | []
}

type ComputedSignal<T> = Base<T> & {
  update: Update<T>
}

type Signal<T> = WritableSignal<T> | ComputedSignal<T>

type Update<T> = {
  (): T
  stale: boolean
  signals: WritableSignal<X>[]
  children: Update<X>[]
}

const EMPTY_ARR: [] = [];

let runningUpdateFn: Update<X> | undefined;
let transactionQueue: WritableSignal<X>[] | undefined;

function createWritableSignal<T>(value: T) {
  const signal: WritableSignal<T> = (...args: T[]) => {
    if (!args.length) {
      if (runningUpdateFn && !signal.obs.has(runningUpdateFn)) {
        signal.obs.add(runningUpdateFn);
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
    signal.obsLive = new Set(signal.obs);
    signal.obsLive.forEach(c => { c.stale = true; });
    signal.obsLive.forEach(c => { if (c.stale) c(); });

    runningUpdateFn = prevUpdateFn;
    return value;
  };
  // Used in h/nodeProperty.ts
  signal.$o = 1 as const;
  signal.obs = new Set<Update<X>>();
  signal.obsLive = undefined;
  // The 'not set' value must be unique so `nullish` can be set in a transaction
  signal.pending = EMPTY_ARR;

  return signal;
}

function createComputedSignal<F extends Fn, T = ReturnType<F>>(fn: F) {
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
          signal.obsLive && signal.obsLive.delete(child);
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
  (fn as FnUpdated<F>).update = update;

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
  return () => unsubscribe(fn as FnUpdated<F>);
}

function unsubscribe<F extends Fn>(fn: F) {
  return removeConnections((fn as FnUpdated<F>).update);
}

function removeConnections(update: Update<X>) {
  update.children.forEach(removeConnections);

  update.signals.forEach(signal => {
    signal.obs.delete(update);
    signal.obsLive && signal.obsLive.delete(update);
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
export { Signal, WritableSignal, ComputedSignal, Update };

export {
  createWritableSignal as s,
  createWritableSignal as signal,
  createComputedSignal as computed,
  subscribe,
  unsubscribe,
  transaction,
  sample,
  on
};
