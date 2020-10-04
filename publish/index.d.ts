import { h, api } from './h';
import type { Subject } from './s';
import type { JSXInternal } from './jsx';
export { h, api };
declare namespace h {
    export namespace JSX {
        type Element = HTMLElement

        interface ElementAttributesProperty extends JSXInternal.ElementAttributesProperty {}
        interface ElementChildrenAttribute extends JSXInternal.ElementChildrenAttribute {}
        interface IntrinsicElements extends JSXInternal.IntrinsicElements {}

        // Prevent children on components that don't declare them
        interface IntrinsicAttributes {
            children?: never;
        }

        type MaybeSubject<T> = T | Subject<T>;
        type AllowSubject<Props> = {
            [K in keyof Props]: MaybeSubject<Props[K]>;
        };

        // Allow children on all DOM elements (not components, see above)
        // ESLint will error for children on void elements like <img/>
        type DOMAttributes<Target extends EventTarget>
            = JSXInternal.DOMAttributes<Target> & { children?: unknown; }

        type SVGAttributes<Target extends EventTarget = SVGElement>
            = HTMLAttributes<Target> & AllowSubject<JSXInternal.SVGAttributes<Target>>

        type HTMLAttributes<RefType extends EventTarget = EventTarget>
            = DOMAttributes<RefType> & AllowSubject<JSXInternal.HTMLAttributes<RefType>>
    }
}
