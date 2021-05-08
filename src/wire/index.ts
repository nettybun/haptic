// Haptic Wire

type WireCore<T = unknown> = {
  /** Run the core */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals that were read-subscribed last run */
  sS: Set<WireSignal<X>>;
  /** Signals that were read-passed last run */
  sP: Set<WireSignal<X>>;
  /** Signals that were given by computed-signals last run */
  sC: Set<WireSignal<X>>;
  /** Other cores created during this run (children of this parent) */
  inner: Set<WireCore<X>>;
  /** FSM state: RESET|RUNNING|WAITING|PAUSED|STALE */
  state: CoreStates;
  /** Number of parent cores (see wR.inner); to sort core runs */
  sort: number;
  /** Run count */
  runs: number;
  /** If part of a computed signal, this is its signal */
  cS?: WireSignal<T>;
  /** To check "if x is a core" */
  $wC: 1;
};

type WireSignal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying cores */ // Ordered before ($):T for TS to work
  (value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Cores subscribed to this signal */
  rS: Set<WireCore<X>>;
  /** Transaction value; set and deleted on commit */
  tV?: T;
  /** If this is a computed-signal, this is its core */
  cC?: WireCore<T>;
  /** To check "if x is a signal" */
  $wS: 1;
};

type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends WireSignal<infer R> ? R : never
  };
  /** Core to subscribe to */
  wC: WireCore<X>;
  /** To check "if x is a subcription token" */
  $$: 1;
};

type CoreStates =
  | typeof STATE_RESET
  | typeof STATE_RUNNING
  | typeof STATE_LINKED_WAITING
  | typeof STATE_LINKED_PAUSED
  | typeof STATE_LINKED_STALE;

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

let coreId = 0;
let signalId = 0;

// Currently running core
let activeCore: WireCore<X> | undefined;
// WireSignals written to during a transaction(() => {...})
let transactionSignals: Set<WireSignal<X>> | undefined;

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
declare const STATE_RESET          = 0;
declare const STATE_RUNNING        = 1;
declare const STATE_LINKED_WAITING = 2;
declare const STATE_LINKED_PAUSED  = 3;
declare const STATE_LINKED_STALE   = 4;

/**
 * Void subcription token. Used when a function demands a token but you don't
 * want to consent to any signal subscriptions. */
// @ts-ignore
const v$: SubToken = ((...signals) => signals.map((sig) => sig(v$)));

// In wireCore and wireSignal `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

/**
 * Create a core. Activate the core by manually running it. Any signals that
 * read-subscribed during its run will re-run the core when they're written to.
 * Cores are named by their function's name and a counter. */
const core = <T>(fn: ($: SubToken) => T): WireCore<T> => {
  const id = `core:${coreId++}{${fn.name}}`;
  let saved: T;
  // @ts-ignore function properties are setup by coreReset() below
  const wC: WireCore<T> = { [id]() {
    if (wC.state === STATE_RUNNING) {
      throw new Error(`Loop ${wC.name}`);
    }
    // If STATE_PAUSED then STATE_STALE was never reached; nothing has changed.
    // Restore state (below) and call inner cores so they can check
    if (wC.state === STATE_LINKED_PAUSED) {
      wC.inner.forEach((_wC) => { _wC(); });
    } else {
      // Symmetrically remove all connections from wS/wR. Called "automatic
      // memory management" in Sinuous/S.js
      coreReset(wC);
      wC.state = STATE_RUNNING;
      saved = coreAdopt(wC, () => wC.fn($));
      wC.runs++;
    }
    wC.state = wC.sS.size
      ? STATE_LINKED_WAITING
      : STATE_RESET;
    return saved;
  } }[id];
  wC.$wC = 1;
  wC.fn = fn;
  wC.runs = 0;
  wC.sort = activeCore ? activeCore.sort + 1 : 0;
  // @ts-ignore
  const $: SubToken = ((...wS) => wS.map((_signal) => _signal($)));
  $.$$ = 1;
  $.wC = wC;
  if (activeCore) activeCore.inner.add(wC);
  coreInit(wC);
  return wC;
};

const coreInit = (wC: WireCore<X>): void => {
  wC.state = STATE_RESET;
  wC.inner = new Set();
  // Drop all signals now that they have been unlinked
  wC.sS = new Set();
  wC.sP = new Set();
  wC.sC = new Set();
};

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the core until it is manually re-run. */
const coreReset = (wC: WireCore<X>): void => {
  const unlinkFromSignal = (signal: WireSignal<X>) => signal.rS.delete(wC);
  wC.inner.forEach(coreReset);
  wC.sS.forEach(unlinkFromSignal);
  wC.sC.forEach(unlinkFromSignal);
  coreInit(wC);
};

