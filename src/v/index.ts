// Haptic Wire

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;
type O = { [k: string]: unknown };

// Reactors don't use their function's return value, but it's useful to monkey
// patch them after creation. Haptic does this for h()
type WireReactor<T = void> = {
  (): T;
  fn: ($: SubToken) => unknown;
  /** Sub-read values from last run */
  wVsr: Set<WireValue<X>>;
  /** Pass-read values from last run */
  wVpr: Set<WireValue<X>>;
  /** Inner/children reactors */
  wR: Set<WireReactor>;
  depth: number;
  runs: number;
  state: WireReactorStates;
};

type WireReactorStates =
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_PAUSED_STALE
  | typeof STATE_OFF;

type UnpackArrayWireValueTypes<T> = { [P in keyof T]: T[P] extends WireValue<infer U> ? U : never };
type SubToken = <T, X extends Array<() => T>>(...args: X) => UnpackArrayWireValueTypes<X>;

type WireValue<T> = {
  (): T;
  ($: SubToken): T;
  (value: T): void;
  /** Reactors subscribed to this value */
  wR: Set<WireReactor>;
  /** Uncommitted value set during a transaction() block */
  next?: T;
};

let wValueId = 0;
let wReactorId = 0;

// Currently running reactor
let reactorActive: WireReactor | undefined;
// WireValues written to during a transaction(() => {...})
let transactionBatch: Set<WireValue<X>> | undefined;

// Registry is a Set, not WeakSet, because it should be iterable
const reactorRegistry = new Set<WireReactor>();
const reactorTokenMap = new WeakMap<SubToken, WireReactor>();

// Symbol() doesn't gzip well. `[] as const` gzips best at 1479 but isn't
// debuggable without a lookup Map<> and other hacks. This is 1481.
const STATE_OFF          = 0;
const STATE_ON           = 1;
const STATE_RUNNING      = 2;
const STATE_PAUSED       = 3;
const STATE_PAUSED_STALE = 4;

// In wireValue and wireReactor `{ [id]() {} }[id]` preserves the function name
// which is useful for debugging

const wireReactor = (fn: ($: SubToken) => unknown): WireReactor => {
  const id = `wR#${wReactorId++}(${fn.name})`;
  // @ts-ignore sr,pr,inner,state are setup by reactorUnsubscribe() below
  const wR: WireReactor = { [id]() {
    if (wR.state === STATE_RUNNING) {
      throw new Error(`Loop ${wR.name}`);
    }
    // If STATE_PAUSED then STATE_PAUSED_STALE was never reached; nothing has
    // changed. Restore state (below) and call inner reactors so they can check
    if (wR.state === STATE_PAUSED) {
      wR.wR.forEach(reactor => reactor());
    } else {
      // Symmetrically remove all connections from wV/wR. Called "automatic
      // memory management" in Sinuous/S.js
      reactorUnsubscribe(wR);
      wR.state = STATE_RUNNING;
      // @ts-ignore It's not happy with this but the typing is correct
      const $: SubToken = ((...wV) => wV.map(sT => sT($)));
      // Token is set but never deleted since it's a WeakMap
      reactorTokenMap.set($, wR);
      adopt(wR, () => wR.fn($));
      wR.runs++;
    }
    wR.state = wR.wVsr.size
      ? STATE_ON
      : STATE_OFF;
  } }[id];
  wR.fn = fn;
  wR.runs = 0;
  wR.depth = reactorActive ? reactorActive.depth + 1 : 0;
  reactorRegistry.add(wR);
  if (reactorActive) reactorActive.wR.add(wR);
  reactorUnsubscribe(wR);
  return wR;
};

const reactorUnsubscribe = (wR: WireReactor): void => {
  wR.state = STATE_OFF;
  // Skip newly created reactors since inner/sr aren't yet defined
  if (wR.runs) {
    wR.wR.forEach(reactorUnsubscribe);
    wR.wVsr.forEach(sT => sT.wR.delete(wR));
  }
  wR.wVsr = new Set();
  wR.wVpr = new Set();
  wR.wR = new Set();
};

const reactorPause = (wR: WireReactor) => {
  wR.state = STATE_PAUSED;
  wR.wR.forEach(reactorPause);
};

const wireValues = <T extends O>(obj: T): { [K in keyof T]: WireValue<T[K]>; } => {
  type V = T[keyof T];
  Object.keys(obj).forEach(k => {
    let saved = obj[k];
    // Batch the identifier since key k will be unique
    const id = `wV#${wValueId}(${k})`;
    const wV = { [id](...args: (V | SubToken)[]) {
      // Case: Pass-Read
      if (!args.length) {
        if (reactorActive) {
          if (reactorActive.wVsr.has(wV)) {
            throw new Error(`Mixed sr/pr ${wV.name}`);
          }
          reactorActive.wVpr.add(wV);
        }
        return saved;
      }
      // Case: Sub-Read; could be any reactor not necessarily `reactorActive`
      let reactorFound: WireReactor | undefined;
      // eslint-disable-next-line no-cond-assign
      if (reactorFound = reactorTokenMap.get(args[0] as SubToken)) {
        if (reactorFound.wVpr.has(wV)) {
          throw new Error(`Mixed pr/sr ${wV.name}`);
        }
        reactorFound.wVsr.add(wV);
        wV.wR.add(reactorFound);
        return saved;
      }
      // Case: Transaction (is V)
      if (transactionBatch) {
        transactionBatch.add(wV);
        wV.next = args[0] as V;
        // Don't write/save. Defer until the transaction commit
        return;
      }
      // Case: Write (is V)
      saved = args[0] as V;
      // Create a copy of wV's reactors since the Set can be added to during the
      // call leading to an infinite loop. Also I need to order by depth which
      // needs an array, but in Sinuous they can use a Set()
      const toRun = [...wV.wR].sort((a, b) => a.depth - b.depth);
      // Ordered by parent->child
      toRun.forEach(wR => {
        if (wR.state === STATE_PAUSED) wR.state = STATE_PAUSED_STALE;
        else if (wR.state === STATE_ON) wR();
      });
      // Don't return the value on write, unlike Sinuous/S.js
    } }[id] as WireValue<V>;
    wV.wR = new Set<WireReactor>();
    // @ts-ignore
    obj[k] = wV;
  });
  wValueId++;
  return obj as { [K in keyof T]: WireValue<T[K]>; };
};

const transaction = <T>(fn: () => T): T => {
  const prev = transactionBatch;
  transactionBatch = new Set();
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  const values = transactionBatch;
  transactionBatch = prev;
  if (error) throw error;
  values.forEach(wV => {
    wV(wV.next);
    delete wV.next;
  });
  return ret as T;
};

const adopt = <T>(reactorParent: WireReactor, fn: () => T): T => {
  const prev = reactorActive;
  reactorActive = reactorParent;
  let error: unknown;
  let ret: unknown;
  try {
    ret = fn();
  } catch (err) {
    error = err;
  }
  reactorActive = prev;
  if (error) throw error;
  return ret as T;
};

export {
  wireValues,
  wireValues as wV,
  wireReactor,
  wireReactor as wR,
  reactorRegistry,
  reactorUnsubscribe,
  reactorPause,
  transaction,
  adopt
};
export type { WireValue, WireReactor, WireReactorStates, SubToken };
