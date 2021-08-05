import { h as _h } from './h.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

import { svg } from './svg.js';

import type { Component, El, Tag } from './h.js';

// This API should be compatible with community libraries that extend Sinuous
const api: {
  /** Hyperscript reviver */
  h: typeof _h;
  // Customizable internal methods for h()
  add: typeof add;
  insert: typeof insert;
  property: typeof property;
  // Renamed for compatibility with Sinuous' community libraries
  rm: typeof remove;
  /** DOM patcher. Receives unknown JSX elements and attributes. To mark the DOM
  location as reactive, return true. Call patchDOM() anytime to update. */
  patch: (
    value: unknown,
    // Reactivity could be from Haptic, Sinuous, MobX, Hyperactiv, etc
    patchDOM?: (value: unknown) => void,
    // Element being patched
    el?: Node,
    // If this is patching an element property, this is the attribute
    attribute?: string
  ) => boolean,
  /** Element namespace URL such as SVG or MathML */
  ns?: string;
} = {
  h: _h,
  add,
  insert,
  property,
  rm: remove,
  patch: () => false,
};

// Reference the latest internal h() allowing others to customize the call
const h: typeof _h = (...args) => api.h(...args);

export { api, h, svg };
export type { Component, El, Tag };
