// Haptic is a bundle of haptic/dom and haptic/wire as the reactivity engine.
// You access haptic/wire on its own:

// import { h } from 'haptic';
// import { wireSignals, wireReactor } from 'haptic/wire';

// The 'haptic' package doesn't embed haptic/wire in the bundle, so code is only
// loaded once despite having two import sites. This should work well for both
// bundlers and unbundled ESM-only/Snowpack/UNPKG workflows. It's important to
// only run one instance of haptic/wire because reactivity depends on accessing
// some shared global state that is setup during import.

// This bundle also extends the JSX namespace to allow using WireReactors. Use
// haptic/dom directly to use a vanilla JSX namespace or to extend it for other
// reactive libraries such as sinuous/observable, haptic/s, hyperactiv, etc.

// Utilities functions svg() and when() are available in haptic/extras.

import { h, api } from './dom';
// TODO: Actually split the import sites. This is only for `npm run size:bundle`
import { signalObject, sub } from './wire';

import type { WireSubscriber } from './wire';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

// Swap out h to have the correct JSX namespace; commit #d7cd2819
// declare api = Omit<typeof _api, 'h'> & { h: typeof h };

api.patch = (value, patchDOM) => {
  // @ts-ignore
  const $wR = (value && value.$wR) as boolean;
  const { fn } = value as WireSubscriber;
  if ($wR && patchDOM) {
    (value as WireSubscriber).fn = ($) => patchDOM(fn($));
    (value as WireSubscriber)();
  }
  return $wR;
};

export { h, api, signalObject, sub };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistributeSubscriberT<T> = T extends any ? WireSubscriber<T> : never;

declare namespace h {
  export namespace JSX {
    type MaybeSub<T> = T | DistributeSubscriberT<T>;
    type AllowSubForProperties<T> = { [K in keyof T]: MaybeSub<T[K]> };

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
      = AllowSubForProperties<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeSub<string>
            | { [key: string]: MaybeSub<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowSubForProperties<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
