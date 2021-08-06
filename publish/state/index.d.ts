declare type Signal<T = unknown> = {
  /** Read value */
  (): T;
  /** Write value; notifying wires */
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

declare type Wire<T = unknown> = {
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

declare type SubToken = {
  /** Allow $(...signals) to return an array of read values */
  <U extends Array<() => unknown>>(...args: U): {
    [P in keyof U]: U[P] extends Signal<infer R> ? R : never;
  };
  /** Wire to subscribe to */
  wire: Wire<X>;
  /** To check "if x is a subscription token" */
  $$: 1;
};

/** 3 bits: [RUNNING][SKIP_RUN_QUEUE][NEEDS_RUN] */
declare type WireStateFields = {
  S_RUNNING: 4,
  S_SKIP_RUN_QUEUE: 2,
  S_NEEDS_RUN: 1,
};
/** 3 bits: [RUNNING][SKIP_RUN_QUEUE][NEEDS_RUN] */
declare type WireState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
declare type X = any;

/**
 * Void subcription token. Used when a function demands a token but you don't
 * want to consent to any signal subscriptions. */
declare const v$: SubToken;

/**
 * Create a wire. Activate the wire by running it (function call). Any signals
 * that read-subscribed during the run will re-run the wire later when written
 * to. Wires can be run anytime manually. They're pausable and are resumed when
 * called; resuming will avoid a wire run if the wire is not stale. Wires are
 * named by their function's name and a counter. */
declare const createWire: <T>(fn: ($: SubToken) => T) => Wire<T>;

/**
 * Removes two-way subscriptions between its signals and itself. This also turns
 * off the wire until it is manually re-run. */
declare const wireReset: (wire: Wire<X>) => void;

/**
 * Pauses a wire so signal writes won't cause runs. Affects nested wires */
declare const wirePause: (wire: Wire<X>) => void;

/**
 * Resumes a paused wire. Affects nested wires but skips wires belonging to
 * computed-signals. Returns true if any runs were missed during the pause */
declare const wireResume: (wire: Wire<X>) => boolean;

/**
 * Creates signals for each object entry. Signals are read/write variables which
 * hold a list of subscribed wires. When a value is written those wires are
 * re-run. Writing a wire into a signal creates a lazy computed-signal. Signals
 * are named by the key of the object entry and a global counter. */
declare const createSignal: {
  <T>(obj: T): { [K in keyof T]: Signal<T[K] extends Wire<infer R> ? R : T[K]>; };
  anon: <T_1>(value: T_1, id?: string) => Signal<T_1>;
};
/**
 * Batch signal writes so only the last write per signal is applied. Values are
 * committed at the end of the function call. */
declare const transaction: <T>(fn: () => T) => T;

/**
 * Run a function within the context of a wire. Nested children wires are
 * adopted (see wire.lower). Also affects signal read consistency checks for
 * read-pass (signal.sigRP) and read-subscribe (signal.sigRS). */
declare const wireAdopt: <T>(wire: Wire<X> | undefined, fn: () => T) => void;

export {
  createSignal as signal,
  createWire as wire,
  wireReset,
  wirePause,
  wireResume,
  wireAdopt,
  transaction,
  v$
};
export type { Signal, Wire, WireState, WireStateFields, SubToken };
