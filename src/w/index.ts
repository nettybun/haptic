// Haptic Wire

type WireReactor<T = unknown> = {
  /** Start+Run */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals that were read-subscribed last run */
  sS: Set<WireSignal<X>>;
  /** Signals that were read-passed last run */
  sP: Set<WireSignal<X>>;
  /** Signals that were given by computed-signals last run */
  sC: Set<WireSignal<X>>;
  /** Other reactors created during this (parent) run */
  inner: Set<WireReactor<X>>;
  /** FSM state: OFF|ON|RUNNING|PAUSED|STALE */
  state: WireReactorState;
  /** Number of parent reactors (see wR.inner); to sort reactors runs */
  sort: number;
  /** Run count */
  runs: number;
  /** If part of a computed signal, this is its signal */
  cS?: WireSignal<T>;
  /** To check "if x is a reactor" */
  $wR: 1;
};

type WireSignal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying reactors */ // Ordered before ($):T for TS to work
  (valueTestFn: Comparator<T>, value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Reactors subscribed to this signal */
  rS: Set<WireReactor<X>>;
  /** Transaction value; set and deleted on commit */
  tV?: T;
  /** If this is a computed-signal, this is its reactor */
  cR?: WireReactor<T>;
  /** To check "if x is a signal" */
  $wS: 1;
};

type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends WireSignal<infer R> ? R : never
  };
  /** Reactor to subscribe to */
  wR: WireReactor<X>;
  /** To check "if x is a subcription token" */
  $$: 1;
};

type Comparator<T = unknown> = (prev: T, next: T) => boolean;

type WireReactorState =
  | typeof STATE_OFF
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_STALE;

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

let signalId = 0;
let reactorId = 0;

// Currently running reactor
let activeReactor: WireReactor<X> | undefined;
// WireSignals written to during a transaction(() => {...})
let transactionSignals: Set<WireSignal<X>> | undefined;

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
      saved = adopt(wR, () => wR.fn($));
      wR.runs++;
    }
    wR.state = wR.sS.size
      ? STATE_ON
      : STATE_OFF;
    return saved;
  } }[id];
  wR.$wR = 1;
  wR.fn = fn;
  wR.runs = 0;
  wR.sort = activeReactor ? activeReactor.sort + 1 : 0;
  // @ts-ignore It's not happy with this but the typing is correct
  const $: SubToken = ((...wS) => wS.map((signal) => signal($)));
  $.$$ = 1;
  $.wR = wR;
  if (activeReactor) activeReactor.inner.add(wR);
  reactorReset(wR);
  return wR;
};

const reactorReset = (wR: WireReactor<X>): void => {
  wR.state = STATE_OFF;
  wR.inner = new Set();
  // Drop all signals now that they have been unlinked
  wR.sS = new Set();
  wR.sP = new Set();
  wR.sC = new Set();
};

const reactorUnsubscribe = (wR: WireReactor<X>): void => {
  const unlinkFromSignal = (signal: WireSignal<X>) => signal.rS.delete(wR);
  wR.inner.forEach(reactorUnsubscribe);
  wR.sS.forEach(unlinkFromSignal);
  wR.sC.forEach(unlinkFromSignal);
  reactorReset(wR);
};

const reactorPause = (wR: WireReactor<X>) => {
  wR.state = STATE_PAUSED;
  wR.inner.forEach(reactorPause);
};

const wireSignals = <T>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends WireReactor<infer R> ? R : T[K]>;
} => {
  type R = WireReactor<X>;
  Object.keys(obj).forEach((k) => {
    let saved: unknown;
    let read: unknown; // Multi-use temp variable
    const id = `wS:${signalId++}{${k}}`;
    const wS = { [id](...args: unknown[]) {
      // Case: Read-Pass
      if ((read = !args.length)) {
        if (activeReactor) {
          if (activeReactor.sS.has(wS)) {
            throw new Error(`Mixed sS|sP ${wS.name}`);
          }
          activeReactor.sP.add(wS);
        }
      }
      // Case: Read-Subscribe
      // @ts-ignore
      else if ((read = args[0] && args[0].$$ && args[0].wR)) {
        if ((read as R).sP.has(wS)) {
          throw new Error(`Mixed sP|sS ${wS.name}`);
        }
        (read as R).sS.add(wS);
        wS.rS.add((read as R));
        // Subscribing to a computed-signal also links cR's subscribed signals
        wS.cR && wS.cR.sS.forEach((s) => {
          // Link to sC not sS. This way the "Mixed A/B" errors keep working
          (read as R).sC.add(s);
          s.rS.add((read as R));
        });
      }
      // Case: Write
      else if (args.length === 2 && (args[0] as Comparator)(saved, args[1])) {
        // If in a transaction; defer saving the value
        if (transactionSignals) {
          transactionSignals.add(wS);
          wS.tV = args[1] as T[keyof T];
          return;
        }
        // If overwriting a computed-signal, unsubscribe the reactor
        if (wS.cR) {
          reactorUnsubscribe(wS.cR);
          delete wS.cR.cS; // Part of unsubscribing/cleaning the reactor
          delete wS.cR;
        }
        saved = args[1] as T[keyof T];
        // @ts-ignore If writing a reactor, register as a computed-signal
        if (saved && saved.$wR) {
          (saved as R).cS = wS;
          (saved as R).state = STATE_STALE;
          wS.cR = saved as R;
        }
        // Notify. Copy wS.wR since the Set() can grow while running and loop
        // infinitely. Depth ordering needs an array while Sinuous uses a Set()
        const toRun = [...wS.rS].sort((a, b) => a.sort - b.sort);
        // Mark upstream computeds as stale. Must be in an isolated for-loop
        toRun.forEach((wR) => {
          if (wR.state === STATE_PAUSED || wR.cS) wR.state = STATE_STALE;
        });
        // Calls are ordered parent->child
        toRun.forEach((wR) => {
          // OFF|ON|RUNNING < PAUSED|STALE. Skips paused reactors and lazy
          // computed-signals. OFF reactors shouldn't exist...
          if (wR.state < STATE_PAUSED) wR();
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
    wS(set, obj[k as keyof T]);
    // @ts-ignore Mutation of T
    obj[k] = wS;
  });
  // @ts-ignore Mutation of T
  return obj;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const set = <T>(prev: T, next: T): boolean => true;
const setNotEqual = <T>(prev: T, next: T): boolean => prev !== next;

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
    wS(wS.tV);
    delete wS.tV;
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
  adopt,
  set,
  setNotEqual
};
export type { WireSignal, WireReactor, WireReactorState, SubToken, Comparator };
