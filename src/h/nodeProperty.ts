import { api } from './index.js';

type EventHandler = (ev: Event) => unknown
// Similar to $o for observable, this is an indicator that events are attached
type NodeEvented = Node & { $l?: { [name: string]: EventHandler } }

function eventProxy(this: NodeEvented, e: Event) {
  // eslint-disable-next-line no-invalid-this
  return this.$l && this.$l[e.type](e);
}

const handleEvent = (el: NodeEvented, name: string, value?: EventHandler) => {
  name = name.slice(2).toLowerCase();
  if (value) {
    el.addEventListener(name, eventProxy);
    (el.$l || (el.$l = {}))[name] = value;
  } else {
    el.removeEventListener(name, eventProxy);
    // TODO: Equivalence?
    (el.$l && delete el.$l.name);
  }
};

/** Set attributes and propeties on a node */
export const property = (el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean) => {
  // @ts-expect-error Empty if body
  // eslint-disable-next-line eqeqeq
  if (value == null);
  else if (!name
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    || (name === 'attrs' && (isAttr = true))
  ) {
    for (name in value as object) {
      api.property(el, (value as { [k: string]: unknown })[name], name, isAttr, isCss);
    }
  }
  else if (name[0] === 'o' && name[1] === 'n' && !(value as { $o?: 1 }).$o) {
    // Functions added as event handlers are not executed on render unless they
    // have an observable indicator
    handleEvent(el, name, value as EventHandler);
  }
  else if (typeof value === 'function') {
    api.subscribe(() => {
      api.property(el, value.call({ el, name }), name, isAttr, isCss);
    });
  }
  else if (isCss) {
    (el as HTMLElement | SVGElement).style.setProperty(name, value as string);
  }
  else if (
    isAttr
    || name.slice(0, 5) === 'data-'
    || name.slice(0, 5) === 'aria-'
  ) {
    (el as HTMLElement | SVGElement).setAttribute(name, value as string);
  }
  else if (name === 'style') {
    if (typeof value === 'string') {
      (el as HTMLElement | SVGElement).style.cssText = value;
    } else {
      api.property(el, value, null, isAttr, true);
    }
  }
  else {
    // Default case; add as a property
    if (name === 'class') name += 'Name';
    // @ts-expect-error
    el[name] = value;
  }
};
