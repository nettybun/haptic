import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from '../jsx';

type El = Element | Node | DocumentFragment;
type Tag = El | Component | [] | string;
type Component = (...args: unknown[]) => El | undefined;

declare function h(tag: Tag, props?: unknown, ...children: unknown[]): El | undefined;
declare namespace h {
  namespace JSX {
    type Element = HTMLElement | SVGElement | DocumentFragment;
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
      & { children?: unknown };
    type HTMLAttributes<Target extends EventTarget>
      = HTMLAttrs
      & DOMAttributes<Target>;
    type SVGAttributes<Target extends EventTarget>
      = SVGAttrs
      & HTMLAttributes<Target>;
    type IntrinsicElements
      = { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]> }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]> };
  }
}

/** Renders SVGs by setting h() to the SVG namespace */
declare function svg<T extends () => Node>(closure: T): ReturnType<T>;

type Frag = { _startMark: Text };
declare const api: {
  /** Hyperscript reviver */
  h: typeof h;
  /** Add a node before a reference node or at the end */
  add: (parent: Node, value: unknown, endMark?: Node) => Node | Frag;
  /** Insert a node into an existing node */
  insert: (el: Node, value: unknown, endMark?: Node, current?: Node | Frag, startNode?: ChildNode | null) => Node | Frag | undefined;
  /** Set attributes and propeties on a node */
  property: (el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean) => void;
  /** Removes nodes, starting from `startNode` (inclusive) to `endMark` (exclusive) */
  rm: (parent: Node, startNode: ChildNode | null, endMark: Node) => void;
  /** DOM patcher. Receives unknown JSX elements and attributes. To mark the DOM
  location as reactive, return true. Call patchDOM() anytime to update. */
  patch: (value: unknown, patchDOM?: (value: unknown) => void, el?: Node, attribute?: string) => boolean;
  /** Element namespace URL such as SVG or MathML */
  ns?: string;
};

export { h, svg, api };
export type { Component, El, Tag };
