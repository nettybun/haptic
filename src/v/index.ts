// Vocal

// Reactivity engine for Haptic. Replaces the previous haptic/s implementation
// of an "observer pattern" and addresses many of the pitfalls of writing
// reactive code. There's a lot more code here but after a lot of golfing it's
// only slightly larger min+gzipped at 682 bytes over the previous 548 bytes.

// In haptic/s, like Sinuous/S.js, subscriptions are created implicitly when a
// signal is read. You needed to know ahead of time if a function was safe to
// call inside a computed() or if it needed sample() to avoid an accidental
// subscription. This meant it was too easy setup signals in an infinite loop,
// which is hard to debug since the browser locks up. If an error was thrown in
// a computed then system state was invalid and future computeds could be wrong.
// Everything is emitted as an anonymous function, which makes it harder to
// debugging who's calling who. Lastly, it's conceptually confusing for people
// to differentiate between signals, computeds, and subscriptions.

// Subscriptions are explicit in haptic/v. Reading a value as `v.userCount()` is
// passive (pass-read; pr) while subscribing (sub-read; sr) uses a unique "$"
// token as `v.userCount($)`. This token is created when defining a reaction. It
// follows that nested functions are explicit too since $ needs to be given as a
// parameter. To help consistency, sr/pr reads can't be mixed for a value in a
// reaction. Fixing other issues: code is run in try/catch blocks to keep the
// system recoverable; there's only values and reactions, which are unambiguous
// since reactions can't store data but values can.

// There's the usual support for transactions and for re-parenting nested
// reactions (called `adopt` instead of `root`).

// New features: Reactions can pause without undoing subscriptions; which is
// useful to efficiently skip DOM updates for any elements that are off-screen.
// There's a push to help inspecting/debugging: All values and reactions have a
// good Function.name (which includes a counter) to ID them. This is used in
// error messages. Reactions are implemented as state machines so they can't
// loop; they're stored in a global Set<Rx> registry; and they track how many
// times they've ran.

/* eslint-disable no-multi-spaces */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type X = any;
type Obj = { [k: string]: unknown };
type ObjVocal<T extends Obj> = { [P in keyof T]: Vocal<T[P]>; }

type RxState =
  | typeof STATE_ON
  | typeof STATE_RUNNING
  | typeof STATE_PAUSED
  | typeof STATE_PAUSED_STALE
  | typeof STATE_OFF;

type Rx = {
  (): undefined;
  // This *can* return something which is useful for monkey-patching the
  // reaction after its been created
  fn: ($: SubToken) => unknown;
  sr: Set<Vocal<X>>;
  pr: Set<Vocal<X>>;
  inner: Set<Rx>;
  runs: number;
  depth: number;
  state: RxState;
}

// Symbol doesn't gzip well. Only used as a WeakMap key
// Using Array<Vocal<T>> doesn't work
type SubToken = <T, X extends Array<() => T>>(...args: X) => UnpackVocalArrayType<X>;
type UnpackVocalArrayType<T> = { [P in keyof T]: T[P] extends Vocal<infer U> ? U : never };

type Vocal<T> = {
  (): T;
  ($: SubToken): T;
  (value: T): void;
  rx: Set<Rx>;
  // This property doesn't exist some of the time
  next?: T;
}

let vocalId = 0;
let reactionId = 0;

// Current reaction
let rxActive: Rx | undefined;
// Vocals written to during a transaction(() => {...})
let transactionBatch: Set<Vocal<X>> | undefined;

// Registry is a Set, not WeakSet, because it should be iterable
const rxRegistry = new Set<Rx>();
const rxTokenMap = new WeakMap<SubToken, Rx>();

// Symbol() doesn't gzip well. `[] as const` gzips best at 1479 but isn't
// debuggable without a lookup Map<> and other hacks. This is 1481.
const STATE_OFF          = 0;
const STATE_ON           = 1;
const STATE_RUNNING      = 2;
const STATE_PAUSED       = 3;
const STATE_PAUSED_STALE = 4;

const rxCreate = (fn: ($: SubToken) => unknown): Rx => {
  const id = `rx#${reactionId++}(${fn.name})`;
  // @ts-ignore sr,pr,inner,state are setup by _rxUnsubscribe() below
  const rx: Rx = { [id]() { _rxRun(rx); } }[id];
  rx.fn = fn;
  rx.runs = 0;
  rx.depth = rxActive ? rxActive.depth + 1 : 0;
  rxRegistry.add(rx);
  if (rxActive) rxActive.inner.add(rx);
  rxUnsubscribe(rx);
  return rx;
};

