// Haptic Wire

type WireSubscriber<T = unknown> = {
  /** Run the reactor */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals that were read-subscribed last run */
  sS: Set<WireSignal<X>>;
  /** Signals that were read-passed last run */
  sP: Set<WireSignal<X>>;
  /** Signals that were given by computed-signals last run */
  sC: Set<WireSignal<X>>;
  /** Other reactors created during this run (children of this parent) */
  inner: Set<WireSubscriber<X>>;
  /** FSM state: CLEARED|RUNNING|WAITING|PAUSED|STALE */
  state: WireSubscriberState;
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
  (value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Reactors subscribed to this signal */
  rS: Set<WireSubscriber<X>>;
  /** Transaction value; set and deleted on commit */
  tV?: T;
  /** If this is a computed-signal, this is its reactor */
  cR?: WireSubscriber<T>;
  /** To check "if x is a signal" */
  $wS: 1;
};

type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends WireSignal<infer R> ? R : never
  };
  /** Reactor to subscribe to */
  wR: WireSubscriber<X>;
  /** To check "if x is a subcription token" */
  $$: 1;
};

type WireSubscriberState =
  | typeof STATE_CLEARED
  | typeof STATE_RUNNING
  | typeof STATE_LINKED_WAITING
  | typeof STATE_LINKED_PAUSED
  | typeof STATE_LINKED_STALE;

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

let signalId = 0;
let subscriberId = 0;

// Currently running reactor
let activeSubscriber: WireSubscriber<X> | undefined;
// WireSignals written to during a transaction(() => {...})
let transactionSignals: Set<WireSignal<X>> | undefined;

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
declare const STATE_CLEARED        = 0;
declare const STATE_RUNNING        = 1;
declare const STATE_LINKED_WAITING = 2;
declare const STATE_LINKED_PAUSED  = 3;
declare const STATE_LINKED_STALE   = 4;

/**
 * Void subcription token. Used when a function demands a token but you don't
 * want to consent to any signal subscriptions. */
// @ts-ignore
const v$: SubToken = ((...signals) => signals.map((sig) => sig(v$)));

// In wireSignal and wireReactor `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

/**
 * Creates a reactor. Turn the reactor on by manually running it. Any signals
 * who read-subscribed will re-run the reactor when written to. Reactors are
 * named by their function's name and a counter. */
const sub = <T>(fn: ($: SubToken) => T): WireSubscriber<T> => {
  const id = `subscriber:${subscriberId++}{${fn.name}}`;
  let saved: T;
  // @ts-ignore function properties are setup by reactorReset() below
  const _sub: WireSubscriber<T> = { [id]() {
    if (_sub.state === STATE_RUNNING) {
      throw new Error(`Loop ${_sub.name}`);
    }
    // If STATE_PAUSED then STATE_STALE was never reached; nothing has changed.
    // Restore state (below) and call inner reactors so they can check
    if (_sub.state === STATE_LINKED_PAUSED) {
      _sub.inner.forEach((__sub) => { __sub(); });
    } else {
      // Symmetrically remove all connections from wS/wR. Called "automatic
      // memory management" in Sinuous/S.js
      subClear(_sub);
      _sub.state = STATE_RUNNING;
      saved = subAdopt(_sub, () => _sub.fn($));
      _sub.runs++;
    }
    _sub.state = _sub.sS.size
      ? STATE_LINKED_WAITING
      : STATE_CLEARED;
    return saved;
  } }[id];
  _sub.$wR = 1;
  _sub.fn = fn;
  _sub.runs = 0;
  _sub.sort = activeSubscriber ? activeSubscriber.sort + 1 : 0;
  // @ts-ignore
  const $: SubToken = ((...wS) => wS.map((_signal) => _signal($)));
  $.$$ = 1;
  $.wR = _sub;
  if (activeSubscriber) activeSubscriber.inner.add(_sub);
  subInit(_sub);
  return _sub;
};

const subInit = (sub: WireSubscriber<X>): void => {
  sub.state = STATE_CLEARED;
  sub.inner = new Set();
  // Drop all signals now that they have been unlinked
  sub.sS = new Set();
  sub.sP = new Set();
  sub.sC = new Set();
};

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the reactor until it is manually re-run. */
const subClear = (_sub: WireSubscriber<X>): void => {
  const unlinkFromSignal = (signal: WireSignal<X>) => signal.rS.delete(_sub);
  _sub.inner.forEach(subClear);
  _sub.sS.forEach(unlinkFromSignal);
  _sub.sC.forEach(unlinkFromSignal);
  subInit(_sub);
};

/**
 * Pauses a reactor. Trying to run the reactor again will unpause; if no signals
 * were written during the pause then the run is skipped. */