/**
 * Pauses a core. Trying to run the core again will unpause; if no signals
 * were written during the pause then the run is skipped. */
const corePause = (wC: WireCore<X>) => {
  wC.state = STATE_LINKED_PAUSED;
  wC.inner.forEach(corePause);
};

const signal = <T>(value: T, id?: string): WireSignal<T> => {
  type R = WireCore<X>;
  let saved: unknown;
  // Multi-use temp variable
  let read: unknown = `signal:${signalId++}{${id as string}`;
  const wS = { [read as string](...args: unknown[]) {
    // Case: Read-Pass
    if ((read = !args.length)) {
      if (activeCore) {
        if (activeCore.sS.has(wS)) {
          throw new Error(`Mixed sS|sP ${wS.name}`);
        }
        activeCore.sP.add(wS);
      }
    }
    // Case: Void token
    // eslint-disable-next-line no-empty
    else if ((read = args[0] === v$)) {}
    // Case: Read-Subscribe
    // @ts-ignore
    else if ((read = args[0] && args[0].$$ && args[0].wR)) {
      if ((read as R).sP.has(wS)) {
        throw new Error(`Mixed sP|sS ${wS.name}`);
      }
      (read as R).sS.add(wS);
      wS.rS.add((read as R));
      // Subscribing to a computed-signal also links cR's subscribed signals
      wS.cC && wS.cC.sS.forEach((s) => {
        // Link to sC not sS. This way the "Mixed A/B" errors keep working
        (read as R).sC.add(s);
        s.rS.add((read as R));
      });
    }
    // Case: Write
    else {
      // If in a transaction; defer saving the value
      if (transactionSignals) {
        transactionSignals.add(wS);
        wS.tV = args[0] as T;
        return;
      }
      // If overwriting a computed-signal core, unsubscribe the core
      if (wS.cC) {
        coreReset(wS.cC);
        delete wS.cC.cS; // Part of unsubscribing/cleaning the core
        delete wS.cC;
      }
      saved = args[0] as T;
      // @ts-ignore If writing a core, this signal becomes as a computed-signal
      if (saved && saved.$wR) {
        (saved as R).cS = wS;
        (saved as R).state = STATE_LINKED_STALE;
        wS.cC = saved as R;
      }
      // Notify. Copy wS.rS since the Set() can grow while running and loop
      // infinitely. Depth ordering needs an array while Sinuous uses a Set()
      const toRun = [...wS.rS].sort((a, b) => a.sort - b.sort);
      // Mark upstream computeds as stale. Must be in an isolated for-loop
      toRun.forEach((wC) => {
        if (wC.state === STATE_LINKED_PAUSED || wC.cS) wC.state = STATE_LINKED_STALE;
      });
      // Calls are ordered parent->child
      toRun.forEach((wC) => {
        // RESET|RUNNING|WAITING < PAUSED|STALE. Skips paused cores and lazy
        // computed-signals. RESET cores shouldn't exist...
        if (wC.state < STATE_LINKED_PAUSED) wC();
      });
    }
    if (read) {
      // Re-run the core to get a new value if needed
      if (wS.cC && wS.cC.state === STATE_LINKED_STALE) saved = wS.cC();
      return saved;
    }
  } }[read as string] as WireSignal<T>;
  wS.$wS = 1;
  wS.rS = new Set<WireCore<X>>();
  // Call it to run the "Case: Write" and de|initialize computed-signals
  wS(value);
  return wS;
};

/**
 * Creates signals for each object entry. Signals are read/write variables which
 * hold a list of subscribed cores. When a value is written those cores are
 * re-run. Writing a core into a signal creates a lazy computed-signal. Signals
 * are named by the key of the object entry and a global counter. */
const signalsFrom = <T>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends WireCore<infer R> ? R : T[K]>;
} => {
  Object.keys(obj).forEach((k) => {
    // @ts-ignore Mutation of T
    obj[k] = signal(obj[k as keyof T], k);
    signalId--;
  });
  signalId++;
  // @ts-ignore Mutation of T
  return obj;
};

/**
 * Batch signal writes so only the last write per signal is applied. Values are
 * committed at the end of the function call. */
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

/**
 * Run a function with a core set as the active listener. Nested children cores
 * are adopted (see wR.sort and wR.inner). This also affects signal read
 * consistent checks for read-pass (sP) and read-subscribe (sS). */
const coreAdopt = <T>(wC: WireCore<X>, fn: () => T): T => {
  const prev = activeCore;
  activeCore = wC;
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  activeCore = prev;
  if (error) throw error;
  return ret as T;
};

export {
  signal,
  signalsFrom,
  core,
  coreReset,
  corePause,
  coreAdopt,
  transaction,
  v$ // Actual subtokens are only ever provided by a core
};

export type { WireSignal, WireCore, CoreStates, SubToken };
