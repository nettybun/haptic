import { h, api } from '../index.js';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** For switching content when `condition` contains a signal/observer */
const when = <T extends string>(
  condition: () => T,
  views: { [k in T]?: Component }
): () => El => {
  const rendered: { [k in string]?: El } = {};
  return () => {
    const cond = condition();
    if (!rendered[cond] && views[cond]) {
      // sample() prevents signals in the component from linking to this when()
      // block; only condition() should be linked here. Without sample() there's
      // no visible DOM reactivity.

      // h() supports sinuous-trace which requires mountpoints to maintain
      // records of their children elements.
      rendered[cond] = api.sample(() => h(views[cond] as Component));
    }
    return rendered[cond];
  };
};

export { when };
