/*
  eslint-disable
  @typescript-eslint/no-explicit-any,
  prefer-destructuring,
  no-multi-spaces
*/

type X = any;
type Fn = () => unknown;

type Rx = {
  (): undefined;
  // ID "rx-14-methodName" or "rx-10-"
  id: string;
  fn: <T>(s: SubscribeVocal<T>) => unknown;
  sr: Set<Vocal<X>>;
  pr: Set<Vocal<X>>;
  inner: Set<Rx>;
  runs: number;
  state:
    | typeof STATE_ON
    | typeof STATE_RUNNING
    | typeof STATE_PAUSED
    | typeof STATE_PAUSED_STALE
    | typeof STATE_OFF;
  pause: () => void;
  unsubscribe: () => void;
}

type Vocal<T> = {
  (): T;
  (value: T): void;
  // ID "rx-14-methodName" or "rx-10-"
  id: string;
  rx: Set<Rx>;
  // This property doesn't exist some of the time
  next?: T;
}

type SubscribeVocal<T> = (v: Vocal<T>) => T;

let vocalId = 0;
let reactionId = 0;

// Current reaction
let rxActive: Rx | undefined;
// Skip the read consistency check during s(vocal)
let sRead: boolean;
// Vocals written to during a transaction(() => {...})
let transactionBatch: Set<Vocal<X>> | undefined;

// Registry of reaction parents (and therefore all known reactions)
const rxTree = new WeakMap<Rx, Rx | undefined>();

// Unique value to compare with `===` since Symbol() doesn't gzip well
const STATE_ON           = [] as const;
const STATE_RUNNING      = [] as const;
const STATE_PAUSED       = [] as const;
const STATE_PAUSED_STALE = [] as const;
const STATE_OFF          = [] as const;

const rxCreate = (fn: Fn): Rx => {
  // Ignore needed since sr,pr,inner are setup by _rxUnsubscribe()
  // @ts-ignore
  const rx: Rx = () => _rxRun(rx);
  rx.id = `rx-${reactionId++}-${fn.name}`;
  rx.fn = fn;
  rx.runs = 0;
  rx.pause = () => _rxPause(rx);
  rx.unsubscribe = () => _rxUnsubscribe(rx);
  rxTree.set(rx, rxActive); // Maybe undefined; that's fine
  if (rxActive) rxActive.inner.add(rx);
  rx();
  return rx;
};

// This takes a meta object because honestly you shouldn't use it directly?
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
    // Define the subscription function, s(vocal), as a parameter to rx.fn()
    adopt(rx, () => rx.fn(vocal => {
      if (rx.pr.has(vocal)) {
        throw new Error(`Mixed pr/sr ${vocal.id}`);
      }
      // Symmetrically link. Use vocal.rx to throw if s() wasn't passed a vocal
      vocal.rx.add(rx);
      rx.sr.add(vocal);
      sRead = 1 as unknown as true;
      const value = vocal();
      sRead = 0 as unknown as false;
      return value;
    }));
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

const vocalsCreate = <T>(o: { [k:string]: T }): { [k:string]: Vocal<T> } => {
  Object.keys(o).forEach(k => {
    let saved = o[k];
    const vocal = ((...args: T[]) => {
      // Read
      if (!args.length) {
        if (rxActive && !sRead) {
          if (rxActive.sr.has(vocal)) {
            throw new Error(`Mixed sr/pr ${vocal.id}`);
          }
          rxActive.pr.add(vocal);
        }
        return saved;
      }
      // Write
      if (transactionBatch) {
        transactionBatch.add(vocal);
        // Bundle size: args[0] is smaller than destructing
        vocal.next = args[0];
        // Don't save
        return;
      }
      saved = args[0];
      // Duplicate the set else it's an infinite loop...
      const toRun = new Set(vocal.rx);
      toRun.forEach(rx => {
        // Calls are ordered by parent->child
        const rxParent = rxTree.get(rx);
        if (rxParent && toRun.has(rxParent)) {
          // Parent has unsubscribed/removed this rx (rx.state === STATE_OFF)
          rx = rxParent;
        }
        if (rx.state === STATE_PAUSED) {
          rx.state = STATE_PAUSED_STALE;
        } else {
          _rxRun(rx);
        }
      });
      // Boxes don't return the value on write, unlike Sinuous/S.js
    }) as Vocal<T>;
    vocal.id = `vocal-${vocalId++}-${k}`;
    vocal.rx = new Set<Rx>();
    (o as unknown as { [k:string]: Vocal<T> })[k] = vocal;
  });
  return (o as unknown as { [k:string]: Vocal<T> });
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

export { rxCreate as rx, vocalsCreate as vocals, transaction, adopt, rxTree };
// Types
export { Rx, Vocal, SubscribeVocal };
