import { h } from 'haptic/dom';
import { wire, wireAdopt, wirePause, wireResume } from 'haptic/state';

import type { Wire, SubToken } from 'haptic/state';
import type { El } from 'haptic/dom';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/** Switches DOM content when signals of the condition wire are written to */
const when = <T extends string>(
  conditionWire: Wire<T>,
  views: { [k in T]?: Component }
): Wire<El | undefined> => {
  const activeEls = {} as { [k in T]?: El };
  const activeWires = {} as { [k in T]?: Wire<void> };
  let condRendered: T;
  conditionWire.tasks.add((cond) => {
    // XXX: I can't believe this has been broken for 8 months...
    // https://github.com/heyheyhello/haptic/commit/45f1563d2c88933e6042c8495163cdf986e79817
    if (cond === condRendered) return activeEls[cond];
    condRendered = cond;
    // Else, content is changing. Pause the current wires. Keep the DOM.
    if (activeWires[condRendered]) {
      wirePause(activeWires[condRendered]!);
    }
    // Have we rendered this new cond before? Then unpause the wire
    if (activeEls[cond]) {
      // Is it stale? Then run the wire
      if (wireResume(activeWires[cond]!)) {
        activeWires[cond]!();
      }
    } else {
      // Render the DOM tree from scratch and capture all nested wires
      const wireRoot = wire(() => {});
      wireAdopt(wireRoot, () => activeEls[cond] = h(views[cond] as Component));
      activeWires[cond] = wireRoot;
    }
    // TODO: BREAKING. Need to define a new wire and return that to get patched
    // by api.patch... I broke chaining (on purpose).
    return activeEls[cond];
  });
  return conditionWire as unknown as Wire<El | undefined>;
};

export { when };
