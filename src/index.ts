// This bundle uses sinueux/s as the observer implementation. The TS aliases are
// used to mark it as an external dependency in esbuild, allowing downstream
// codebases to write:

// import { h } from 'sinueux';
// import { s, computed } from 'sinueux/s';
// ...

// Note that developers don't import sinueux/h since it doesn't have extended
// JSX definitions (below) that use sinueux/s. Bundlers will include sinuous/s
// only once since this bundle references it rather than embedding. This also
// caches well for unbundled (ESM-only) development (Snowpack, etc)

import { subscribe } from './s';
import { h, api } from './h';

import type { Subject } from './s';
import type {
  GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements
} from './jsx';

api.subscribe = subscribe;

export { h, api };

declare namespace h {
  export namespace JSX {
    type MaybeSubject<T> = T | Subject<T>;
    type AllowSubject<Props> = { [K in keyof Props]: MaybeSubject<Props[K]> };

    type Element = HTMLElement;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    type DOMAttributes<Target extends EventTarget>
      = AllowSubject<GenericEventAttrs<Target>> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = AllowSubject<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeSubject<string>
            | { [key: string]: MaybeSubject<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowSubject<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
