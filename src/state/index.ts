// Haptic's reactive state engine

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
  cw?: Wire<T>;
  /** To check "if x is a signal" */
  $signal: 1;
};

type Wire<T = unknown> = {
  /** Run the wire */
  (): T;
  /** Signals read-subscribed last run */
  sigRS: Set<Signal<X>>;
  /** Signals read-passed last run */
  sigRP: Set<Signal<X>>;
  /** Signals inherited from computed-signals, for consistent two-way linking */
  sigIC: Set<Signal<X>>;
  /** Post-run tasks */
  tasks: Set<(nextValue: T) => void>;
  /** Wire that created this wire (parent of this child) */
  upper: Wire<X> | undefined;
  /** Wires created during this run (children of this parent) */
  lower: Set<Wire<X>>;
  /** FSM state 3-bit bitmask: [RUNNING][SKIP_RUN_QUEUE][NEEDS_RUN] */
  state: WireState;
  /** Run count */
  run: number;
  /** If part of a computed signal, this is its signal */
  cs?: Signal<T>;
  /** To check "if x is a wire" */
  $wire: 1;
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

/** 3 bits: [RUNNING][SKIP_RUN_QUEUE][NEEDS_RUN] */
type WireState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;
type P<T> = Partial<T>;

let wireId = 0;
let signalId = 0;

// Currently running wire
let activeWire: Wire<X> | undefined;
// Signals written to during a transaction
let transactionSignals: Set<Signal<X>> | undefined;
let transactionCommit = false;

// Symbol() doesn't gzip well. `[] as const` gzips best but isn't debuggable
// without a lookup Map<> and other hacks.
declare const S_RUNNING        = 0b100;
declare const S_SKIP_RUN_QUEUE = 0b010;
declare const S_NEEDS_RUN      = 0b001;

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
    if (wire.state & S_RUNNING) {
      throw new Error(`Loop ${wire.name}`);
    }
    // Symmetrically remove all connections between signals and wires. This is
    // called "automatic memory management" in Sinuous/S.js
    wireReset(wire);
    wire.state |= S_RUNNING;
    wireAdopt(wire, () => saved = fn($));
    wire.tasks.forEach((task) => task(saved));
    wire.run++;
    wire.state &= ~(S_RUNNING | S_NEEDS_RUN);
    return saved;
  } }[id];
  // @ts-ignore
  const $: SubToken = ((...sig) => sig.map((_sig) => _sig($)));
  $.$$ = 1;
  $.wire = wire;
  if (activeWire) activeWire.lower.add(wire);
  wire.upper = activeWire;
  wire.tasks = new Set();
  wire.$wire = 1;
  wire.run = 0;
  // Outside of _initWire because this persists across wire resets
  _initWire(wire);
  return wire;
};

const _initWire = (wire: Wire<X>): void => {
  wire.state = S_NEEDS_RUN;
  wire.lower = new Set();
  // Drop all signals now that they have been unlinked
  wire.sigRS = new Set();
  wire.sigRP = new Set();
  wire.sigIC = new Set();
};

const _runWires = (wires: Set<Wire<X>>): void => {
  // Use a new Set() to avoid infinite loops caused by wires writing to signals
  // during their run.
  const toRun = new Set(wires);
  let curr: Wire<X> | undefined;
  // Mark upstream computeds as stale. Must be in an isolated for-loop
  toRun.forEach((wire) => {
    if (wire.cs || wire.state & S_SKIP_RUN_QUEUE) {
      toRun.delete(wire);
      wire.state |= S_NEEDS_RUN;
    }
    // TODO: Test (#3) + Benchmark with main branch
    // If a wire's ancestor will run it'll destroy its children so remove them:
    curr = wire;
    while ((curr = curr.upper))
      if (toRun.has(curr)) return toRun.delete(wire);
  });
  toRun.forEach((wire) => wire() as void);
};

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the wire until it is manually re-run. */
const wireReset = (wire: Wire<X>): void => {
  wire.lower.forEach(wireReset);
  wire.sigRS.forEach((signal) => signal.wires.delete(wire));
  wire.sigIC.forEach((signal) => signal.wires.delete(wire));
  _initWire(wire);
};

