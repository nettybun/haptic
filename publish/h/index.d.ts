import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from '../jsx';
export declare function h(tag?: string | [], props?: unknown, ...children: unknown[]): Element | Node | DocumentFragment | undefined;
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
export const api: {
    ns: string;
    h: typeof h;
    svg: <T extends () => Element>(closure: T) => ReturnType<T>;
    add: (parent: Node, value: unknown, endMark?: Node) => Node | Frag;
    insert: (el: Node, value: unknown, endMark?: Node, current?: Node | Frag, startNode?: ChildNode | null) => Node | Frag | undefined;
    property: (el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean) => void;
    remove: (parent: Node, startNode: ChildNode | null, endMark: Node) => void;
    subscribe: (_: () => void) => void;
};
