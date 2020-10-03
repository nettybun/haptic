import { subscribe } from './s';
import { h, api } from './h';

import type { Subject } from './s';
import type { JSXInternal } from './jsx';

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
