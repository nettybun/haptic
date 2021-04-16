import { reactorRegistry } from '../src/w';

// TODO: Modify Haptic's patchHandler parameters to pass the element, attribute,
// endMark, etc? Sinuous does this. It would mean red-dashing all reactors would
// work for attributes/properties using an element popover

import type { api } from '../src';
import type { WireReactor, WireSignal } from '../src/w';

let snapshotId = 0;
let redrawNode: Node | undefined;
let redrawScheduled = false;

function regDebugRender(mountNode: Node) {
  redrawNode = mountNode;
  queueRedraw();
}

// TODO: insert.patch(el, value) and property.patch(el, prop, value)
const regDebugPatchHandler: typeof api.patchHandler = (expr, updateCallback) => {
  const reactor = expr as WireReactor;
  const prevFn = reactor.fn;
  // Extract the return value from the reactor.fn and update the DOM with it
  reactor.fn = ($) => {
    const value = prevFn($);
    // updateCallback(value);

    // TODO: This needs to not change layout at all (absolute positioning?)
    const span = document.createElement('span');
    span.style.border = '2px dashed red';
    span.textContent = String(value);
    updateCallback(span);
  };
  reactor.fn.toString = () => {
    return prevFn.name || prevFn.toString().replace(/\n\s+/g, ' ');
  };
  reactor();
};

const regDebugTrackSignalSubscriptions = (signals: WireSignal[]) => {
  signals.forEach((signal) => {
    console.log(`Tracking ${signal.name}`);
    const set = signal.rS;
    // Intercept the prototype functions...
    const addFn = set.add.bind(set);
    set.add = function(wR) {
      queueRedraw();
      return addFn(wR);
    };
    const deleteFn = set.delete.bind(set);
    set.delete = function(wR) {
      queueRedraw();
      return deleteFn(wR);
    };
  });
  return signals;
};

// TODO: Save each snapshot and use a JS diff tool to see the changes over time
function snapshotRegistry() {
  snapshotId++;
  const snapshot: Record<string, unknown> = {
    SNAPSHOT_ID: snapshotId,
  };
  reactorRegistry.forEach((reactor) => {
    snapshot[reactor.name] = {
      /* eslint-disable key-spacing */
      fn: reactor.fn.toString(),
      sRS: [...reactor.sRS].map((x) => x.name),
      sRP: [...reactor.sRP].map((x) => x.name),
      sXS: [...reactor.sXS].map((x) => x.name),
      inner: [...reactor.inner].map((x) => x.name),
      runs: reactor.runs,
      depth: reactor.depth,
      state: [
        'OFF',
        'ON',
        'RUNNING',
        'PAUSED',
        'STALE',
      ][reactor.state],
    };
  });
  return snapshot;
}

function queueRedraw() {
  if (!redrawNode) return;
  // Call rAF only once since rAFs stack
  if (!redrawScheduled) {
    redrawScheduled = true;
    window.requestAnimationFrame(() => {
      // TS BUG
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      redrawNode!.textContent = JSON.stringify(snapshotRegistry(), null, 4);
      redrawScheduled = false;
    });
  }
}

export {
  regDebugRender,
  regDebugPatchHandler,
  regDebugTrackSignalSubscriptions
};
