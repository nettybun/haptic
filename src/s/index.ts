// Observer pattern
// https://en.wikipedia.org/wiki/Observer_pattern

// This implementation uses Subjects, Observers, and Updates following naming
// conventions of the architecture. Subjects maintain a list of Update functions
// for their Observers. Note that an Observer's only method is its Update call.
// These functions maintain a list of Subjects they depend on and a list of any
// nested Update calls that take part in their recalculation.

// This API exports two types of subjects. Subject<T> is read-write and updates
// only when written directly. ComputedSubject<T> is read-only and updates
// automatically when any of its defining Subjects or ComputedSubjects change.
// An Update function exists for each ComputedSubject.

/* eslint-disable @typescript-eslint/no-explicit-any */

type X = any
type Fn = () => unknown

type Base<T> = {
  (): T
  $o: 1
}

type Subject<T> = Base<T> & {
  (nextValue: T): T
  observers: Set<Update<X>>
  observersRan: Set<Update<X>> | undefined
  pending: T | []
}

type ComputedSubject<T> = Base<T> & {
  update: Update<T>
}

type Update<T> = {
  (): T
  stale: boolean
  subjects: Subject<X>[]
  children: Update<X>[]
}

const EMPTY_ARR: [] = [];

let runningUpdateFn: Update<X> | undefined;
let transactionQueue: Subject<X>[] | undefined;

function createSubject<T>(value: T): Subject<T> {
  const subject: Subject<T> = (...args: T[]) => {
    if (!args.length) {
      if (runningUpdateFn && !subject.observers.has(runningUpdateFn)) {
        subject.observers.add(runningUpdateFn);
        runningUpdateFn.subjects.push(subject);
      }
      return value;
    }

    const [nextValue] = args;

    if (transactionQueue) {
      if (subject.pending === EMPTY_ARR) {
        transactionQueue.push(subject);
      }
      subject.pending = nextValue;
      return nextValue;
    }

    value = nextValue;

    // Temporarily clear `runningUpdateFn` otherwise a update triggered by a
    // set in another update is marked as a listener
    const prevUpdateFn = runningUpdateFn;
    runningUpdateFn = undefined;

    // Update can alter subject.observers so make a copy before running
    subject.observersRan = new Set(subject.observers);
    subject.observersRan.forEach(c => { c.stale = true; });
    subject.observersRan.forEach(c => { if (c.stale) c(); });

    runningUpdateFn = prevUpdateFn;
    return value;
  };
  // Used in h/nodeProperty.ts
  subject.$o = 1 as const;
  subject.observers = new Set<Update<X>>();
  subject.observersRan = undefined;
  // The 'not set' value must be unique so `nullish` can be set in a transaction
  subject.pending = EMPTY_ARR;

  return subject;
}

function createComputedSubject<F extends Fn, T = ReturnType<F>>(fn: F): ComputedSubject<T> {
  let value: T;
  const update: Update<T> = () => {
    const prevUpdateFn = runningUpdateFn;
    if (runningUpdateFn) {
      runningUpdateFn.children.push(update);
    }
    const prevChildren = update.children;

    removeConnections(update);
    update.stale = false;
    runningUpdateFn = update;
    value = fn() as T;

    // If any children updates were removed mark them as fresh (not stale)
    // Check the diff of the children list between pre and post update
    prevChildren.forEach(c => {
      if (update.children.indexOf(c) === -1) {
        c.stale = false;
      }
    });

    // TODO: Remove this with a while/stack
    const getChildrenDeep = (children: Update<X>[]): Update<X>[] =>
      children.reduce(
        (acc, curr) => acc.concat(curr, getChildrenDeep(curr.children)),
        [] as Update<X>[]
      );
    // If any listeners were marked as fresh remove their subjects from the run lists
    const allChildren = getChildrenDeep(update.children);
    allChildren.forEach(child => {
      if (!child.stale) {
        child.subjects.forEach(subject => {
          subject.observersRan && subject.observersRan.delete(child);
        });
      }
    });
    runningUpdateFn = prevUpdateFn;
    return value;
  };
  update.stale = true;
  update.subjects = [];
  update.children = [];

  const computedSubject: ComputedSubject<T> = () => {
    if (!update.stale) {
      update.subjects.forEach(subject => { subject(); });
    } else {
      value = update();
    }
    return value;
  };
  // Used in h/nodeProperty.ts
  computedSubject.$o = 1 as const;
  computedSubject.update = update;
  (fn as F & { update: Update<X> }).update = update;

  // eslint-disable-next-line eqeqeq
  // if (runningUpdate == null) {
  //   console.warn('Update has no parent so it will never be disposed');
  // }

  resetUpdate(update);
  update();

  return computedSubject;
}

function subscribe<F extends Fn>(fn: F) {
  createComputedSubject(fn);
  return () => unsubscribe(fn as F & { update: Update<X> });
}

function unsubscribe<F extends Fn & { update: Update<X> }>(fn: F) {
  return removeConnections(fn.update);
}

function removeConnections(update: Update<X>) {
  update.children.forEach(removeConnections);

  update.subjects.forEach(subject => {
    subject.observers.delete(update);
    subject.observersRan && subject.observersRan.delete(update);
  });

  resetUpdate(update);
}

function resetUpdate(update: Update<X>) {
  // Keep track of which subjects trigger updates. Needed for unsubscribe.
  update.subjects = [];
  update.children = [];
}

function transaction<T>(fn: () => T): T {
  const prevQueue = transactionQueue;
  transactionQueue = [];
  const value = fn();
  const subjects = transactionQueue;
  transactionQueue = prevQueue;
  subjects.forEach(s => {
    if (s.pending !== EMPTY_ARR) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { pending } = s;
      s.pending = EMPTY_ARR;
      s(pending);
    }
  });
  return value;
}

function sample<T>(fn: () => T): T {
  const prevUpdateFn = runningUpdateFn;
  runningUpdateFn = undefined;
  const value = fn();
  runningUpdateFn = prevUpdateFn;
  return value;
}

function on(subjects: Subject<X>[], fn: Fn, options = { onlyChanges: true }) {
  subjects = ([] as Subject<X>[]).concat(subjects);
  return createComputedSubject(() => {
    subjects.forEach(subject => { subject(); });
    let value;
    if (!options.onlyChanges) value = sample(fn);
    options.onlyChanges = false;
    return value;
  });
}

// Types
export { Subject, ComputedSubject, Update };

export {
  createSubject as s,
  createSubject as subject,
  createComputedSubject as computed,
  subscribe,
  unsubscribe,
  transaction,
  sample,
  on
};
