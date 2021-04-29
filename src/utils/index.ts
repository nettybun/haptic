import { h, api } from '../dom';
import { subscriber, subAdopt, subPause } from '../wire';

import type { WireSubscriber } from '../wire';

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

/** Switches DOM content when signals in the given reactor are written to */
const when = <T extends string>(
  sub: WireSubscriber<T>,
  views: { [k in T]?: Component }
): WireSubscriber<El | undefined> => {
  const renderedElements = {} as { [k in T]?: El };
  const renderedSubs = {} as { [k in T]?: WireSubscriber<void> };
  let condActive: T;
  const { fn } = sub;
  // @ts-ignore It's not T anymore; the type has changed to `El | undefined`
  sub.fn = function when($) {
    const cond = fn($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactors and keep DOM intact
      if (condActive) subPause(renderedSubs[condActive] as WireSubscriber);
      condActive = cond;
      // Rendered?
      if (renderedElements[cond]) {
        // Then unpause. If nothing has changed then no sub.rS/sub.rP links change
        (renderedSubs[cond] as WireSubscriber)();
      }
      // Able to render?
      const sub = subscriber(() => {});
      renderedElements[cond] = subAdopt(sub, () => h(views[cond] as Component));
      renderedSubs[cond] = sub;
    }
    return renderedElements[cond] as El | undefined;
  };
  return sub as unknown as WireSubscriber<El | undefined>;
};

export { when, svg };
