# Utilities


## `when(wC: WireCore<T>, views: { [key: T]: () => Node })`

Renders a DOM node by matching the response of `wC` to an object key in `views`.
Useful when paired with a core which returns a nice value such as "T"/"F" shown
below. When a view is asked to unrender, all nested cores are paused so the view
won't update while off screen. The DOM nodes are still cached and held in
memory, however.

Usage:

```tsx
import { h } from 'haptic';
import { signal, core } from 'haptic/wire';
import { when } from 'haptic/utils';

const data = signal({
  count: 0,
  countNext: core($ => count($) + 1),
});

const Page = () =>
  <div>
    <p>Content below changes when <code>data.count > 5</code></p>
    <button onClick={data.count(data.count() + 1)}>
      Increment to {core(data.countNext)}
    </button>
    {when(core($ => data.count($) > 5 ? "T" : "F"), {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {core(data.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```
