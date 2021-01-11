import { api as _api } from './h';
import type { Vocal, VocalSubscriber } from './v';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

/** Utility: Renders SVGs by setting h() to the SVG namespace */
declare const svg: <T extends () => Element>(closure: T) => ReturnType<T>;

/** Utility: Switches content when the vocal in `condition` is updated */
declare const when: <T extends string>(condition: (s: VocalSubscriber) => T, views: { [k in T]?: Component; }) => (s: VocalSubscriber) => El;

declare function h(tag?: string | [] | Component, props?: unknown, ...children: unknown[]): El;
declare namespace h {
    export namespace JSX {
        type MaybeVocal<T> = T | Vocal<T>;
        type AllowVocal<Props> = { [K in keyof Props]: MaybeVocal<Props[K]> };
        type Element = HTMLElement | SVGElement | DocumentFragment;

        interface ElementAttributesProperty { props: unknown; }
        interface ElementChildrenAttribute { children: unknown; }

        // Prevent children on components that don't declare them
        interface IntrinsicAttributes { children?: never; }

        // Allow children on all DOM elements (not components, see above)
        // ESLint will error for children on void elements like <img/>
        type DOMAttributes<Target extends EventTarget>
            = AllowVocal<GenericEventAttrs<Target>>
            & { children?: unknown; };

        type HTMLAttributes<Target extends EventTarget>
            = AllowVocal<Omit<HTMLAttrs, 'style'>>
            & { style?: MaybeVocal<string> | { [key: string]: MaybeVocal<string | number>; }; }
            & DOMAttributes<Target>;
        type SVGAttributes<Target extends EventTarget>
            = AllowVocal<SVGAttrs>
            & HTMLAttributes<Target>;
        type IntrinsicElements =
            & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
            & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
    }
}
// Swap out h to have the correct JSX namespace
declare const api: Omit<typeof _api, 'h'> & { h: typeof h };

export { h, api, svg, when };