const subPause = (_sub: WireSubscriber<X>) => {
  _sub.state = STATE_LINKED_PAUSED;
  _sub.inner.forEach(subPause);
};

/**
 * Creates signals for each object entry. Signals are read/write variables which
 * hold a list of subscribed reactors. When any value is written reactors are
 * re-run. Writing a reactor to a signal creates a lazy computed-signal. Signals
 * are named by the key of the object entry and a global counter. */
const signalObject = <T>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends WireSubscriber<infer R> ? R : T[K]>;
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

const signal = <T>(value: T, id?: string): WireSignal<T> => {
  type R = WireSubscriber<X>;
  let saved: unknown;
  // Multi-use temp variable
  let read: unknown = `signal:${signalId++}{${id as string}`;
  const _signal = { [read as string](...args: unknown[]) {
    // Case: Read-Pass
    if ((read = !args.length)) {
      if (activeSubscriber) {
        if (activeSubscriber.sS.has(_signal)) {
          throw new Error(`Mixed sS|sP ${_signal.name}`);
        }
        activeSubscriber.sP.add(_signal);
      }
    }
    // Case: Void token
    // eslint-disable-next-line no-empty
    else if ((read = args[0] === v$)) {}
    // Case: Read-Subscribe
    // @ts-ignore
    else if ((read = args[0] && args[0].$$ && args[0].wR)) {
      if ((read as R).sP.has(_signal)) {
        throw new Error(`Mixed sP|sS ${_signal.name}`);
      }
      (read as R).sS.add(_signal);
      _signal.rS.add((read as R));
      // Subscribing to a computed-signal also links cR's subscribed signals
      _signal.cR && _signal.cR.sS.forEach((s) => {
        // Link to sC not sS. This way the "Mixed A/B" errors keep working
        (read as R).sC.add(s);
        s.rS.add((read as R));
      });
    }
    // Case: Write
    else {
      // If in a transaction; defer saving the value
      if (transactionSignals) {
        transactionSignals.add(_signal);
        _signal.tV = args[0] as T;
        return;
      }
      // If overwriting a computed-signal, unsubscribe the reactor
      if (_signal.cR) {
        subClear(_signal.cR);
        delete _signal.cR.cS; // Part of unsubscribing/cleaning the reactor
        delete _signal.cR;
      }
      saved = args[0] as T;
      // @ts-ignore If writing a reactor, register as a computed-signal
      if (saved && saved.$wR) {
        (saved as R).cS = _signal;
        (saved as R).state = STATE_LINKED_STALE;
        _signal.cR = saved as R;
      }
      // Notify. Copy sig.rS since the Set() can grow while running and loop
      // infinitely. Depth ordering needs an array while Sinuous uses a Set()
      const toRun = [..._signal.rS].sort((a, b) => a.sort - b.sort);
      // Mark upstream computeds as stale. Must be in an isolated for-loop
      toRun.forEach((_sub) => {
        if (_sub.state === STATE_LINKED_PAUSED || _sub.cS) _sub.state = STATE_LINKED_STALE;
      });
      // Calls are ordered parent->child
      toRun.forEach((wR) => {
        // CLEARED|RUNNING|WAITING < PAUSED|STALE. Skips paused reactors and lazy
        // computed-signals. RESET reactors shouldn't exist...
        if (wR.state < STATE_LINKED_PAUSED) wR();
      });
    }
    if (read) {
      if (_signal.cR && _signal.cR.state === STATE_LINKED_STALE) saved = _signal.cR();
      return saved;
    }
  } }[read as string] as WireSignal<T>;
  _signal.$wS = 1;
  _signal.rS = new Set<WireSubscriber<X>>();
  // Call it to run the "Case: Write" and de|initialize computed-signals
  _signal(value);
  return _signal;
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
  signals.forEach((_signal) => {
    _signal(_signal.tV);
    delete _signal.tV;
  });
  return ret as T;
};

/**
 * Run a function with a reactor set as the active listener. Nested children
 * reactors are adopted (see wR.sort and wR.inner). This also affects signal
 * read consistent checks for read-pass (sP) and read-subscribe (sS). */
const subAdopt = <T>(_sub: WireSubscriber<X>, fn: () => T): T => {
  const prev = activeSubscriber;
  activeSubscriber = _sub;
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  activeSubscriber = prev;
  if (error) throw error;
  return ret as T;
};

export {
  signal,
  signalObject,
  sub,
  // None of these below contribute to bundle size
  subClear,
  subPause,
  subAdopt,
  transaction,
  v$ // Actual subtokens are only ever provided by a reactor
};

export type { WireSignal, WireSubscriber, WireSubscriberState, SubToken };
