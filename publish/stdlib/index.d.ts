import type { Wire } from '../state/index.js';
import type { Component, El } from '../dom/index.js';

/** Switches DOM content when signals of the condition wire are written to */
declare const when: <T extends string>(
  conditionWire: Wire<T>,
  views: { [k in T]?: Component | undefined;
}) => Wire<El | undefined>;

export { when };
