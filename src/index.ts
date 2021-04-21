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
import { wR, wS } from './w';

import type { WireSignal, WireReactor } from './w';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

api.patch = (expr, updateCallback) => {
  // @ts-ignore
  const $wR = (expr && expr.$wR) as boolean;
  const { fn } = expr as WireReactor;
  if ($wR && updateCallback) {
    (expr as WireReactor).fn = ($) => updateCallback(fn($));
    (expr as WireReactor)();
  }
  return $wR;
};

export { h, api, wS, wR };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistributeWireReactorType<T> = T extends any ? WireReactor<T> : never;

declare namespace h {
  export namespace JSX {
    type MaybeSomeReactor<T> = T | DistributeWireReactorType<T>;
    type AllowReactorForProperties<T> = { [K in keyof T]: MaybeSomeReactor<T[K]> };

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
      = AllowReactorForProperties<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeSomeReactor<string>
            | { [key: string]: MaybeSomeReactor<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowReactorForProperties<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
