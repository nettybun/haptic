const EMPTY_ARR: [] = [];
// TODO: This is an update() function?
let tracking;
// TODO: This is a transaction queue? Of data() functions?
let queue;

function observable(value) {
  function data(nextValue) {
    if (arguments.length === 0) {
      if (tracking && !data._observers.has(tracking)) {
        data._observers.add(tracking);
        tracking._observables.push(data);
      }
      return value;
    }

    if (queue) {
      if (data._pending === EMPTY_ARR) {
        queue.push(data);
      }
      data._pending = nextValue;
      return nextValue;
    }

    value = nextValue;

    // Clear `tracking` otherwise a computed triggered by a set
    // in another computed is seen as a child of that other computed.
    const clearedUpdate = tracking;
    tracking = undefined;

    // Update can alter data._observers, make a copy before running.
    data._runObservers = new Set(data._observers);
    data._runObservers.forEach(observer => {
      observer._fresh = false;
      observer();
    });

    tracking = clearedUpdate;
    return value;
  }

  // Tiny indicator that this is an observable function.
  // Used in sinuous/h/src/property.js
  data.$o = 1;
  data._observers = new Set();
  // The 'not set' value must be unique, so `nullish` can be set in a transaction.
  data._pending = EMPTY_ARR;

  return data;
}

function computed(observer, value) {
  observer._update = update;

  if (tracking == null) {
    console.warn("Computeds has no parent so it will never be disposed");
  }

  resetUpdate(update);
  update();

  function update() {
    const prevTracking = tracking;
    if (tracking) {
      tracking._children.push(update);
    }

    const prevChildren = update._children;

    unsubscribe(update);
    update._fresh = true;
    tracking = update;
    value = observer(value);

    // If any children computations were removed mark them as fresh.
    // Check the diff of the children list between pre and post update.
    prevChildren.forEach(u => {
      if (update._children.indexOf(u) === -1) {
        u._fresh = true;
      }
    });

    // TODO: Remove this
    function getChildrenDeep(children) {
      return children.reduce(
        (res, curr) => res.concat(curr, getChildrenDeep(curr._children)),
        []
      );
    }
    // If any children were marked as fresh remove them from the run lists.
    const allChildren = getChildrenDeep(update._children);
    allChildren.forEach(u => {
      if (u._fresh) {
        u._observables.forEach(o => {
          if (o._runObservers) {
            o._runObservers.delete(u);
          }
        });
      }
    });

    tracking = prevTracking;
    return value;
  }

  // Tiny indicator that this is an observable function.
  // Used in sinuous/h/src/property.js
  data.$o = 1;

  function data() {
    if (update._fresh) {
      update._observables.forEach(o => o());
    } else {
      value = update();
    }
    return value;
  }

  return data;
}


function subscribe(observer) {
  computed(observer);
  return () => unsubscribe(observer._update);
}

function unsubscribe(update) {
  update._children.forEach(unsubscribe);
  update._observables.forEach(o => {
    o._observers.delete(update);
    if (o._runObservers) {
      o._runObservers.delete(update);
    }
  });
  resetUpdate(update);
}

function resetUpdate(update) {
  // Keep track of which observables trigger updates. Needed for unsubscribe.
  update._observables = [];
  update._children = [];
}

export { observable, observable as o, computed, subscribe };
