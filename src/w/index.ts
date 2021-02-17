// Haptic Wire

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;
type O = { [k: string]: unknown };

// Reactors don't use their function's return value, but it's useful to monkey
// patch them after creation. Haptic does this for h()
type WireReactor<T = void> = {
  (): T;
  fn: ($: SubToken) => unknown;
  /** Signal sub-reads from last run */
  signalSR: Set<WireSignal<X>>;
  /** Signal pass-reads from last run */
  signalPR: Set<WireSignal<X>>;
  inner: Set<WireReactor>;
  runs: number;
  depth: number;
  state: WireReactorStates;
};

type WireReactorStates =
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_PAUSED_STALE
  | typeof STATE_OFF;

type UnpackArrayWireSignalTypes<T> = { [P in keyof T]: T[P] extends WireSignal<infer U> ? U : never };
type SubToken = <T, X extends Array<() => T>>(...args: X) => UnpackArrayWireSignalTypes<X>;

type WireSignal<T> = {
  (): T;
  ($: SubToken): T;
  (value: T): void;
  /** Reactors subscribed to this signal */
  reactors: Set<WireReactor>;
  /** Uncommitted value set during a transaction() block */
  next?: T;
};

let signalId = 0;
let reactorId = 0;

// Currently running reactor
let activeReactor: WireReactor | undefined;
// WireSignals written to during a transaction(() => {...})
let transactionSignals: Set<WireSignal<X>> | undefined;

// Registry is a Set, not WeakSet, because it should be iterable
const reactorRegistry = new Set<WireReactor>();
const reactorTokenMap = new WeakMap<SubToken, WireReactor>();

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
const STATE_OFF          = 0;
const STATE_ON           = 1;
const STATE_RUNNING      = 2;
const STATE_PAUSED       = 3;
const STATE_PAUSED_STALE = 4;

// In wireSignal and wireReactor `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

const wireReactor = (fn: ($: SubToken) => unknown): WireReactor => {
  const id = `wR#${reactorId++}(${fn.name})`;
  // @ts-ignore sr,pr,inner,state are setup by reactorUnsubscribe() below
  const wR: WireReactor = { [id]() {
    if (wR.state === STATE_RUNNING) {
      throw new Error(`Loop ${wR.name}`);
    }
    // If STATE_PAUSED then STATE_PAUSED_STALE was never reached; nothing has
    // changed. Restore state (below) and call inner reactors so they can check
    if (wR.state === STATE_PAUSED) {
      wR.inner.forEach(reactor => reactor());
    } else {
      // Symmetrically remove all connections from wS/wR. Called "automatic
      // memory management" in Sinuous/S.js
      reactorUnsubscribe(wR);
      wR.state = STATE_RUNNING;
      // @ts-ignore It's not happy with this but the typing is correct
      const $: SubToken = ((...wS) => wS.map(signal => signal($)));
      // Token is set but never deleted since it's a WeakMap
      reactorTokenMap.set($, wR);
      adopt(wR, () => wR.fn($));
      wR.runs++;
    }
    wR.state = wR.signalSR.size
      ? STATE_ON
      : STATE_OFF;
  } }[id];
  wR.fn = fn;
  wR.runs = 0;
  wR.depth = activeReactor ? activeReactor.depth + 1 : 0;
  reactorRegistry.add(wR);
  if (activeReactor) activeReactor.inner.add(wR);
  reactorUnsubscribe(wR);
  return wR;
};

const reactorUnsubscribe = (wR: WireReactor): void => {
  wR.state = STATE_OFF;
  // Skip newly created reactors since inner/sr aren't yet defined
  if (wR.runs) {
    wR.inner.forEach(reactorUnsubscribe);
    wR.signalSR.forEach(sT => sT.reactors.delete(wR));
  }
  wR.signalSR = new Set();
  wR.signalPR = new Set();
  wR.inner = new Set();
};

const reactorPause = (wR: WireReactor) => {
  wR.state = STATE_PAUSED;
  wR.inner.forEach(reactorPause);
};

const wireSignals = <T extends O>(obj: T): { [K in keyof T]: WireSignal<T[K]>; } => {
  type V = T[keyof T];
  Object.keys(obj).forEach(k => {
    let saved = obj[k];
    // Batch the identifier since key k will be unique
    const id = `wS#${signalId}(${k})`;
    const wS = { [id](...args: (V | SubToken)[]) {
      // Case: Pass-Read
      if (!args.length) {
        if (activeReactor) {
          if (activeReactor.signalSR.has(wS)) {
            throw new Error(`Mixed sr/pr ${wS.name}`);
          }
          activeReactor.signalPR.add(wS);
        }
        return saved;
      }
      // Case: Sub-Read; could be any reactor not necessarily `reactorActive`
      let reactorForToken: WireReactor | undefined;
      // eslint-disable-next-line no-cond-assign
      if (reactorForToken = reactorTokenMap.get(args[0] as SubToken)) {
        if (reactorForToken.signalPR.has(wS)) {
          throw new Error(`Mixed pr/sr ${wS.name}`);
        }
        reactorForToken.signalSR.add(wS);
        wS.reactors.add(reactorForToken);
        return saved;
      }
      // Case: Transaction (is V)
      if (transactionSignals) {
        transactionSignals.add(wS);
        wS.next = args[0] as V;
        // Don't write/save. Defer until the transaction commit
        return;
      }
      // Case: Write (is V)
      saved = args[0] as V;
      // Create a copy of wS's reactors since the Set can be added to during the
      // call leading to an infinite loop. Also I need to order by depth which
      // needs an array, but in Sinuous they can use a Set()
      const toRun = [...wS.reactors].sort((a, b) => a.depth - b.depth);
      // Ordered by parent->child
      toRun.forEach(wR => {
        if (wR.state === STATE_PAUSED) wR.state = STATE_PAUSED_STALE;
        else if (wR.state === STATE_ON) wR();
      });
      // Don't return the value on write, unlike Sinuous/S.js
    } }[id] as WireSignal<V>;
    wS.reactors = new Set<WireReactor>();
    // @ts-ignore
    obj[k] = wS;
  });
  signalId++;
  return obj as { [K in keyof T]: WireSignal<T[K]>; };
};

const transaction = <T>(fn: () => T): T => {
  const prev = transactionSignals;
  transactionSignals = new Set();
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  const signals = transactionSignals;
  transactionSignals = prev;
  if (error) throw error;
  signals.forEach(wS => {
    wS(wS.next);
    delete wS.next;
  });
  return ret as T;
};

const adopt = <T>(parentReactor: WireReactor, fn: () => T): T => {
  const prev = activeReactor;
  activeReactor = parentReactor;
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  activeReactor = prev;
  if (error) throw error;
  return ret as T;
};

export {
  wireSignals,
  wireSignals as wS,
  wireReactor,
  wireReactor as wR,
  reactorRegistry,
  reactorUnsubscribe,
  reactorPause,
  transaction,
  adopt
};
export type { WireSignal, WireReactor, WireReactorStates, SubToken };
