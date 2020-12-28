import { h } from '../h/index.js';

import { rx, adopt } from '../v/index.js';
import type { Rx, VocalSubscriber } from '../v/index.js';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** For switching content when `condition` contains a signal/observer */
const when = <T extends string>(
  condition: (s: VocalSubscriber) => T,
  views: { [k in T]?: Component }
): (s: VocalSubscriber) => El => {
  const renderedEl = {} as { [k in T]: El };
  const renderedRx = {} as { [k in T]: Rx };
  let condActive: T;
  return s => {
    const cond = condition(s);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactions. Keep DOM intact.
      renderedRx[condActive].pause();
      condActive = cond;
      // Rendered?
      if (renderedEl[cond]) {
        // Then unpause. If nothing has changed then no sr/pr links change
        renderedRx[cond]();
      }
      // Able to render?
      const parent = rx(() => {});
      renderedEl[cond] = adopt(parent, () => h(views[cond]));
      renderedRx[cond] = parent;
    }
    return renderedEl[cond];
  };
};

export { when };
