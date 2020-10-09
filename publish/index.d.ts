import { api as _api } from './h';

import type { Signal } from './s';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;
declare function h(tag?: string | [] | Component, props?: unknown, ...children: unknown[]): El;
declare namespace h {
    namespace JSX {
        type MaybeSignal<T> = T | Signal<T>;
        type AllowSignal<Props> = { [K in keyof Props]: MaybeSignal<Props[K]>; };
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
            = AllowSignal<GenericEventAttrs<Target>>
            & { children?: unknown; };
        type HTMLAttributes<Target extends EventTarget>
            = AllowSignal<Omit<HTMLAttrs, 'style'>>
            & { style?: MaybeSignal<string> | { [key: string]: MaybeSignal<string | number>; }; }
            & DOMAttributes<Target>;
        type SVGAttributes<Target extends EventTarget>
            = AllowSignal<SVGAttrs>
            & HTMLAttributes<Target>;
        type IntrinsicElements =
            & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
            & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
    }
}
// Swap out h to have the correct JSX namespace
declare const api: Omit<typeof _api, 'h'> & { h: typeof h };

export { h, api };
