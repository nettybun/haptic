import { h } from '../dom/index.js';
// TODO: Renaming in phases
import { core as wire, coreAdopt as wireAdopt, corePause as wirePause } from '../wire/index.js';

// TODO: Renaming in phases
import type { WireCore as Wire } from '../wire/index.js';

type El = Element | Node | DocumentFragment;
type Component = (...args: unknown[]) => El;

/** Switches DOM content when signals of the condition wire are written to */
const when = <T extends string>(
  conditionWire: Wire<T>,
  views: { [k in T]?: Component }
): Wire<El | undefined> => {
  const activeEls = {} as { [k in T]?: El };
  const activeWires = {} as { [k in T]?: Wire<void> };
  let condActive: T;
  const { fn } = conditionWire;
  // @ts-ignore It's not T anymore; the type has changed to `El | undefined`
  conditionWire.fn = function when($) {
    const cond = fn($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause wires and keep DOM intact
      if (condActive) wirePause(activeWires[condActive] as Wire);
      condActive = cond;
      // Rendered/Active?
      if (activeEls[cond]) {
        // Then unpause. If no signals updated when paused the wire does nothing
        (activeWires[cond] as Wire)();
      }
      // Able to render this DOM tree?
      const wireRoot = wire(() => {});
      activeEls[cond] = wireAdopt(wireRoot, () => h(views[cond] as Component));
      activeWires[cond] = wireRoot;
    }
    return activeEls[cond];
  };
  return conditionWire as unknown as Wire<El | undefined>;
};

export { when };
