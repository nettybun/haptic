// Haptic is a bundle of haptic/h that looks for haptic/v at runtime to use as
// the reactivity engine. You access haptic/v on its own:

// import { h } from 'haptic';
// import { vocals, rx } from 'haptic/v';

// This bundles 2 utilities, svg() and when(), and extends the JSX namespace to
// allow using Vocal and Rx types in JSX. Import haptic/h to use a vanilla JSX
// namespace or to use other reactivity libraries such as sinuous/observable,
// haptic/s, hyperactiv, or mobx

// The 'haptic' package as a bundle doesn't embed haptic/v, so code will only be
// loaded once despite having two import sites. This should work well for both
// bundlers and unbundled (ESM-only; Snowpack/UNPKG) workflows. It's important
// to only run one instance of haptic/v because reactivity depends on accessing
// some shared global state that is setup during import.

import { h, api } from './h';
import { rx, adopt } from './v';

import type { Rx, SubToken } from './v';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type El = Element | Node | DocumentFragment;
type Component = (...args: unknown[]) => El;

api.rxTest = (expr) => {
  // To be very explicit I'd do rxKnown.has(expr) but that's likely expensive
  return typeof expr === 'function' && 'id' in (expr as Rx);
};

// This can more easily be passed the element, attribute, endMark, etc.
api.rxHandler = (expr, updateCallback) => {
  const rx = expr as Rx;
  const prevFn = rx.fn;
  rx.id = `dom-${rx.id}`;
  rx.fn = $ => {
    // Extract the return value from the rx.fn and update the DOM with it
    const value = prevFn($);
    updateCallback(value);

    // const span = document.createElement('span');
    // span.style.border = '2px dashed red';
    // span.textContent = String(value);
    // updateCallback(span);
  };
  // console.log('Call rx', rx.id);
  // Reactions are lazy so call that value now! (and to init subscriptions!)
  rx();
};

/** Utility: Renders SVGs by setting h() to the SVG namespace */
const svg = <T extends () => Element>(closure: T): ReturnType<T> => {
  const prev = api.ns;
  api.ns = 'http://www.w3.org/2000/svg';
  const el = closure();
  api.ns = prev;
  return el as ReturnType<T>;
};

/** Utility: Switches content when the vocal in `condition` is updated */
const when = <T extends string>(
  condition: ($: SubToken) => T,
  views: { [k in T]?: Component }
): ($: SubToken) => El | undefined => {
  const renderedEl = {} as { [k in T]?: El };
  const renderedRx = {} as { [k in T]?: Rx };
  let condActive: T;
  return $ => {
    const cond = condition($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactions. Keep DOM intact.
      (renderedRx[condActive] as Rx).pause();
      condActive = cond;
      // Rendered?
      if (renderedEl[cond]) {
        // Then unpause. If nothing has changed then no sr/pr links change
        (renderedRx[cond] as Rx)();
      }
      // Able to render?
      const parent = rx(() => {});
      renderedEl[cond] = adopt(parent, () => h(views[cond] as Component));
      renderedRx[cond] = parent;
    }
    return renderedEl[cond];
  };
};

export { h, api, svg, when };

declare namespace h {
  export namespace JSX {
    type MaybeVocal<T> = T | ((s: SubToken) => T);
    type AllowVocal<Props> = { [K in keyof Props]: MaybeVocal<Props[K]> };

    type Element = HTMLElement | SVGElement | DocumentFragment;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    type DOMAttributes<Target extends EventTarget>
      = AllowVocal<GenericEventAttrs<Target>> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = AllowVocal<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeVocal<string>
            | { [key: string]: MaybeVocal<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowVocal<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
