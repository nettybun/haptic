import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from '../jsx';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;
declare function h(tag?: string | [] | Component, props?: unknown, ...children: unknown[]): El;
declare namespace h {
    namespace JSX {
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
            = GenericEventAttrs<Target>
            & { children?: unknown; };
        type HTMLAttributes<Target extends EventTarget>
            = HTMLAttrs
            & DOMAttributes<Target>;
        type SVGAttributes<Target extends EventTarget>
            = SVGAttrs
            & HTMLAttributes<Target>;
        type IntrinsicElements =
            & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
            & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
    }
}
type Frag = { _startMark: Text }
declare const api: {
    ns: string;
    h: typeof h;
    add: (parent: Node, value: unknown, endMark?: Node) => Node | Frag;
    insert: (el: Node, value: unknown, endMark?: Node, current?: Node | Frag, startNode?: ChildNode | null) => Node | Frag | undefined;
    property: (el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean) => void;
    remove: (parent: Node, startNode: ChildNode | null, endMark: Node) => void;
    subscribe: (_: () => void) => void;
};

/** Renders SVGs by setting h() to the SVG namespace */
declare const svg: <T extends () => Element>(closure: T) => ReturnType<T>;

/** Useful for switching content when `condition` contains a signal/observer */
declare const when: <T extends string>(condition: () => T, views: { [k in T]?: Component | undefined; }) => () => El;

export { h, svg, when, api };
