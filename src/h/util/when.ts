import { h } from '../index.js';

import { rx, adopt } from '../../v/index.js';
import type { Rx, SubscribeVocal } from '../../v/index.js';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** For switching content when `condition` contains a signal/observer */
const when = <T extends string>(
  condition: (s: SubscribeVocal<unknown>) => T,
  views: { [k in T]?: Component }
): (s: SubscribeVocal<unknown>) => El => {
  const renderedEl = {} as { [k in T]: El };
  const renderedRx = {} as { [k in T]: Rx };
  let condActive: T;
  return s => {
    const cond = condition(s);
    if (cond === condActive) {
      return renderedEl[cond];
    }
    // Tick. Pause reactions. Keep DOM intact.
    renderedRx[condActive].pause();
    condActive = cond;
    // Rendered? Then Unpause. If nothing has changed then no sr/pr links change
    if (renderedEl[cond]) {
      renderedRx[cond]();
      return renderedEl[cond];
    }
    // Able to render?
    if (views[cond]) {
      const parent = rx(() => {});
      renderedEl[cond] = adopt(parent, () => h(views[cond]));
      renderedRx[cond] = parent;
      return renderedEl[cond];
    }
  };
};

export { when };
