/* eslint-disable eqeqeq */
import { api } from './index.js';

type EventHandler = (ev: Event) => unknown;
type NodeEvented = Node & { $l?: { [name: string]: EventHandler } };

/** Set attributes and propeties on a node. */
export const property = (el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean) => {
  if (value == null) {}
  else if (!name) {
    for (name in value as { [k: string]: unknown }) {
      api.property(el, (value as { [k: string]: unknown })[name], name, isAttr = true, isCss);
    }
  }
  // Functions added as event handlers are not executed on render
  // There's only one event listener per type
  else if (name[0] == 'o' && name[1] == 'n') {
    const listeners = (el as NodeEvented).$l || ((el as NodeEvented).$l = {});
    name = name.slice(2).toLowerCase();
    // Remove the previous function
    if (listeners[name]) {
      el.removeEventListener(name, listeners[name] as EventHandler); // TS bug
      delete listeners[name];
    }
    el.addEventListener(name, value as EventHandler);
    listeners[name] = value as EventHandler;
  }
  else if (
    api.patch(value, (v) => api.property(el, v, name, isAttr, isCss), el, name)
  ) {}
  else if (isCss) {
    (el as HTMLElement | SVGElement).style.setProperty(name, value as string);
  }
  else if (
    isAttr
    || name.slice(0, 5) == 'data-'
    || name.slice(0, 5) == 'aria-'
  ) {
    (el as HTMLElement | SVGElement).setAttribute(name, value as string);
  }
  else if (name == 'style') {
    if (typeof value === 'string') {
      (el as HTMLElement | SVGElement).style.cssText = value;
    } else {
      api.property(el, value, null, isAttr, true);
    }
  }
  else {
    // Default case; add as a property
    // @ts-expect-error
    el[name == 'class' ? name + 'Name' : name] = value;
  }
};
