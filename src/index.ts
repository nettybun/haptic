// Haptic is a bundle of haptic/h and haptic/w as the reactivity engine. You
// access haptic/w on its own:

// import { h } from 'haptic';
// import { wireSignals, wireReactor } from 'haptic/w';

// The bundle includes 2 utilities, svg() and when(), and extends the JSX
// namespace to allow using WireReactors. Use haptic/h directly to use a vanilla
// JSX namespace or to extend it for other reactive libraries such as
// sinuous/observable, haptic/s, hyperactiv, or mobx

// The 'haptic' package as a bundle doesn't embed haptic/w, so code will only be
// loaded once despite having two import sites. This should work well for both
// bundlers and unbundled (ESM-only; Snowpack/UNPKG) workflows. It's important
// to only run one instance of haptic/w because reactivity depends on accessing
// some shared global state that is setup during import.

import { h, api } from './h';
import { wR, adopt, reactorPause } from './w';

import type { WireSignal, WireReactor } from './w';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type El = Element | Node | DocumentFragment;
type Component = (...args: unknown[]) => El;

api.patchTest = (expr) => {
  // Perflink benchmark says using reactorRegistry's Set.has() would be ~20%
  // slower than Function#name's String.startsWith()
  return typeof expr === 'function' && expr.name.startsWith('wR#');
};

api.patchHandler = (expr, updateCallback) => {
  const prevFn = (expr as WireReactor).fn;
  (expr as WireReactor).fn = $ => updateCallback(prevFn($));
  (expr as WireReactor)();
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
  condition: WireSignal<T>,
  views: { [k in T]?: Component }
): WireReactor => {
  const renderedElements = {} as { [k in T]?: El };
  const renderedReactors = {} as { [k in T]?: WireReactor };
  let condActive: T;
  return wR($ => {
    const cond = condition($);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactors and keep DOM intact
      reactorPause(renderedReactors[condActive] as WireReactor);
      condActive = cond;
      // Rendered?
      if (renderedElements[cond]) {
        // Then unpause. If nothing has changed then no wVsr/wVpr links change
        (renderedReactors[cond] as WireReactor)();
      }
      // Able to render?
      const reactor = wR(() => {});
      renderedElements[cond] = adopt(reactor, () => h(views[cond] as Component));
      renderedReactors[cond] = reactor;
    }
    return renderedElements[cond];
  });
};

export { h, api, svg, when };

declare namespace h {
  export namespace JSX {
    type MaybeReactor<T> = T | WireReactor<T>;
    type AllowReactorForProperties<T> = { [K in keyof T]: MaybeReactor<T[K]> };

    type Element = HTMLElement | SVGElement | DocumentFragment;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    // XXX: Reactors aren't available for "onXYZ" event handlers
    type DOMAttributes<Target extends EventTarget>
      = GenericEventAttrs<Target> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = AllowReactorForProperties<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeReactor<string>
            | { [key: string]: MaybeReactor<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowReactorForProperties<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
