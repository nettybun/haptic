// Vocal

// Reactivity engine for Haptic. This replaces haptic/s' "signal" implementation
// of the "observer pattern" and is now designed to remove some pitfalls of
// writing reactive code. There's a lot more code but after a lot of code golf
// it's only slightly larger min+gzipped at v: 680 bytes; s: 548 bytes.

// In haptic/s, like Sinuous/S.js, subscriptions are created implicitly when a
// signal is read. You needed to know ahead of time if a function was safe to
// call during a computed() or if a sample() wrapper will be needed to avoid
// accidental subscriptions. This meant it was too easy setup signals in an
// infinite loop; which is hard to debug since the browser locks up. If an error
// was thrown in a computed then system state was broken and future work calls
// were wrong. Lastly, it's confusing how to differentiate between signals,
// computeds, and subscriptions.

// TODO: Explicit how?
// In haptic/v, subscriptions are explicit via `s => s(...)`. Nested functions
// are then also explicit since they can only create subscriptions if they're
// passed an `s` as a parameter. Reactive code is run in try/catch blocks to
// keep the system recoverable. There's only values and reactions; they're
// also unambiguous since reactions can't store data but values can. You can't
// loop a reaction - it'll throw.

// There's the usual support for transactions and for re-parenting nested
// reactions (as `adopt` instead of `root`).

// New features: Reactions can pause without undoing subscriptions; which is
// useful to efficiently skip DOM updates for any elements that are off-screen.
// There's a push to help inspecting/debugging: (1) There's an ID on values and
// reactions, which is used error messages. (2) Reactions are stored in a global
// registry. (3) Reactions track how many times they've ran. (4) Reactions are
// implemented as state machines.

/* eslint-disable @typescript-eslint/no-explicit-any,prefer-destructuring,no-multi-spaces */

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
  // ID "rx-14-methodName" or "rx-10-"
  id: string;
  // This *can* return something which is useful for monkey-patching the
  // reaction after its been created
  fn: ($: SubToken) => unknown;
  sr: Set<Vocal<X>>;
  pr: Set<Vocal<X>>;
  inner: Set<Rx>;
  runs: number;
  depth: number;
  state: RxState;
  pause: () => void;
  unsubscribe: () => void;
}

// Symbol doesn't gzip well. Only used as a WeakMap key
type SubToken = [];

type Vocal<T> = {
  (): T;
  ($: SubToken): T;
  (value: T): void;
  // ID "v-14-methodName" or "v-10-"
  id: string;
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

// Registry of reactions
const rxKnown = new Set<Rx>();
const rxTokenMap = new WeakMap<SubToken, Rx>();

// Unique value to compare with `===` since Symbol() doesn't gzip well
const STATE_ON           = [] as const;
const STATE_RUNNING      = [] as const;
const STATE_PAUSED       = [] as const;
const STATE_PAUSED_STALE = [] as const;
const STATE_OFF          = [] as const;

// Tree-shaken: Not part of your bundle unless you import it for debugging
const rxStates = new Map<RxState, string>([
  [STATE_ON,           'STATE_ON'          ],
  [STATE_RUNNING,      'STATE_RUNNING'     ],
  [STATE_PAUSED,       'STATE_PAUSED'      ],
  [STATE_PAUSED_STALE, 'STATE_PAUSED_STALE'],
  [STATE_OFF,          'STATE_OFF'         ],
]);

const rxCreate = (fn: ($: SubToken) => unknown): Rx => {
  // @ts-ignore sr,pr,inner,state are setup by _rxUnsubscribe() below
  const rx: Rx = () => _rxRun(rx);
  rx.id = `rx-${reactionId++}-${(fn as Vocal<X>).id || fn.name}`;
  rx.fn = fn;
  rx.runs = 0;
  rx.depth = rxActive ? rxActive.depth + 1 : 0;
  rx.pause = () => _rxPause(rx);
  rx.unsubscribe = () => _rxUnsubscribe(rx);
  rxKnown.add(rx);
  if (rxActive) rxActive.inner.add(rx);
  _rxUnsubscribe(rx);
  return rx;
};

const _rxRun = (rx: Rx): void => {
  if (rx.state === STATE_RUNNING) {
    throw new Error(`Loop ${rx.id}`);
  }
  // If STATE_PAUSED then STATE_PAUSED_STALE was never reached; nothing has
  // changed. Restore state (below) and call inner reactions so they can check
  if (rx.state === STATE_PAUSED) {
    rx.inner.forEach(_rxRun);
  } else {
    // Symmetrically remove all connections from rx/vocals. This is "automatic
    // memory management" in Sinuous/S.js
    _rxUnsubscribe(rx);
    rx.state = STATE_RUNNING;
    const $: SubToken = [];
    // Token is set but never deleted since it's a WeakMap
    rxTokenMap.set($, rx);
    adopt(rx, () => rx.fn($));
    rx.runs++;
  }
  rx.state = rx.sr.size
    ? STATE_ON
    : STATE_OFF;
};

const _rxUnsubscribe = (rx: Rx): void => {
  rx.state = STATE_OFF;
  // This is skipped for newly created reactions
  if (rx.runs) {
    // These are only defined once the reaction has been setup and run before
    rx.inner.forEach(_rxUnsubscribe);
    rx.sr.forEach(v => v.rx.delete(rx));
  }
  rx.sr = new Set();
  rx.pr = new Set();
  rx.inner = new Set();
};

const _rxPause = (rx: Rx) => {
  rx.state = STATE_PAUSED;
  rx.inner.forEach(_rxPause);
};

const vocalsCreate = <T extends Obj, V = T[keyof T], R = ObjVocal<T>>(o: T): R =>
  Object.keys(o).reduce((res, k) => {
    let saved = o[k];
    // This preserves the function name, which is important for debugging
    // TODO: res[k] = { [`vocal-${vocalId++}-${k}`](...args) {}, ...? }
    res = {
      [k](...args: (V | SubToken)[]) {
        // @ts-ignore
        const vocal = res[k] as Vocal<V>;
        // Case: Pass-Read
        if (!args.length) {
          if (rxActive) {
            if (rxActive.sr.has(vocal)) {
              throw new Error(`Mixed sr/pr ${vocal.id}`);
            }
            rxActive.pr.add(vocal);
          }
          return saved;
        }
        // Case: Sub-Read; arbitrary reaction not necessarily rxActive
        let $rx: Rx | undefined;
        // eslint-disable-next-line no-cond-assign
        if ($rx = rxTokenMap.get(args[0] as SubToken)) {
          if ($rx.pr.has(vocal)) {
            throw new Error(`Mixed pr/sr ${vocal.id}`);
          }
          $rx.sr.add(vocal);
          vocal.rx.add($rx);
          return saved;
        }
        // Case: Transaction (is V)
        if (transactionBatch) {
          transactionBatch.add(vocal);
          vocal.next = args[0] as V;
          // Don't write. Defer until the transaction commit
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
      },
      ...res,
    };
    // @ts-ignore
    (res[k] as Vocal<V>).id = `vocal-${vocalId++}-${k}`;
    // @ts-ignore
    (res[k] as Vocal<V>).rx = new Set<Rx>();
    return res;
  }, {} as R);

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

export { rxCreate as rx, vocalsCreate as vocals, transaction, adopt, rxKnown, rxStates };
export type { Rx, Vocal, SubToken };
