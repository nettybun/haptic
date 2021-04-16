// Haptic Wire

/* eslint-disable prefer-const,no-multi-spaces,@typescript-eslint/no-non-null-assertion */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

// TODO: Do a size compare for "delete X.n" vs "X.n=0" and typing with "T|0"

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
  /** If part of a computed signal, this is its signal */
  csWS?: WireSignal<T>;
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
  /** Subscribed reactors */
  wR: Set<WireReactor<X>>;
  /** Pending value set during a transaction() */
  next?: T;
  /** If this is a computed-signal, this is its reactor */
  csWR?: WireReactor<T>;
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
  // TODO: Write a test for `runs` to check unexpected runs
  if (wR.runs) {
    wR.inner.forEach(reactorUnsubscribe);
    wR.rS.forEach((signal) => signal.wR.delete(wR));
    // TODO: wR.passedSubs.forEach s => s.wR.delete(wR)
  }
  wR.rS = new Set();
  wR.rP = new Set();
  wR.inner = new Set();
};

const reactorPause = (wR: WireReactor<X>) => {
  wR.state = STATE_PAUSED;
  wR.inner.forEach(reactorPause);
};

const wireSignals = <T>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends WireReactor<infer R> ? R : T[K]>;
} => {
  // TODO: Size test inside or outside the loop
  let reactorForToken: WireReactor<X> | undefined;
  Object.keys(obj).forEach((k) => {
    let saved: unknown;
    const id = `wS#${signalId++}(${k})`;
    const wS = { [id](...args: (SubToken | unknown)[]) {
      // Case: Read-Pass
      if (!args.length) {
        if (activeReactor) {
          // Skip the error if the reactor is for a computed signal...
          // TODO: Wait. No. Because then inconsistent rS rP? s,s,p is valid :(
          // Need a separate list... (see next TODO)
          if (activeReactor.rS.has(wS) && !activeReactor.csWS) {
            throw new Error(`Mixed rS/rP ${wS.name}`);
          }
          activeReactor.rP.add(wS);
        }
      }
      // Case: Read-Sub; could be any reactor not necessarily `activeReactor`
      // eslint-disable-next-line no-cond-assign
      else if (reactorForToken = reactorTokenMap.get(args[0] as SubToken)) {
        if (reactorForToken.rP.has(wS)) {
          throw new Error(`Mixed rP/rS ${wS.name}`);
        }
        reactorForToken.rS.add(wS);
        wS.wR.add(reactorForToken);
        // Subscribing to a computed-signal also links cR's signals (skip rP/rS)
        if (wS.csWR) {
          wS.csWR.rS.forEach((s) => {
            // TODO: Don't link to rS. That's weird. This is for unsubscribing
            // only. Need a separate list... Like wR.passedSubs.add(s);
            reactorForToken!.rS.add(s);
            s.wR.add(reactorForToken!);
          });
        }
      }
      // Case: Write during a transaction; defer saving the value
      // TODO: Size? Could use `else if (write = false, transactionSignals)`
      else if (transactionSignals) {
        transactionSignals.add(wS);
        wS.next = args[0] as T[keyof T];
        return;
      }
      // Case: Write
      else {
        // If overwriting a computed-signal, unsubscribe the reactor
        if (wS.csWR) {
          console.log('Clearing cR/cS for', wS);
          reactorUnsubscribe(wS.csWR);
          delete wS.csWR.csWS; // Part of unsubscribing/cleaning the reactor
          delete wS.csWR;
        }
        saved = args[0] as T[keyof T];
        // If writing a reactor, register as a computed-signal
        if (saved && (saved as { $wR?: 1 }).$wR) {
          console.log('Registering cR/cS', wS);
          // TODO: Possibly smaller size via hack (wS.csWR = saved).csWS = wS
          wS.csWR = saved as WireReactor;
          wS.csWR.csWS = wS;
          wS.csWR.state = STATE_STALE;
        }
        // Notify. Copy wS.wR since the Set() can grow while running and loop
        // infinitely. Depth ordering needs an array while Sinuous uses a Set()
        const toRun = [...wS.wR].sort((a, b) => a.depth - b.depth);
        // Mark upstream computeds as stale. Must be in an isolated for-loop
        toRun.forEach((wR) => {
          if (wR.state === STATE_PAUSED || wR.csWS) wR.state = STATE_STALE;
        });
        // Calls are ordered parent->child. Skip computed-signals; they're lazy
        toRun.forEach((wR) => {
          if (wR.state === STATE_ON && !wR.csWS) wR();
        });
        return;
      }
      if (wS.csWR && wS.csWR.state === STATE_STALE) {
        console.log('Running cR', wS);
        saved = wS.csWR();
      }
      return saved;
    } }[id] as WireSignal;
    wS.$wS = 1;
    wS.wR = new Set<WireReactor<X>>();
    // Call wS to run the "Case: Write" which de|initializes computed signals
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
