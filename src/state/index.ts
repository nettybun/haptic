// Haptic's reactive state engine

// TODO: Renaming in phases
type Wire<T = unknown> = {
  /** Run the core */
  (): T;
  /** User-provided function to run */
  fn: ($: SubToken) => T;
  /** Signals read-subscribed last run */
  sigRS: Set<Signal<X>>;
  /** Signals read-passed last run */
  sigRP: Set<Signal<X>>;
  /** Signals inherited from computed-signals, for consistent two-way linking */
  sigIC: Set<Signal<X>>;
  /** Cores created during this run (children of this parent) */
  inner: Set<Wire<X>>;
  /** FSM state: RESET|RUNNING|WAITING|PAUSED|STALE */
  state: WireFSM;
  /** Run count */
  run: number;
  /** If part of a computed signal, this is its signal */
  cs?: Signal<T>;
  /** To check "if x is a core" */
  $core: 1;
};

type Signal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying cores */ // Ordered before ($):T for TS to work
  (value: T): void;
  /** Read value & subscribe */
  ($: SubToken): T;
  /** Cores subscribed to this signal */
  cores: Set<Wire<X>>;
  /** Transaction value; set and deleted on commit */
  next?: T;
  /** If this is a computed-signal, this is its core */
  cc?: Wire<T>;
  /** To check "if x is a signal" */
  $signal: 1;
};

type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends Signal<infer R> ? R : never
  };
  /** Core to subscribe to */
  core: Wire<X>;
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

let coreId = 0;
let signalId = 0;

// Currently running core
let activeCore: Wire<X> | undefined;
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

// In signalBase() and createCore() `{ [id]() {} }[id]` preserves the function
// name which is useful for debugging

/**
 * Create a core. Activate the core by running it (function call). Any signals
 * that read-subscribed during the run will re-run the core later when written
 * to. Cores can be run anytime manually. They're pausable and are resumed when
 * called; resuming will avoid a core run if the core is not stale. Cores are
 * named by their function's name and a counter. */
const createCore = <T>(fn: ($: SubToken) => T): Wire<T> => {
  const id = `wire|${coreId++}{${fn.name}}`;
  let saved: T;
  // @ts-ignore Missing properties right now but they're set in _initCore()
  const core: Wire<T> = { [id]() {
    if (core.state === FSM_RUNNING) {
      throw new Error(`Loop ${core.name}`);
    }
    // If STATE_PAUSED then STATE_STALE was never reached; nothing has changed.
    // Restore state (below) and call inner cores so they can check
    if (core.state === FSM_WIRED_PAUSED) {
      core.inner.forEach((_core) => { _core(); });
    } else {
      // Symmetrically remove all connections between signals and cores. This is
      // called "automatic memory management" in Sinuous/S.js
      coreReset(core);
      core.state = FSM_RUNNING;
      saved = coreAdopt(core, () => core.fn($));
      core.run++;
    }
    core.state = core.sigRS.size
      ? FSM_WIRED_WAITING
      : FSM_RESET;
    return saved;
  } }[id];
  core.$core = 1;
  core.fn = fn;
  core.run = 0;
  // @ts-ignore
  const $: SubToken = ((...sig) => sig.map((_sig) => _sig($)));
  $.$$ = 1;
  $.core = core;
  if (activeCore) activeCore.inner.add(core);
  _initCore(core);
  return core;
};

const _initCore = (core: Wire<X>): void => {
  core.state = FSM_RESET;
  core.inner = new Set();
  // Drop all signals now that they have been unlinked
  core.sigRS = new Set();
  core.sigRP = new Set();
  core.sigIC = new Set();
};

const _runCores = (cores: Set<Wire<X>>): void => {
  // Use a new Set() to avoid infinite loops caused by cores writing to signals
  // during their run.
  const toRun = new Set(cores);
  // Mark upstream computeds as stale. Must be in an isolated for-loop
  toRun.forEach((core) => {
    // TODO: Test (#3). Also benchmark?

    // If a core's ancestor will run it'll destroy the children. Remove them.
    // for (let p = core.parent; p; p = p.parent) {
    //   if (toRun.has(p)) { toRun.delete(core); return; }
    // }
    // Equally: If a core's child is in the list, remove the child...
    core.inner.forEach((ci) => toRun.delete(ci));
    if (core.state === FSM_WIRED_PAUSED || core.cs) core.state = FSM_WIRED_STALE;
  });
  toRun.forEach((core) => {
    // RESET|RUNNING|WAITING < PAUSED|STALE. Skips paused cores and lazy
    // computed-signals. RESET cores shouldn't exist...
    if (core.state < FSM_WIRED_PAUSED) core();
  });
};

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the core until it is manually re-run. */
const coreReset = (core: Wire<X>): void => {
  const unlinkFromSignal = (signal: Signal<X>) => signal.cores.delete(core);
  core.inner.forEach(coreReset);
  core.sigRS.forEach(unlinkFromSignal);
  core.sigIC.forEach(unlinkFromSignal);
  _initCore(core);
};

