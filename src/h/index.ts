import { h as _h } from './h.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

// These don't depend on any particular observer implementation
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
  // Replace this with an observable implementation to allow reactivity
  subscribe: (_: () => void) => {},
};

// Reference the latest internal h() allowing others to customize the call
const h: typeof _h = (...args) => api.h(...args);

export { h, svg, when, api };
