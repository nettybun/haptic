import { api } from './index.js';

import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from '../jsx';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

function h(tag?: string | [] | Component, props?: unknown, ...children: unknown[]): El
function h(...args: unknown[]): El {
  let el: El;
  const item = (arg: unknown) => {
    // @ts-expect-error Empty if body
    // eslint-disable-next-line eqeqeq
    if (arg == null);
    else if (typeof arg === 'string') {
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
      // eslint-disable-next-line no-implicit-coercion
      api.property(el as Node, arg, null, !!api.ns);
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
      // eslint-disable-next-line no-implicit-coercion,@typescript-eslint/restrict-plus-operands
      api.add(el as Node, '' + arg);
    }
  };
  args.forEach(item);
  return el;
}

export { h };

// JSX namespace must be bound into a function() next to its definition
declare namespace h {
  export namespace JSX {
    type Element = HTMLElement | SVGElement | DocumentFragment;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    type DOMAttributes<Target extends EventTarget>
      = GenericEventAttrs<Target> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = HTMLAttrs & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = SVGAttrs & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
