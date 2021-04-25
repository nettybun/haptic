import { h as _h } from './h.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

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
  // Reactivity could be haptic/w, sinuous/observable, mobx, etc
  patch: (expr: unknown, updateCallback?: (value: unknown) => void) => boolean,
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

export { api, h };
