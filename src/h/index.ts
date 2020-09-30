import { h as _h } from './h.js';
import { svg } from './svg.js';

import { add } from './nodeAdd.js';
import { insert } from './nodeInsert.js';
import { property } from './nodeProperty.js';
import { remove } from './nodeRemove.js';

const api = {
  // Element namespace URL such as SVG or MathML
  ns: '',
  // Element creation
  h: _h,
  svg,
  // Customizable internal methods for h()
  add,
  insert,
  property,
  remove,
  // Replace this with an observable implementation to allow reactivity
  subscribe: (_: () => void) => {},
};

// Reference the latest internal h() allowing others to customize the call
const h: typeof _h = (...args) => api.h(...args);

export { h, api };
