import { h, api } from './h';
import type { Subject } from './s';
import type { JSXInternal } from './jsx';
export { h, api };
declare namespace h {
    namespace JSX {
        interface IntrinsicAttributes {
            children?: never;
        }
        type MaybeSubject<T> = T | Subject<T>;
        type AllowSubject<Props> = {
            [K in keyof Props]: MaybeSubject<Props[K]>;
        };
        type SVGAttributes<Target extends EventTarget = SVGElement> = AllowSubject<JSXInternal.SVGAttributes<Target>>;
        type HTMLAttributes<RefType extends EventTarget = EventTarget> = AllowSubject<JSXInternal.HTMLAttributes<RefType>>;
    }
}
