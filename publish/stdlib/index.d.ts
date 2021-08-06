import type { Wire, SubToken } from '../state/index.js';
import type { El } from '../dom/index.js';

/** Switches DOM content when signals of the condition wire are written to */
declare const when: <T extends string>(
  condition: ($: SubToken) => T,
  views: { [k in T]?: (() => El) | undefined; }
) => Wire<El | undefined>;

export { when };
