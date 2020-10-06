import { api } from './h';
import type { Subject } from './s';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';
declare function h(tag?: string | [], props?: unknown, ...children: unknown[]): Element | Node | DocumentFragment | undefined;
declare namespace h {
    namespace JSX {
        type MaybeSubject<T> = T | Subject<T>;
        type AllowSubject<Props> = { [K in keyof Props]: MaybeSubject<Props[K]>; };
        type Element = HTMLElement;
        interface ElementAttributesProperty {
            props: unknown;
        }
        interface ElementChildrenAttribute {
            children: unknown;
        }
        interface IntrinsicAttributes {
            children?: never;
        }
        type DOMAttributes<Target extends EventTarget>
            = AllowSubject<GenericEventAttrs<Target>>
            & { children?: unknown; };
        type HTMLAttributes<Target extends EventTarget>
            = AllowSubject<Omit<HTMLAttrs, 'style'>>
            & { style?: MaybeSubject<string> | { [key: string]: MaybeSubject<string | number>; }; }
            & DOMAttributes<Target>;
        type SVGAttributes<Target extends EventTarget>
            = AllowSubject<SVGAttrs>
            & HTMLAttributes<Target>;
        type IntrinsicElements =
            & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
            & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
    }
}
export { h, api };
