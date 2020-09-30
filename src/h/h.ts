import { api } from './index.js';

type El = Element | Node | DocumentFragment | undefined
type Reviver = (tag?: string | [], props?: unknown, ...children: unknown[]) => El

/** Hyperscript reviver */
const h: Reviver = (...args: unknown[]) => {
  let el: El;
  const item = (arg: unknown) => {
    // @ts-expect-error Empty if body
    // eslint-disable-next-line eqeqeq
    if (arg == null);
    if (typeof arg === 'string') {
      if (el) {
        api.add(el, arg);
      } else {
        el = api.ns
          ? document.createElementNS(api.ns, arg)
          : document.createElement(arg);
      }
    }
    else if (Array.isArray(arg)) {
      // Support Fragments
      if (!el) el = document.createDocumentFragment();
      arg.forEach(item);
    }
    else if (arg instanceof Node) {
      if (el) {
        api.add(el, arg);
      } else {
        // Support updates
        el = arg;
      }
    }
    else if (typeof arg === 'object') {
      // TODO: Bundle size...
      api.property(el as Node, arg, null, Boolean(api.ns));
    }
    else if (typeof arg === 'function') {
      if (el) {
        // See note in add.js#frag() - This is a Text('') node
        const endMark = api.add(el, '') as Text;
        api.insert(el, arg, endMark);
      } else {
        // Support components (unsafe)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        el = arg(...args.splice(1));
      }
    }
    else {
      // Default case, cast as string and add
      // TODO: Bundle size...
      api.add(el as Node, String(arg));
    }
  };
  args.forEach(item);
  return el;
};

export { h };
