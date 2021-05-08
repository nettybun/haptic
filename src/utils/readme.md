Utilities for Haptic.

**`svg(closure: () => Node))`**

Tells Haptic's reviver to create SVG namespaced DOM elements for the duration of
the closure. This means it uses `document.createElementNS` instead of the usual
HTML `document.createElement`. Without this, elements like `<title>` would have
very different behaviour.

Usage:

```tsx
import { h } from 'haptic';
import { svg } from 'haptic/utils';

cosnt <Page> = () =>
  <p>HTML text with an add icon {svg(() =>
    <svg viewBox="0 0 15 15" fill="none" width="15" height="15">
      <path d="M7.5 1v13M1 7.5h13" stroke="#000"/>
    </svg>
  )} inlined in the sentence.
  </p>;

document.body.appendChild(<Page/>);
```

**`when(wC: WireCore<T>, views: { [key: T]: () => Node })`**

Renders a DOM node by matching the response of `wC` to an object key in `views`.
Useful when paired with a core which returns a nice value such as "T"/"F" shown
below. When a view is asked to unrender, all nested cores are paused so the view
won't update while off screen. The DOM nodes are still cached and held in
memory, however.

Usage:

```tsx
import { h } from 'haptic';
import { signalsFrom, core } from 'haptic/wire';
import { when } from 'haptic/utils';

const data = signalsFrom({
  count: 0,
});

const Page = () =>
  <div>
    <p>Content below changes when <code>data.count > 5</code></p>
    {when(core($ => data.count($) > 5 ? "T" : "F"), {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {core(data.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```

---

Note: `Node` is the base class for HTML elements, SVG elements, and document
fragments, so it's easy to use as a type.
