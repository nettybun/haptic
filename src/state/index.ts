// Haptic's reactive state engine

type Wire<T = unknown> = {
  /** Run the wire */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals read-subscribed last run */
  sigRS: Set<Signal<X>>;
  /** Signals read-passed last run */
  sigRP: Set<Signal<X>>;
  /** Signals inherited from computed-signals, for consistent two-way linking */
  sigIC: Set<Signal<X>>;
  /** Wires created during this run (children of this parent) */
  inner: Set<Wire<X>>;
  /** FSM state: RESET|RUNNING|WAITING|PAUSED|STALE */
  state: WireFSM;
  /** Run count */
  run: number;
  /** If part of a computed signal, this is its signal */
  cs?: Signal<T>;
  /** To check "if x is a wire" */
  $wire: 1;
};

type Signal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying wires */ // Ordered before ($):T for TS to work
  (value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Wires subscribed to this signal */
  wires: Set<Wire<X>>;
  /** Transaction value; set and deleted on commit */
  next?: T;
  /** If this is a computed-signal, this is its wire */
  cc?: Wire<T>;
  /** To check "if x is a signal" */
  $signal: 1;
};

type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends Signal<infer R> ? R : never
  };
  /** Wire to subscribe to */
  wire: Wire<X>;
  /** To check "if x is a subscription token" */
  $$: 1;
};

type WireFSM =
  | typeof FSM_RESET
  | typeof FSM_RUNNING
  | typeof FSM_WIRED_WAITING
  | typeof FSM_WIRED_PAUSED
  | typeof FSM_WIRED_STALE;

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;

let wireId = 0;
let signalId = 0;

// Currently running wire
let activeWire: Wire<X> | undefined;
// Signals written to during a transaction
let transactionSignals: Set<Signal<X>> | undefined;
let transactionCommit = false;

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
declare const FSM_RESET         = 0;
declare const FSM_RUNNING       = 1;
declare const FSM_WIRED_WAITING = 2;
declare const FSM_WIRED_PAUSED  = 3;
declare const FSM_WIRED_STALE   = 4;

/**
 * Void subcription token. Used when a function demands a token but you don't
 * want to consent to any signal subscriptions. */
// @ts-ignore
const v$: SubToken = ((...signals) => signals.map((sig) => sig(v$)));

// In signalBase() and createWire() `{ [id]() {} }[id]` preserves the function
// name which is useful for debugging

/**
 * Create a wire. Activate the wire by running it (function call). Any signals
 * that read-subscribed during the run will re-run the wire later when written
 * to. Wires can be run anytime manually. They're pausable and are resumed when
 * called; resuming will avoid a wire run if the wire is not stale. Wires are
 * named by their function's name and a counter. */
const createWire = <T>(fn: ($: SubToken) => T): Wire<T> => {
  const id = `wire|${wireId++}{${fn.name}}`;
  let saved: T;
  // @ts-ignore Missing properties right now but they're set in _initWire()
  const wire: Wire<T> = { [id]() {
    if (wire.state === FSM_RUNNING) {
      throw new Error(`Loop ${wire.name}`);
    }
    // If FSM_PAUSED then FSM_STALE was never reached; nothing has changed.
    // Restore state (below) and call inner wires so they can check
    if (wire.state === FSM_WIRED_PAUSED) {
      wire.inner.forEach((_wire) => { _wire(); });
    } else {
      // Symmetrically remove all connections between signals and wires. This is
      // called "automatic memory management" in Sinuous/S.js
      wireReset(wire);
      wire.state = FSM_RUNNING;
      saved = wireAdopt(wire, () => wire.fn($));
      wire.run++;
    }
    wire.state = wire.sigRS.size
      ? FSM_WIRED_WAITING
      : FSM_RESET;
    return saved;
  } }[id];
  wire.$wire = 1;
  wire.fn = fn;
  wire.run = 0;
  // @ts-ignore
  const $: SubToken = ((...sig) => sig.map((_sig) => _sig($)));
  $.$$ = 1;
  $.wire = wire;
  if (activeWire) activeWire.inner.add(wire);
  _initWire(wire);
  return wire;
};

const _initWire = (wire: Wire<X>): void => {
  wire.state = FSM_RESET;
  wire.inner = new Set();
  // Drop all signals now that they have been unlinked
  wire.sigRS = new Set();
  wire.sigRP = new Set();
  wire.sigIC = new Set();
};

const _runWires = (wires: Set<Wire<X>>): void => {
  // Use a new Set() to avoid infinite loops caused by wires writing to signals
  // during their run.
  const toRun = new Set(wires);
  // Mark upstream computeds as stale. Must be in an isolated for-loop
  toRun.forEach((wire) => {
    // TODO: Test (#3). Also benchmark?

    // If a wire's ancestor will run it'll destroy the children. Remove them.
    // for (let p = wire.parent; p; p = p.parent) {
    //   if (toRun.has(p)) { toRun.delete(wire); return; }
    // }
    // Equally: If a wire's child is in the list, remove the child...
    wire.inner.forEach((ci) => toRun.delete(ci));
    if (wire.state === FSM_WIRED_PAUSED || wire.cs) {
      wire.state = FSM_WIRED_STALE;
    }
  });
  toRun.forEach((wire) => {
    // RESET|RUNNING|WAITING < PAUSED|STALE. Skips paused wires and lazy
    // computed-signals. RESET wires shouldn't exist...
    if (wire.state < FSM_WIRED_PAUSED) wire();
  });
};

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the wire until it is manually re-run. */
const wireReset = (wire: Wire<X>): void => {
  const unlinkFromSignal = (signal: Signal<X>) => signal.wires.delete(wire);
  wire.inner.forEach(wireReset);
  wire.sigRS.forEach(unlinkFromSignal);
  wire.sigIC.forEach(unlinkFromSignal);
  _initWire(wire);
};

