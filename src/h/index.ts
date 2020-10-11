import { h as _h } from './h.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

import { svg } from './util/svg.js';
import { when } from './util/when.js';

// This API should be compatible with community libraries that extend Sinuous
const api = {
  // Element namespace URL such as SVG or MathML
  ns: '',
  // Element creation
  h: _h,
  // Customizable internal methods for h()
  add,
  insert,
  property,
  // Renamed for Sinuous API compatibility
  rm: remove,
  // Replace these no-ops with ones from an observable implementation to enable
  // reactivity: nodeInsert.ts needs subscribe() and when.ts needs sample()
  sample: <T>(fn: () => T): T => fn(),
  // Not defining a strict return type for subscribe; h() doesn't use it
  subscribe: <T>(fn: () => T): void => { fn(); },
};

// Reference the latest internal h() allowing others to customize the call
const h: typeof _h = (...args) => api.h(...args);

export { h, api, svg, when };
