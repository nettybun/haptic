// Haptic Wire

/* eslint-disable no-multi-spaces,@typescript-eslint/no-non-null-assertion */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

type WireReactor<T = unknown> = {
  /** Start/Run */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals that were read-subscribed by the reactor last run */
  sRS: Set<WireSignal<X>>;
  /** Signals that were read-passed by the reactor last run */
  sRP: Set<WireSignal<X>>;
  /** Signals passed over from read-subscribed computed-signals */
  sCS: Set<WireSignal<X>>;
  /** Other reactors created during this (parent) run */
  inner: Set<WireReactor<X>>;
  /** How many parents this reactor has; see wR.inner */
  depth: number;
  /** Run count */
  runs: number;
  /** FSM state: ON|OFF|RUNNING|PAUSED|STALE */
  state: WireReactorStates;
  /** If part of a computed signal, this is its signal */
  cS?: WireSignal<T>;
  /** To check "if x is a reactor" */
  $wR: 1;
};

type WireSignal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying reactors */ // Ordered before ($):T for TS to work
  (value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Reactors that are subscribed to this signal */
  rS: Set<WireReactor<X>>;
  /** Next value; set during a transaction() */
  nV?: T;
  /** If this is a computed-signal, this is its reactor */
  cR?: WireReactor<T>;
  /** To check "if x is a signal" */
  $wS: 1;
};

type WireReactorStates =
  | typeof STATE_OFF
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_STALE;

type UnpackArraySignals<T> = { [P in keyof T]: T[P] extends WireSignal<infer U> ? U : never };
type SubToken = <T, X extends Array<() => T>>(...args: X) => UnpackArraySignals<X>;

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
declare const STATE_OFF     = 0;
declare const STATE_ON      = 1;
declare const STATE_RUNNING = 2;
declare const STATE_PAUSED  = 3;
// Reactor runs are skipped if they're paused or they're for a computed signal
declare const STATE_STALE   = 4;

// In wireSignal and wireReactor `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

const wireReactor = <T>(fn: ($: SubToken) => T): WireReactor<T> => {
  const id = `wR:${reactorId++}{${fn.name}}`;
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
    wR.state = wR.sRS.size
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
  const unlinkFromSignal = (signal: WireSignal<X>) => signal.rS.delete(wR);
  // Skip newly created reactors since inner/rS/rP aren't yet defined
  // TODO: Write a test for `runs` to check unexpected runs
  if (wR.runs) {
    wR.inner.forEach(reactorUnsubscribe);
    wR.sRS.forEach(unlinkFromSignal);
    wR.sCS.forEach(unlinkFromSignal);
  }
  wR.state = STATE_OFF;
  wR.inner = new Set();
  // Drop all signals now that they have been unlinked
  wR.sRS = new Set();
  wR.sRP = new Set();
  wR.sCS = new Set();
};

const reactorPause = (wR: WireReactor<X>) => {
  wR.state = STATE_PAUSED;
  wR.inner.forEach(reactorPause);
};

const wireSignals = <T>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends WireReactor<infer R> ? R : T[K]>;
} => {
  Object.keys(obj).forEach((k) => {
    let saved: unknown;
    let read: WireReactor<X> | boolean | undefined; // Multi-use temp variable
    const id = `wS:${signalId++}{${k}}`;
    const wS = { [id](...args: (SubToken | unknown)[]) {
      // Case: Read-Subscribe
      // eslint-disable-next-line no-cond-assign
      if (read = !args.length) {
        if (activeReactor) {
          if (activeReactor.sRS.has(wS)) {
            throw new Error(`Mixed sRS/sRP ${wS.name}`);
          }
          activeReactor.sRP.add(wS);
        }
      }
      // Case: Read-Pass; could be any reactor not necessarily `activeReactor`
      // eslint-disable-next-line no-cond-assign
      else if (read = reactorTokenMap.get(args[0] as SubToken)) {
        type R = WireReactor<X>;
        if ((read as R).sRP.has(wS)) {
          throw new Error(`Mixed sRP/sRS ${wS.name}`);
        }
        (read as R).sRS.add(wS);
        wS.rS.add((read as R));
        // Subscribing to a computed-signal also links cR's subscribed signals
        wS.cR && wS.cR.sRS.forEach((s) => {
          // Link to sXS not sRS. This way the "Mixed A/B" errors keep working
          (read as R).sCS.add(s);
          s.rS.add((read as R));
        });
      }
      // Case: Write during a transaction; defer saving the value
      else if (transactionSignals) {
        transactionSignals.add(wS);
        wS.nV = args[0] as T[keyof T];
      }
      // Case: Write
      else {
        // If overwriting a computed-signal, unsubscribe the reactor
        if (wS.cR) {
          reactorUnsubscribe(wS.cR);
          delete wS.cR.cS; // Part of unsubscribing/cleaning the reactor
          delete wS.cR;
        }
        saved = args[0] as T[keyof T];
        // If writing a reactor, register as a computed-signal
        if (saved && (saved as { $wR?: 1 }).$wR) {
          (saved as WireReactor).cS = wS;
          (saved as WireReactor).state = STATE_STALE;
          wS.cR = saved as WireReactor;
        }
        // Notify. Copy wS.wR since the Set() can grow while running and loop
        // infinitely. Depth ordering needs an array while Sinuous uses a Set()
        const toRun = [...wS.rS].sort((a, b) => a.depth - b.depth);
        // Mark upstream computeds as stale. Must be in an isolated for-loop
        toRun.forEach((wR) => {
          if (wR.state === STATE_PAUSED || wR.cS) wR.state = STATE_STALE;
        });
        // Calls are ordered parent->child. Skip computed-signals; they're lazy
        toRun.forEach((wR) => {
          if (wR.state === STATE_ON && !wR.cS) wR();
        });
      }
      if (read) {
        if (wS.cR && wS.cR.state === STATE_STALE) saved = wS.cR();
        return saved;
      }
    } }[id] as WireSignal;
    wS.$wS = 1;
    wS.rS = new Set<WireReactor<X>>();
    // Call wS which runs the "Case: Write" to de|initialize computed-signals
    wS(obj[k as keyof T]);
    // @ts-ignore Mutation of T
    obj[k] = wS;
  });
  // @ts-ignore Mutation of T
  return obj;
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
    wS(wS.nV);
    delete wS.nV;
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
