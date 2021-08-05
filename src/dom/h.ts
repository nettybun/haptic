import { api } from './index.js';

import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from '../jsx';

type El = Element | Node | DocumentFragment;
type Tag = El | Component | [] | string;
type Component = (...args: unknown[]) => El | undefined;

function h(tag: Tag, props?: unknown, ...children: unknown[]): El | undefined
function h(tag: Tag, ...args: unknown[]): El | undefined {
  if (typeof tag === 'function') {
    return tag(...args);
  }
  let el: El, arg: unknown;
  if (typeof tag === 'string') {
    el = api.ns
      ? document.createElementNS(api.ns, tag)
      : document.createElement(tag);
  }
  else if (Array.isArray(tag)) {
    el = document.createDocumentFragment();
    // Using unshift(tag) is -1b gz smaller but is an extra loop iteration
    args.unshift(...tag);
  }
  // Hopefully Element, Node, DocumentFragment, but could be anything...
  else {
    el = tag;
  }
  while (args.length) {
    arg = args.shift();
    // eslint-disable-next-line eqeqeq
    if (arg == null) {}
    else if (typeof arg === 'string' || arg instanceof Node) {
      // Direct add fast path
      api.add(el, arg);
    }
    else if (Array.isArray(arg)) {
      args.unshift(...arg);
    }
    else if (typeof arg === 'object') {
      // eslint-disable-next-line no-implicit-coercion
      api.property(el, arg, null, !!api.ns);
    }
    else if (api.patch(arg)) {
      // Last parameter, endMark, is a Text('') node; see nodeAdd.js#Frag
      api.insert(el, arg, api.add(el, '') as Text);
    }
    else {
      // Default case, cast as string and add
      // eslint-disable-next-line no-implicit-coercion,@typescript-eslint/restrict-plus-operands
      api.add(el, '' + arg);
    }
  }
  return el;
}

export { h };
export type { Component, El, Tag };

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
