import { h } from '../index.js';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** Useful for switching content when `condition` contains a signals */
const when = <T extends string>(
  condition: () => T,
  views: { [k in T]?: Component }
): () => El => {
  const rendered: { [k in string]?: El } = {};
  return () => {
    const cond = condition();
    if (!rendered[cond] && views[cond])
      // All when() content is wrapped in a component to support sinuous-trace
      // which requires mount points to maintain records of their children
      rendered[cond] = h(views[cond] as Component);
    return rendered[cond];
  };
};

export { when };