/**
 * Pauses a core. Trying to run the core again will unpause; if no signals
 * were written during the pause then the run is skipped. */
const corePause = (core: Wire<X>) => {
  core.state = FSM_WIRED_PAUSED;
  core.inner.forEach(corePause);
};

const signalBase = <T>(value: T, id = ''): Signal<T> => {
  type C = Wire<X>;
  let saved: unknown;
  // Multi-use temp variable
  let read: unknown = `signal|${signalId++}{${id}}`;
  const signal = { [read as string](...args: [$?: SubToken, ...unused: unknown[]]) {
    // Case: Read-Pass. Marks the active running core as a reader
    if ((read = !args.length)) {
      if (activeCore) {
        if (activeCore.sigRS.has(signal)) {
          throw new Error(`${activeCore.name} mixes sig($) & sig()`);
        }
        activeCore.sigRP.add(signal);
      }
    }
    // Case: Void token
    else if ((read = args[0] === v$)) {}
    // Case: Read-Subscribe. Marks the core registered in `$` as a reader
    // This could be different than the actively running core, but shouldn't be
    else if ((read = args[0] && (args[0] as { $$?: 1 }).$$ && args[0].core)) {
      if ((read as C).sigRP.has(signal)) {
        throw new Error(`${(read as C).name} mixes sig($) & sig()`);
      }
      // Two-way link. Signal writes will now call/update core C
      (read as C).sigRS.add(signal);
      signal.cores.add((read as C));

      // Computed-signals (signals holding a core; signal.cc) can't only run C
      // when written to, they also need to run C when cc is marked stale. How
      // do we know when that happens? It'll be when one of cc.sigRS signals
      // calls cc. So, link this `read` core to each cc.sigRS call list; it'll
      // be called as collateral.
      if (signal.cc) {
        signal.cc.sigRS.forEach((_signal) => {
          // Linking _must_ be two-way. From signal.cores to core.sigXYZ. Until
          // now it's always either sigRP or sigRP, but if we use those we'll
          // break the mix error checking (above). So use a new list, sigIC.
          (read as C).sigIC.add(_signal);
          _signal.cores.add((read as C));
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
      // If overwriting a computed-signal core, unsubscribe the core
      if (signal.cc) {
        coreReset(signal.cc);
        delete signal.cc.cs; // Part of unsubscribing/cleaning the core
        delete signal.cc;
      }
      saved = args[0] as unknown as T;
      // If writing a core, this signal becomes as a computed-signal
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (saved && (saved as Wire).$core) {
        (saved as C).cs = signal;
        (saved as C).state = FSM_WIRED_STALE;
        signal.cc = saved as C;
      }
      // Notify every write _unless_ this is a post-transaction commit
      if (!transactionCommit && signal.cores.size) _runCores(signal.cores);
    }
    if (read) {
      // Re-run the core to get a new value if needed
      if (signal.cc && signal.cc.state === FSM_WIRED_STALE) saved = signal.cc();
      return saved;
    }
  } }[read as string] as Signal<T>;
  signal.$signal = 1;
  signal.cores = new Set<Wire<X>>();
  // Call it to run the "Case: Write" and de|initialize computed-signals
  signal(value);
  return signal;
};

/**
 * Creates signals for each object entry. Signals are read/write variables which
 * hold a list of subscribed cores. When a value is written those cores are
 * re-run. Writing a core into a signal creates a lazy computed-signal. Signals
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
    const transactionCores = new Set<Wire<X>>();
    transactionCommit = true;
    signals.forEach((signal) => {
      // Doesn't run any subscribed cores since `transactionCommit` is set
      signal(signal.next);
      delete signal.next;
      signal.cores.forEach((core) => transactionCores.add(core));
    });
    transactionCommit = false;
    _runCores(transactionCores);
  } catch (err) {
    error = err;
  }
  // Yes this happens a few lines up; do it again in case the `try` throws
  transactionSignals = prev;
  if (error) throw error;
  return ret as T;
};

/**
 * Run a function within the context of a core. Nested children cores are
 * adopted (see core.inner). Also affects signal read consistency checks for
 * read-pass (signal.sigRP) and read-subscribe (signal.sigRS). */
const coreAdopt = <T>(core: Wire<X>, fn: () => T): T => {
  const prev = activeCore;
  activeCore = core;
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
  // Using createX avoids variable shadowing
  createSignal as signal,
  createCore as core,
  coreReset,
  corePause,
  coreAdopt,
  transaction,
  v$ // Actual subtokens are only ever provided by a core
};

export type { Signal, Wire, WireFSM, SubToken };
