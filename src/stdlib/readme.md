# Standard library

These are constructs for control-flow, lifecycles, context, error boundaries,
and other higher-level ideas beyond basic JSX and reactive state.

Many of these are unimplemented, but are foreseen because they're popular in
other libraries; often popularized by React. **I won't implement unnecessary
constructs, personally.** If I don't use it you won't find it here. I'm also
more aligned to use JS constructs rather than JSX DSL like Solid/React do, hence
having `when()` as a function.

Implemented, though not necessarily right here:

  - Switch DOM content efficiently via `when()`. It does caching of DOM nodes
    and pauses any wires that go "off-screen".

  - Lifecycle hooks for `onAttach` and `onDetach` component mounting:
    https://github.com/heyheyhello/sinuous-packages/tree/work/sinuous-lifecycle

  - List reconciliation, a necessary evil at times:
    https://github.com/luwes/sinuous/tree/master/packages/sinuous/map


Again, these will be implemented as necessary...

## `when<T>(condition: ($: SubToken) => T, views: { [key: T]: () => El }): Wire<El | undefined>`

Uses `condition` function to build and return a wire. This wire matches the
output of the condition to a key in `views` to return DOM content. Try returning
readable values such as "T"/"F" as shown below. When a view is unrendered, all
its nested wires are paused so the view doesn't keep updating in the background.

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
    <button onClick={() => data.count(data.count() + 1)}>
      Increment to {wire(data.countNext)}
    </button>
    {when($ => data.count($) > 5 ? "T" : "F", {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {wire(data.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```

When it says "There have been more than 5 clicks" the `wire(data.count)` wire
won't run anymore even when `data.count` is being written to.