/**
 * Pauses a wire. Trying to run the wire again will unpause; if no signals
 * were written during the pause then the run is skipped. */
const wirePause = (wire: Wire<X>) => {
  wire.state = FSM_WIRED_PAUSED;
  wire.inner.forEach(wirePause);
};

const signalBase = <T>(value: T, id = ''): Signal<T> => {
  type C = Wire<X>;
  let saved: unknown;
  // Multi-use temp variable
  let read: unknown = `signal|${signalId++}{${id}}`;
  const signal = { [read as string](...args: [$?: SubToken, ..._: unknown[]]) {
    // Case: Read-Pass. Marks the active running wire as a reader
    if ((read = !args.length)) {
      if (activeWire) {
        if (activeWire.sigRS.has(signal)) {
          throw new Error(`${activeWire.name} mixes sig($) & sig()`);
        }
        activeWire.sigRP.add(signal);
      }
    }
    // Case: Void token
    else if ((read = args[0] === v$)) {}
    // Case: Read-Subscribe. Marks the wire registered in `$` as a reader
    // This could be different than the actively running wire, but shouldn't be
    else if ((read = args[0] && (args[0] as { $$?: 1 }).$$ && args[0].wire)) {
      if ((read as C).sigRP.has(signal)) {
        throw new Error(`${(read as C).name} mixes sig($) & sig()`);
      }
      // Two-way link. Signal writes will now call/update wire C
      (read as C).sigRS.add(signal);
      signal.wires.add((read as C));

      // Computed-signals (signals holding a wire; signal.cc) can't only run C
      // when written to, they also need to run C when cc is marked stale. How
      // do we know when that happens? It'll be when one of cc.sigRS signals
      // calls cc. So, link this `read` wire to each cc.sigRS call list; it'll
      // be called as collateral.
      if (signal.cc) {
        signal.cc.sigRS.forEach((_signal) => {
          // Linking _must_ be two-way. From signal.wires to wire.sigXYZ. Until
          // now it's always either sigRP or sigRP, but if we use those we'll
          // break the mix error checking (above). So use a new list, sigIC.
          (read as C).sigIC.add(_signal);
          _signal.wires.add((read as C));
        });
      }
    }
    // Case: Write
    else {
      // If in a transaction; defer saving the value
      if (transactionSignals) {
        transactionSignals.add(signal);
        signal.next = args[0] as unknown as T;
        return;
      }
      // If overwriting a computed-signal wire, unsubscribe the wire
      if (signal.cc) {
        wireReset(signal.cc);
        delete signal.cc.cs; // Part of unsubscribing/cleaning the wire
        delete signal.cc;
      }
      saved = args[0] as unknown as T;
      // If writing a wire, this signal becomes as a computed-signal
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (saved && (saved as Wire).$wire) {
        (saved as C).cs = signal;
        (saved as C).state = FSM_WIRED_STALE;
        signal.cc = saved as C;
      }
      // Notify every write _unless_ this is a post-transaction commit
      if (!transactionCommit && signal.wires.size) _runWires(signal.wires);
    }
    if (read) {
      // Re-run the wire to get a new value if needed
      if (signal.cc && signal.cc.state === FSM_WIRED_STALE) saved = signal.cc();
      return saved;
    }
  } }[read as string] as Signal<T>;
  signal.$signal = 1;
  signal.wires = new Set<Wire<X>>();
  // Call it to run the "Case: Write" and de|initialize computed-signals
  signal(value);
  return signal;
};

/**
 * Creates signals for each object entry. Signals are read/write variables which
 * hold a list of subscribed wires. When a value is written those wires are
 * re-run. Writing a wire into a signal creates a lazy computed-signal. Signals
 * are named by the key of the object entry and a global counter. */
const createSignal = <T>(obj: T): {
  [K in keyof T]: Signal<T[K] extends Wire<infer R> ? R : T[K]>;
} => {
  Object.keys(obj).forEach((k) => {
    // @ts-ignore Mutation of T
    obj[k] = signalBase(obj[k as keyof T], k);
    signalId--;
  });
  signalId++;
  // @ts-ignore Mutation of T
  return obj;
};
createSignal.anon = signalBase;

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
    const signals = transactionSignals;
    transactionSignals = prev;
    const transactionWires = new Set<Wire<X>>();
    transactionCommit = true;
    signals.forEach((signal) => {
      // Doesn't run any subscribed wires since `transactionCommit` is set
      signal(signal.next);
      delete signal.next;
      signal.wires.forEach((wire) => transactionWires.add(wire));
    });
    transactionCommit = false;
    _runWires(transactionWires);
  } catch (err) {
    error = err;
  }
  // Yes this happens a few lines up; do it again in case the `try` throws
  transactionSignals = prev;
  if (error) throw error;
  return ret as T;
};

/**
 * Run a function within the context of a wire. Nested children wires are
 * adopted (see wire.inner). Also affects signal read consistency checks for
 * read-pass (signal.sigRP) and read-subscribe (signal.sigRS). */
const wireAdopt = <T>(wire: Wire<X>, fn: () => T): T => {
  const prev = activeWire;
  activeWire = wire;
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  activeWire = prev;
  if (error) throw error;
  return ret as T;
};

export {
  // Using createX avoids variable shadowing
  createSignal as signal,
  createWire as wire,
  wireReset,
  wirePause,
  wireAdopt,
  transaction,
  v$ // Actual subtokens are only ever provided by a wire
};

export type { Signal, Wire, WireFSM, SubToken };
