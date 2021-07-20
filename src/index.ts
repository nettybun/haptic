// Haptic is a bundle of haptic/dom configured to work with haptic/state as the
// reactivity engine. You access haptic/state on its own:

// import { h } from 'haptic';
// import { signal, wire } from 'haptic/state';

// The 'haptic' package doesn't embed haptic/state in the bundle; code is only
// loaded once despite having two import sites. This should work well for both
// bundlers and unbundled ESM-only/Snowpack/UNPKG workflows. It's important to
// only run one instance of haptic/state because reactivity depends on accessing
// some shared global state that is setup during import.

// This bundle also extends the JSX namespace to allow using wires in attributes
// and children. Use haptic/dom directly to use a vanilla JSX namespace or to
// extend it yourself for other reactive state libraries.

// Higher-level features such as control flow, lifecycles, and context are
// available in haptic/std

import { api, h, svg } from './dom/index.js';

import type { Wire } from './state/index.js';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

// When publishing swap out api.h for the correct JSX namespace in index.d.ts
// https://github.com/heyheyhello/haptic/commit/d7cd2819f538c3901ffb0c59e9226fa68d3ae4a9
// declare api = Omit<typeof _api, 'h'> & { h: typeof h };

api.patch = (value, patchDOM) => {
  // I like type fields that use 1 instead of true/false, so convert via `!!`
  // eslint-disable-next-line no-implicit-coercion
  const $core = (value && !!(value as Wire).$core) as boolean;
  const { fn } = value as Wire;
  if ($core && patchDOM) {
    (value as Wire).fn = ($) => patchDOM(fn($));
    (value as Wire)();
  }
  return $core;
};

export { api, h, svg };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DistributeWire<T> = T extends any ? Wire<T> : never;

declare namespace h {
  export namespace JSX {
    type MaybeWire<T> = T | DistributeWire<T>;
    type AllowWireForProperties<T> = { [K in keyof T]: MaybeWire<T[K]> };

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
      = AllowWireForProperties<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeWire<string>
            | { [key: string]: MaybeWire<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowWireForProperties<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