const _rxRun = (rx: Rx): void => {
  if (rx.state === STATE_RUNNING) {
    throw new Error(`Loop ${rx.name}`);
  }
  // If STATE_PAUSED then STATE_PAUSED_STALE was never reached; nothing has
  // changed. Restore state (below) and call inner reactions so they can check
  if (rx.state === STATE_PAUSED) {
    rx.inner.forEach(_rxRun);
  } else {
    // Symmetrically remove all connections from rx/vocals. This is "automatic
    // memory management" in Sinuous/S.js
    rxUnsubscribe(rx);
    rx.state = STATE_RUNNING;
    // @ts-ignore It's not happy with this but the typing is correct
    const $: SubToken = ((...vocals) => vocals.map(v => v($)));
    // Token is set but never deleted since it's a WeakMap
    rxTokenMap.set($, rx);
    adopt(rx, () => rx.fn($));
    rx.runs++;
  }
  rx.state = rx.sr.size
    ? STATE_ON
    : STATE_OFF;
};

const rxUnsubscribe = (rx: Rx): void => {
  rx.state = STATE_OFF;
  // This is skipped for newly created reactions
  if (rx.runs) {
    // These are only defined once the reaction has been setup and run before
    rx.inner.forEach(rxUnsubscribe);
    rx.sr.forEach(v => v.rx.delete(rx));
  }
  rx.sr = new Set();
  rx.pr = new Set();
  rx.inner = new Set();
};

const rxPause = (rx: Rx) => {
  rx.state = STATE_PAUSED;
  rx.inner.forEach(rxPause);
};

const vocalsCreate = <T extends Obj>(o: T): ObjVocal<T> => {
  type V = T[keyof T];
  Object.keys(o).forEach(k => {
    let saved = o[k];
    let $rx: Rx | undefined;
    // This preserves the function name, which is important for debugging
    // Excuse the awkward wrapper and indentation hack
    const id = `vocal#${vocalId++}(${k})`;
    const vocal = { [id](...args: (V | SubToken)[]) {
      // Case: Pass-Read
      if (!args.length) {
        if (rxActive) {
          if (rxActive.sr.has(vocal)) {
            throw new Error(`Mixed sr/pr ${vocal.name}`);
          }
          rxActive.pr.add(vocal);
        }
        return saved;
      }
      // Case: Sub-Read; arbitrary reaction not necessarily rxActive
      // eslint-disable-next-line no-cond-assign
      if ($rx = rxTokenMap.get(args[0] as SubToken)) {
        if ($rx.pr.has(vocal)) {
          throw new Error(`Mixed pr/sr ${vocal.name}`);
        }
        $rx.sr.add(vocal);
        vocal.rx.add($rx);
        return saved;
      }
      // Case: Transaction (is V)
      if (transactionBatch) {
        transactionBatch.add(vocal);
        vocal.next = args[0] as V;
        // Don't write/save. Defer until the transaction commit
        return;
      }
      // Case: Write (is V)
      saved = args[0] as V;
      // Create a copy of vocal.rx since it can be written to by calling _rxRun
      // which leads to an infinite loop. Calls are ordered by depth, so I need
      // an array; Sinuous uses a Set() for this
      const toRun = [...vocal.rx].sort((a, b) => a.depth - b.depth);
      // Ordered by parent->child
      toRun.forEach(rx => {
        if (rx.state === STATE_PAUSED) rx.state = STATE_PAUSED_STALE;
        else if (rx.state === STATE_ON) _rxRun(rx);
      });
      // Vocals don't return the value on write, unlike Sinuous/S.js
    } }[id] as Vocal<V>;
    vocal.rx = new Set<Rx>();
    // @ts-ignore
    o[k] = vocal;
  });
  return o as ObjVocal<T>;
};

const transaction = <T>(fn: () => T): T => {
  const prev = transactionBatch;
  transactionBatch = new Set();
  let error: unknown;
  let value: unknown;
  try {
    value = fn();
  } catch (err) {
    error = err;
  }
  const vocals = transactionBatch;
  transactionBatch = prev;
  if (error) throw error;
  vocals.forEach(v => {
    v(v.next);
    delete v.next;
  });
  return value as T;
};

const adopt = <T>(rxParent: Rx, fn: () => T): T => {
  const prev = rxActive;
  rxActive = rxParent;
  let error: unknown;
  let value: unknown;
  try {
    value = fn();
  } catch (err) {
    error = err;
  }
  rxActive = prev;
  if (error) throw error;
  return value as T;
};

export {
  rxRegistry,
  rxCreate as rx,
  rxUnsubscribe,
  rxPause,
  vocalsCreate as vocals,
  transaction,
  adopt
};
export type { Rx, Vocal, SubToken };