/**
 * Pauses a wire so signal writes won't cause runs. Affects nested wires */
const wirePause = (wire: Wire<X>): void => {
  wire.lower.forEach(wirePause);
  wire.state |= S_SKIP_RUN_QUEUE;
};

/**
 * Resumes a paused wire. Affects nested wires but skips wires belonging to
 * computed-signals. Returns true if any runs were missed during the pause */
const wireResume = (wire: Wire<X>): boolean => {
  wire.lower.forEach(wireResume);
  // Clears SKIP_RUN_QUEUE only if it's NOT a computed-signal
  if (!wire.cs) wire.state &= ~S_SKIP_RUN_QUEUE;
  // eslint-disable-next-line no-implicit-coercion
  return !!(wire.state & S_NEEDS_RUN);
};

const signalBase = <T>(value: T, id = ''): Signal<T> => {
  type W = Wire<X>;
  let saved: unknown;
  let cwTask: ((value: unknown) => void) | undefined;
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
    else if ((read = args[0] && (args[0] as P<SubToken>).$$ && args[0].wire)) {
      if ((read as W).sigRP.has(signal)) {
        throw new Error(`${(read as W).name} mixes sig($) & sig()`);
      }
      // Two-way link. Signal writes will now call/update wire C
      (read as W).sigRS.add(signal);
      signal.wires.add((read as W));

      // Computed-signals can't only run C when written to, they also need to
      // run C when signal.cw is marked stale. How do we know when that happens?
      // It's when a cw.sigRS signal tries to call signal.cw. So adding `read`
      // to each signal in cw.sigRS will call C as collateral.
      if (signal.cw) {
        // Run early if sigRS isn't ready (see "Update if needed" line below)
        if (signal.cw.state & S_NEEDS_RUN) signal.cw();
        signal.cw.sigRS.forEach((_signal) => {
          // Linking _must_ be two-way. From signal.wires to wire.sigXYZ. Until
          // now it's always either sigRP or sigRP, but if we use those we'll
          // break the mix error checking (above). So use a new list, sigIC.
          (read as W).sigIC.add(_signal);
          _signal.wires.add((read as W));
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
      if (signal.cw) {
        signal.cw.tasks.delete(cwTask as () => void);
        wireReset(signal.cw);
        delete signal.cw.cs;
        delete signal.cw;
        // cwTask = undefined;
      }
      saved = args[0] as unknown as T;
      // If writing a wire, this signal becomes as a computed-signal
      if (saved && (saved as P<Wire>).$wire) {
        (saved as W).cs = signal;
        (saved as W).state |= S_SKIP_RUN_QUEUE;
        (saved as W).tasks.add(cwTask = (value) => saved = value);
        signal.cw = saved as W;
        // saved = undefined;
      }
      // Notify every write _unless_ this is a post-transaction commit
      if (!transactionCommit) _runWires(signal.wires);
    }
    if (read) {
      // Update if needed
      if (signal.cw && signal.cw.state & S_NEEDS_RUN) signal.cw();
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
 * adopted (see wire.lower). Also affects signal read consistency checks for
 * read-pass (signal.sigRP) and read-subscribe (signal.sigRS). */
const wireAdopt = <T>(wire: Wire<X> | undefined, fn: () => T): void => {
  const prev = activeWire;
  activeWire = wire;
  let error: unknown;
  // Note: Can't use try+finally it swallows the error instead of throwing
  try {
    fn();
  } catch (err) {
    error = err;
  }
  activeWire = prev;
  if (error) throw error;
};

export {
  // Using createX avoids variable shadowing, rename here
  createSignal as signal,
  createWire as wire,
  wireReset,
  wirePause,
  wireResume,
  wireAdopt,
  transaction,
  v$ // Actual subtokens are only ever provided by a wire
};

export type { Signal, Wire, WireState, SubToken };
