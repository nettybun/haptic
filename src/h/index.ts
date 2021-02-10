import { h as _h } from './h.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

const noop = () => {};

// This API should be compatible with community libraries that extend Sinuous
const api = {
  /** Element namespace URL such as SVG or MathML */
  ns: '',
  /** Hyperscript reviver */
  h: _h,
  // Customizable internal methods for h()
  add,
  insert,
  property,
  // Renamed for compatibility with Sinuous' community libraries
  rm: remove,
  // Reactivity could be haptic/v, sinuous/observable, mobx, etc
  patchTest: noop as unknown as (expr: unknown) => boolean,
  patchHandler: noop as unknown as (expr: unknown, updateCallback: (value: unknown) => void) => void,
};

// Reference the latest internal h() allowing others to customize the call
const h: typeof _h = (...args) => api.h(...args);

export { api, h };
