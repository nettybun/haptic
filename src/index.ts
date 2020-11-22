// This bundle uses haptic/s as the observer implementation. Developers using
// the library can load both h and s by writing:

// import { h } from 'haptic';
// import { s, computed } from 'haptic/s';

// Since the haptic package doesn't embed haptic/s, code will only be loaded
// once despite having two import sites. This should work well for both bundlers
// and unbundled (ESM-only; Snowpack/UNPKG) workflows. Note that if haptic/h
// was imported instead, the JSX definitions wouldn't support haptic/s

import { subscribe, sample } from './s';
import { h, api, svg, when } from './h';

import type { Signal } from './s';
import type {
  GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements
} from './jsx';

api.subscribe = subscribe;
api.sample = sample;

export { h, api, svg, when };

declare namespace h {
  export namespace JSX {
    type MaybeSignal<T> = T | Signal<T>;
    type AllowSignal<Props> = { [K in keyof Props]: MaybeSignal<Props[K]> };

    type Element = HTMLElement | SVGElement | DocumentFragment;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    type DOMAttributes<Target extends EventTarget>
      = AllowSignal<GenericEventAttrs<Target>> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = AllowSignal<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeSignal<string>
            | { [key: string]: MaybeSignal<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowSignal<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
