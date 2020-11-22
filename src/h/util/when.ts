import { h, api } from '../index.js';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** For switching content when `condition` contains a signal/observer */
const when = <T extends string>(
  condition: () => T,
  views: { [k in T]?: Component }
): () => El => {
  const rendered: { [k in string]?: El } = {};
  let currentCond: string | undefined = undefined;
  return () => {
    const nextCond = condition();
    if (currentCond !== nextCond) {
      // TODO: Disable the subscriptions
      // Well... `capture` will have csNested of all those? Then set lazy = true
      // Retrieve all deep csNested though? How deep...
      currentCond = nextCond;
    }
    if (!rendered[nextCond] && views[nextCond]) {
      // sample() prevents signals in the component from linking to this when()
      // block; only condition() should be linked here. Without sample() there's
      // no visible DOM reactivity.

      // h() supports sinuous-trace which requires mountpoints to maintain
      // records of their children elements.
      rendered[nextCond] = api.sample(() => h(views[nextCond] as Component));
    }
    return rendered[nextCond];
  };
};

export { when };
