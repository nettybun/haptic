// Haptic Wire

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;
type O = { [k: string]: unknown };

// Reactors don't use their function's return value, but it's useful to monkey
// patch them after creation. Haptic does this for h()
type WireReactor<T = unknown> = {
  /** Start/Run */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Read-Sub signals from last run */
  rS: Set<WireSignal<X>>;
  /** Read-Pass signals from last run */
  rP: Set<WireSignal<X>>;
  /** Other reactors created during this (parent) run */
  inner: Set<WireReactor<X>>;
  /** How many parents this reactor has; see wR.inner */
  depth: number;
  /** Run count */
  runs: number;
  /** FSM state: ON|OFF|RUNNING|PAUSED|STALE */
  state: WireReactorStates;
  /** The computed signal, only exists if part of one */
  cS?: WireSignal<T>;
  /** To check "if x is a reactor" */
  $wR: 1;
};

type WireSignal<T = unknown> = {
  /** Read value */
  (): T;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Write value; notifying reactors  */
  (value: T): T;
  /** Subscribed reactors */
  wR: Set<WireReactor<X>>;
  /** Pending value set during a transaction() */
  next?: T;
  /** To check "if x is a signal" */
  $wS: 1;
};

type WireReactorStates =
  | typeof STATE_OFF
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_STALE;

type UnpackArraySignalTypes<T> = { [P in keyof T]: T[P] extends WireSignal<infer U> ? U : never };
type SubToken = <T, X extends Array<() => T>>(...args: X) => UnpackArraySignalTypes<X>;

let signalId = 0;
let reactorId = 0;

// Currently running reactor
let activeReactor: WireReactor<X> | undefined;
// WireSignals written to during a transaction(() => {...})
let transactionSignals: Set<WireSignal<X>> | undefined;

// Lookup $ to find which reactor it refers to
const reactorTokenMap = new WeakMap<SubToken, WireReactor<X>>();

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
const STATE_OFF     = 0;
const STATE_ON      = 1;
const STATE_RUNNING = 2;
const STATE_PAUSED  = 3;
// Reactor runs are skipped if they're paused or they're for a computed signal
const STATE_STALE   = 4;

// In wireSignal and wireReactor `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

const wireReactor = <T>(fn: ($: SubToken) => T): WireReactor<T> => {
  const id = `wR#${reactorId++}(${fn.name})`;
  let saved: T;
  // @ts-ignore rS,rP,inner,state are setup by reactorUnsubscribe() below
  const wR: WireReactor<T> = { [id]() {
    if (wR.state === STATE_RUNNING) {
      throw new Error(`Loop ${wR.name}`);
    }
    // If STATE_PAUSED then STATE_PAUSED_STALE was never reached; nothing has
    // changed. Restore state (below) and call inner reactors so they can check
    if (wR.state === STATE_PAUSED) {
      wR.inner.forEach((reactor) => { reactor(); });
    } else {
      // Symmetrically remove all connections from wS/wR. Called "automatic
      // memory management" in Sinuous/S.js
      reactorUnsubscribe(wR);
      wR.state = STATE_RUNNING;
      // @ts-ignore It's not happy with this but the typing is correct
      const $: SubToken = ((...wS) => wS.map((signal) => signal($)));
      // Token is set but never deleted since it's a WeakMap
      reactorTokenMap.set($, wR);
      saved = adopt(wR, () => wR.fn($));
      wR.runs++;
    }
    wR.state = wR.rS.size
      ? STATE_ON
      : STATE_OFF;
    return saved;
  } }[id];
  wR.$wR = 1;
  wR.fn = fn;
  wR.runs = 0;
  wR.depth = activeReactor ? activeReactor.depth + 1 : 0;
  if (activeReactor) activeReactor.inner.add(wR);
  reactorUnsubscribe(wR);
  return wR;
};

