// Haptic is a bundle of haptic/h that looks for haptic/v at runtime to use as
// the reactivity engine. You access haptic/v on its own:

// import { h } from 'haptic';
// import { vocals, rx } from 'haptic/v';

// This bundles two utilities, svg and when, and extends the JSX namespace to
// allow using Vocal and Rx types in JSX. Import haptic/h to use a vanilla JSX
// namespace or to use other reactivity libraries such as sinuous/observable,
// haptic/s, hyperactiv, or mobx.

// TODO: Read haptic/s for ESM-related single instancing of globals...

import { h, api } from './h';
import { rx, adopt } from './v';

import type { Rx, Vocal, VocalSubscriber } from './v';
import type { GenericEventAttrs, HTMLAttrs, SVGAttrs, HTMLElements, SVGElements } from './jsx';

type El = Element | Node | DocumentFragment | undefined;
type Component = (...args: unknown[]) => El;

// Expects haptic/v to have setup up globally on window?
// -- api.rx = (...args) => window.haptic.rx(...args);

// TODO: This doesn't work? Importing haptic/v separately will use different
// variables for rxActive, rx.id counters, etc. It has to be the same...
api.rx = rx;

/** Utility: Renders SVGs by setting h() to the SVG namespace */
const svg = <T extends () => Element>(closure: T): ReturnType<T> => {
  const prev = api.ns;
  api.ns = 'http://www.w3.org/2000/svg';
  const el = closure();
  api.ns = prev;
  return el as ReturnType<T>;
};

/** Utility: Switches content when the vocal in `condition` is updated */
const when = <T extends string>(
  condition: (s: VocalSubscriber) => T,
  views: { [k in T]?: Component }
): (s: VocalSubscriber) => El => {
  const renderedEl = {} as { [k in T]: El };
  const renderedRx = {} as { [k in T]: Rx };
  let condActive: T;
  return s => {
    const cond = condition(s);
    if (cond !== condActive && views[cond]) {
      // Tick. Pause reactions. Keep DOM intact.
      renderedRx[condActive].pause();
      condActive = cond;
      // Rendered?
      if (renderedEl[cond]) {
        // Then unpause. If nothing has changed then no sr/pr links change
        renderedRx[cond]();
      }
      // Able to render?
      const parent = rx(() => {});
      // TODO: ESM vs window globalThis to access correct rxActive?
      renderedEl[cond] = adopt(parent, () => h(views[cond]));
      renderedRx[cond] = parent;
    }
    return renderedEl[cond];
  };
};

export { h, api, svg, when };

declare namespace h {
  export namespace JSX {
    type MaybeVocal<T> = T | Vocal<T>;
    type AllowVocal<Props> = { [K in keyof Props]: MaybeVocal<Props[K]> };

    type Element = HTMLElement | SVGElement | DocumentFragment;

    interface ElementAttributesProperty { props: unknown; }
    interface ElementChildrenAttribute { children: unknown; }

    // Prevent children on components that don't declare them
    interface IntrinsicAttributes { children?: never; }

    // Allow children on all DOM elements (not components, see above)
    // ESLint will error for children on void elements like <img/>
    type DOMAttributes<Target extends EventTarget>
      = AllowVocal<GenericEventAttrs<Target>> & { children?: unknown };

    type HTMLAttributes<Target extends EventTarget>
      = AllowVocal<Omit<HTMLAttrs, 'style'>>
        & { style?:
            | MaybeVocal<string>
            | { [key: string]: MaybeVocal<string | number> };
          }
        & DOMAttributes<Target>;

    type SVGAttributes<Target extends EventTarget>
      = AllowVocal<SVGAttrs> & HTMLAttributes<Target>;

    type IntrinsicElements =
      & { [El in keyof HTMLElements]: HTMLAttributes<HTMLElements[El]>; }
      & { [El in keyof SVGElements]: SVGAttributes<SVGElements[El]>; };
  }
}
