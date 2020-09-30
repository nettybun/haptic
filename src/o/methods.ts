function root(fn) {
  const prevTracking = tracking;
  const rootUpdate = () => {};
  tracking = rootUpdate;
  resetUpdate(rootUpdate);
  const result = fn(() => {
    _unsubscribe(rootUpdate);
    tracking = undefined;
  });
  tracking = prevTracking;
  return result;
}

function transaction(fn) {
  let prevQueue = queue;
  queue = [];
  const result = fn();
  let q = queue;
  queue = prevQueue;
  q.forEach(data => {
    if (data._pending !== EMPTY_ARR) {
      const pending = data._pending;
      data._pending = EMPTY_ARR;
      data(pending);
    }
  });
  return result;
}

function sample(fn) {
  const prevTracking = tracking;
  tracking = undefined;
  const value = fn();
  tracking = prevTracking;
  return value;
}

// TODO: Fix signature
function on(obs, fn, seed, onchanges) {
  obs = [].concat(obs);
  return computed((value) => {
    obs.forEach((o) => o());

    let result = value;
    if (!onchanges) {
      result = sample(() => fn(value));
    }

    onchanges = false;
    return result;
  }, seed);
}
