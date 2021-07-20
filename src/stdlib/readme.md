# Standard library

These are constructs for control-flow, lifecycles, context, error boundaries,
and other higher-level ideas beyond basic JSX and reactive state.

Many of these are unimplemented, but are foreseen because they're popular in
other libraries; often popularized by React. **I won't implement unnecessary
constructs, personally.** If I don't use it you won't find it here. I'm also
more aligned to use JS constructs rather than JSX DSL like Solid/React do, hence
having `when()` as a function.

Implemented, though not necessarily right here:

  - Switch DOM content efficiently via `when()`: ./when.ts.

  - Lifecycle hooks for `onAttach` and `onDetach` component mounting:
    https://github.com/heyheyhello/sinuous-packages/tree/work/sinuous-lifecycle

  - List reconciliation, a necessary evil at times:
    https://github.com/luwes/sinuous/tree/master/packages/sinuous/map


Again, these will be implemented as necessary...

## `when(conditionWire: Wire<T>, views: { [key: T]: () => Node })`

Matches `conditionWire`'s value to an object key in `views` in order to render
DOM content. Useful when the wire returns a nice value such as "T"/"F" shown
below. When a view is unrendered, all its nested wires are paused so the view
doesn't update off screen. The DOM is still cached and held in memory, however.

Usage:

```tsx
import { h } from 'haptic';
import { signal, wire } from 'haptic/state';
import { when } from 'haptic/stdlib';

const data = signal({
  count: 0,
  countNext: wire($ => data.count($) + 1),
});

const Page = () =>
  <div>
    <p>Content below changes when <code>data.count > 5</code></p>
    <button onClick={data.count(data.count() + 1)}>
      Increment to {wire(data.countNext)}
    </button>
    {when(wire($ => data.count($) > 5 ? "T" : "F"), {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {wire(data.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```
