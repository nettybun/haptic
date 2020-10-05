import { h, api } from './h';
import type { Subject } from './s';
import type { JSXInternal } from './jsx';
export { h, api };
declare namespace h {
    export namespace JSX {
        type MaybeSubject<T> = T | Subject<T>
        type AllowSubject<Props> = { [K in keyof Props]: MaybeSubject<Props[K]> }

        // Prevent children on components that don't declare them
        interface IntrinsicAttributes { children?: never }

        // Allow children on all DOM elements (not components, see above)
        // ESLint will error for children on void elements like <img/>
        type DOMAttributes<Target extends EventTarget>
            = AllowSubject<
                JSXInternal.DOMAttributes<Target>
                & { children?: unknown }>

        type HTMLAttributes<RefType extends EventTarget = EventTarget>
            = AllowSubject<Omit<JSXInternal.HTMLAttributes<RefType>, 'style'>>
              & { style?:
                    | MaybeSubject<string>
                    | { [key: string]: MaybeSubject<string | number> }
                }

        type SVGAttributes<Target extends EventTarget = SVGElement>
            = AllowSubject<JSXInternal.SVGAttributes<Target>>

        type IntrinsicElements
            = AllowSubject<JSXInternal.IntrinsicElements>
    }
}
