import { h, api } from '../dom';
import { core, coreAdopt, corePause } from '../wire';

import type { WireCore } from '../wire';

type El = Element | Node | DocumentFragment;
type Component = (...args: unknown[]) => El;


/** Switches DOM content when signals in the given core are written to */
const when = <T extends string>(
  wC: WireCore<T>,
  views: { [k in T]?: Component }
): WireCore<El | undefined> => {
  const liveElements = {} as { [k in T]?: El };
  const liveCores = {} as { [k in T]?: WireCore<void> };
  let condActive: T;
  const { fn } = wC;
  // @ts-ignore It's not T anymore; the type has changed to `El | undefined`
  wC.fn = function when($) {
    const cond = fn($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause cores and keep DOM intact
      if (condActive) corePause(liveCores[condActive] as WireCore);
      condActive = cond;
      // Rendered/Live?
      if (liveElements[cond]) {
        // Then unpause. If nothing changed then no core.sS/core.sP links change
        (liveCores[cond] as WireCore)();
      }
      // Able to render this DOM tree?
      const coreForTree = core(() => {});
      liveElements[cond] = coreAdopt(coreForTree, () => h(views[cond] as Component));
      liveCores[cond] = coreForTree;
    }
    return liveElements[cond] as El | undefined;
  };
  return wC as unknown as WireCore<El | undefined>;
};

export { when };
