Utilities for Haptic.

**`svg(closure: () => Node))`**

Tells Haptic's reviver to create SVG namespaced DOM elements for the duration of
the closure. This means it uses `document.createElementNS` instead of the usual
HTML `document.createElement`. Without this, elements like `<title>` would have
very different behaviour.

Usage:

```tsx
import { h } from '../src';
import { svg } from '../src/extras';

document.body.appendChild(
  <p>HTML text with an add icon {svg(() =>
    <svg viewBox="0 0 15 15" fill="none" width="15" height="15">
      <path d="M7.5 1v13M1 7.5h13" stroke="#000"/>
    </svg>
  )} inlined in the sentence.
  </p>
);
```

**`when(condition: WireSignal<T>, views: { [key: T]: () => Node })`**

Renders a different DOM node depending on a signal's value. The value is matched
to an object key in `views`. Useful when paired with _computed-signals_ which
can return a nice value such as "T"/"F" for true/false, shown below. When a view
is asked to unrender all reactors are paused so the view won't update while off
screen. The DOM nodes are still live and held in memory, however.

Usage:

```tsx
import { h } from '../src';
import { when } from '../src/extras';

// TODO: Port a nice example from the stayknit repo. Many are used over there.
document.body.appendChild();
```

---

Note: `Node` is the base class for HTML elements, SVG elements, and document
fragments, so it's easy to use as a type.
