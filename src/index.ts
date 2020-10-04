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

import { subscribe } from 'sinueux/s';
import { h, api } from 'sinueux/h';

import type { Subject } from 'sinueux/s';
import type { JSXInternal } from 'sinueux/jsx';

api.subscribe = subscribe;

export { h, api };

// Extend the JSX namespace to support observer subjects
// If developers want to use a different subscribe implementation, edit this
declare namespace h {
  export namespace JSX {
    interface IntrinsicAttributes {
      children?: never;
    }

    type MaybeSubject<T> = T | Subject<T>
    type AllowSubject<Props> = { [K in keyof Props]: MaybeSubject<Props[K]> }

    type SVGAttributes<Target extends EventTarget = SVGElement>
      = AllowSubject<JSXInternal.SVGAttributes<Target>>

    // TODO: MaybeSubject<> for HTMLAttributes.style
    type HTMLAttributes<RefType extends EventTarget = EventTarget>
      = AllowSubject<JSXInternal.HTMLAttributes<RefType>>
  }
}
