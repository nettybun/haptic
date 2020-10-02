/* eslint-disable @typescript-eslint/no-explicit-any */

type X = any
type Fn = () => unknown

type ReadonlySocket<T> = {
  (): T
  $o: 1
}

type Socket<T> = ReadonlySocket<T> & {
  (nextValue: T): T
  _computeds: Set<Computed<X>>
  _computedsLive: Set<Computed<X>> | undefined
  _pending: T | []
}

type ComputedSocket<T> = ReadonlySocket<T> & {
  _computer: Computed<T>
}

type Computed<T> = { // <T extends () => unknown> = T & {
  (): T
  _stale: boolean
  _listeningTo: Socket<X>[]
  _children: Computed<X>[]
}

const EMPTY_ARR: [] = [];

let runningComputed: Computed<X> | undefined;
let transactionSocketQueue: Socket<X>[] | undefined;

function createSocket<T>(value: T): Socket<T> {
  const socket: Socket<T> = (...args: T[]) => {
    if (args.length === 0) {
      if (runningComputed && !socket._computeds.has(runningComputed)) {
        socket._computeds.add(runningComputed);
        runningComputed._listeningTo.push(socket);
      }
      return value;
    }

    const [nextValue] = args;

    if (transactionSocketQueue) {
      if (socket._pending === EMPTY_ARR) {
        transactionSocketQueue.push(socket);
      }
      socket._pending = nextValue;
      return nextValue;
    }

    value = nextValue;

    // Temporarily clear `runningComputed` otherwise a computed triggered by a
    // set in another computed is marked as a listener
    const prevComputed = runningComputed;
    runningComputed = undefined;

    // Update can alter socket._computeds so make a copy before running
    socket._computedsLive = new Set(socket._computeds);
    socket._computedsLive.forEach(c => { c._stale = false; });
    socket._computedsLive.forEach(c => { c(); });

    runningComputed = prevComputed;
    return value;
  };
  // Used in h/nodeProperty.ts
  socket.$o = 1 as const;
  socket._computeds = new Set<Computed<X>>();
  socket._computedsLive = undefined;
  // The 'not set' value must be unique so `nullish` can be set in a transaction
  socket._pending = EMPTY_ARR;

  return socket;
}

function createComputedSocket<F extends Fn, T = ReturnType<F>>(observer: F): ComputedSocket<T> {
  let value: T;
  const computed: Computed<T> = () => {
    const prevRunning = runningComputed;
    if (runningComputed) {
      runningComputed._children.push(computed);
    }
    const prevChildren = computed._children;

    unsubscribe(computed);
    computed._stale = false;
    runningComputed = computed;
    value = observer() as T;

    // If any children computations were removed mark them as fresh (not stale)
    // Check the diff of the children list between pre and post update
    prevChildren.forEach(u => {
      if (computed._children.indexOf(u) === -1) {
        u._stale = false;
      }
    });

    // TODO: Remove this with a while/stack
    const getChildrenDeep = (children: Computed<X>[]): Computed<X>[] =>
      children.reduce(
        (acc, curr) => acc.concat(curr, getChildrenDeep(curr._children)),
        [] as Computed<X>[]
      );
    // If any listeners were marked as fresh remove their sockets from the run lists
    const allChildren = getChildrenDeep(computed._children);
    allChildren.forEach(child => {
      if (!child._stale) {
        child._listeningTo.forEach(socket => {
          socket._computedsLive && socket._computedsLive.delete(child);
        });
      }
    });
    runningComputed = prevRunning;
    return value;
  };
  computed._stale = true;
  computed._listeningTo = [];
  computed._children = [];

  const computedSocket: ComputedSocket<T> = () => {
    if (computed._stale) {
      computed._listeningTo.forEach(socket => { socket(); });
    } else {
      value = computed();
    }
    return value;
  };
  // Used in h/nodeProperty.ts
  computedSocket.$o = 1 as const;
  computedSocket._computer = computed;
  (observer as F & { _computer: Computed<X> })._computer = computed;

  // eslint-disable-next-line eqeqeq
  if (runningComputed == null) {
    console.warn('Computed has no parent so it will never be disposed');
  }

  resetComputed(computed);
  computed();

  return computedSocket;
}

function subscribe<F extends Fn>(observer: F) {
  const { _computer } = createComputedSocket(observer);
  return () => unsubscribe(_computer);
}

function unsubscribe(computed: Computed<X>) {
  computed._children.forEach(unsubscribe);

  computed._listeningTo.forEach(socket => {
    socket._computeds.delete(computed);
    socket._computedsLive && socket._computedsLive.delete(computed);
  });

  resetComputed(computed);
}

function resetComputed(computed: Computed<X>) {
  // Keep track of which sockets trigger updates. Needed for unsubscribe.
  computed._listeningTo = [];
  computed._children = [];
}

export {
  createSocket as socket,
  createSocket as s,
  createComputedSocket as computed,
  subscribe,
  unsubscribe
};