const reactorUnsubscribe = (wR: WireReactor<X>): void => {
  wR.state = STATE_OFF;
  // Skip newly created reactors since inner/rS/rP aren't yet defined
  if (wR.runs) {
    wR.inner.forEach(reactorUnsubscribe);
    wR.rS.forEach((signal) => signal.wR.delete(wR));
  }
  wR.rS = new Set();
  wR.rP = new Set();
  wR.inner = new Set();
};

const reactorPause = (wR: WireReactor<X>) => {
  wR.state = STATE_PAUSED;
  wR.inner.forEach(reactorPause);
};

const wireSignals = <T extends O>(obj: T): { [K in keyof T]: WireSignal<T[K]>; } => {
  type V = T[keyof T];
  Object.keys(obj).forEach((k) => {
    let saved: V;
    let savedForComputed: V | undefined;
    let reactorForToken: WireReactor<X> | undefined;
    const id = `wS#${signalId++}(${k})`;
    const wS = { [id](...args: (V | SubToken)[]) {
      // Case: Read-Pass
      if (!args.length) {
        if (activeReactor) {
          if (activeReactor.rS.has(wS)) {
            throw new Error(`Mixed rS/rP ${wS.name}`);
          }
          activeReactor.rP.add(wS);
        }
      }
      // Case: Read-Sub; could be any reactor not necessarily `reactorActive`
      // eslint-disable-next-line no-cond-assign
      else if (reactorForToken = reactorTokenMap.get(args[0] as SubToken)) {
        if (reactorForToken.rP.has(wS)) {
          throw new Error(`Mixed rP/rS ${wS.name}`);
        }
        reactorForToken.rS.add(wS);
        wS.wR.add(reactorForToken);
      }
      // Case: Write but during a transaction (arg is V)
      else if (transactionSignals) {
        transactionSignals.add(wS);
        wS.next = args[0] as V;
        // Don't write/save. Defer until the transaction commit
      }
      // Case: Write (arg is V)
      else {
        // Runs when converting Computed-Signal to Signal or when Write-A
        // calls subReactor() and is about to overwrite the current computed
        // reactor. Either way, unsubscribe the previous reactor.
        if (saved && (saved as { $wR?: 1 }).$wR) {
          console.log('Clearing previous computed-signal reactor');
          reactorUnsubscribe(saved as WireReactor<V>);
        }
        saved = args[0] as V;
        if (saved && (saved as { $wR?: 1 }).$wR) {
          (saved as WireReactor<V>).cS = wS;
        }
        // Create a copy of wS's reactors since the Set can be added to during
        // the call leading to an infinite loop. Also I need to order by depth
        // which needs an array, but in Sinuous they can use a Set()
        const toRun = [...wS.wR].sort((a, b) => a.depth - b.depth);
        // Mark upstream computeds as stale. Must be in a different for loop
        toRun.forEach((wR) => {
          if (wR.state === STATE_PAUSED || wR.cS) wR.state = STATE_STALE;
        });
        // Calls are ordered parent->child. Skip calling computed signals
        toRun.forEach((wR) => {
          if (wR.state === STATE_ON && !wR.cS) wR();
        });
      }
      if (saved && (saved as { $wR?: 1 }).$wR) {
        if ((saved as WireReactor<V>).state === STATE_STALE) {
          savedForComputed = (saved as WireReactor<V>)();
        }
        return savedForComputed;
      }
      return saved;
    } }[id] as WireSignal<V>;
    wS.$wS = 1;
    wS.wR = new Set<WireReactor<X>>();
    // Call so "Case: Write" de|initializes computed signals
    wS(obj[k] as V);
    // @ts-ignore Mutate object type in place, sorry not sorry
    obj[k] = wS;
  });
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
  signals.forEach((wS) => {
    wS(wS.next);
    delete wS.next;
  });
  return ret as T;
};

const adopt = <T>(parentReactor: WireReactor<X>, fn: () => T): T => {
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
  reactorUnsubscribe,
  reactorPause,
  transaction,
  adopt
};
export type { WireSignal, WireReactor, WireReactorStates, SubToken };
