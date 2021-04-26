import { h, api } from '../dom';
import { wR, adopt, reactorPause } from '../wire';

import type { WireSignal, WireReactor } from '../wire';

type El = Element | Node | DocumentFragment;
type Component = (...args: unknown[]) => El;

/** Renders SVGs by setting h() to the SVG namespace */
const svg = <T extends () => Node>(closure: T): ReturnType<T> => {
  const prev = api.ns;
  api.ns = 'http://www.w3.org/2000/svg';
  const el = closure();
  api.ns = prev;
  return el as ReturnType<T>;
};

/** Switches DOM content when the signal in `condition` is written to */
const when = <T extends string>(
  condition: WireSignal<T>,
  views: { [k in T]?: Component }
): WireReactor<El | undefined> => {
  const renderedElements = {} as { [k in T]?: El };
  const renderedReactors = {} as { [k in T]?: WireReactor<void> };
  let condActive: T;
  return wR(($) => {
    const cond = condition($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactors and keep DOM intact
      reactorPause(renderedReactors[condActive] as WireReactor);
      condActive = cond;
      // Rendered?
      if (renderedElements[cond]) {
        // Then unpause. If nothing has changed then no wR.rS/wR.rP links change
        (renderedReactors[cond] as WireReactor)();
      }
      // Able to render?
      const reactor = wR(() => {});
      renderedElements[cond] = adopt(reactor, () => h(views[cond] as Component));
      renderedReactors[cond] = reactor;
    }
    return renderedElements[cond];
  });
};

export { when, svg };
