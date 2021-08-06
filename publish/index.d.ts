import { api as _api, svg } from './dom/index.js';
import type { Component, El, Tag } from './dom/index.js';
import type { Wire } from './state/index.js';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type DistributeWire<T> = T extends any ? Wire<T> : never;

declare function h(tag: Tag, props?: unknown, ...children: unknown[]): El | undefined;
declare namespace h {
  namespace JSX {
    type MaybeWire<T> = T | DistributeWire<T>;
    type AllowWireForProperties<T> = {
      [K in keyof T]: MaybeWire<T[K]>;
    };
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
      = AllowWireForProperties<Omit<HTMLAttrs, 'style'>>
      & { style?: MaybeWire<string> | { [key: string]: MaybeWire<string | number> } }
      & DOMAttributes<Target>;
    type SVGAttributes<Target extends EventTarget>
      = AllowWireForProperties<SVGAttrs>
      & HTMLAttributes<Target>;
    type IntrinsicElements
      = { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]> }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]> };
  }
}

// Swap out h to have the correct JSX namespace
declare const api: Omit<typeof _api, 'h'> & { h: typeof h };

export { h, svg, api };
export type { Component, El, Tag };
