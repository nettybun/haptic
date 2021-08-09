# Changelog

## 0.10.0

The API is nearly settled and hopefully the next major release will be 1.0.0.
This is an uncomfortably large release. I'll release smaller changes and fixes
more frequently from now own to avoid this large of a changelog.

- Use more explicit naming for everything (#2 and #8).
  - Rename `haptic/h` to `haptic/dom`
  - Rename `haptic/v` to `haptic/w` to `haptic/wire` to `haptic/state`
  - Rename `haptic/u` to `haptic/util` to `haptic/stdlib`

- Publish ESM and CJS builds using Node 16+'s `package.json#exports` field.

- Write documentation and introduction code that has been tested.

**`haptic/dom`**

- Rewrite the main `h()` call to have less function calls (no `item()`).

- Function are serialized to strings in `haptic/h` rather than implicitly being
  wrapped in a reactive context. This forces JSX to be more explicit and
  requires `api.patch` to search for a specific data type (a wire, by default).

  Passing a signal implicitly will no longer work:

  ```tsx
  // Bad
  return <p>Function is serialized to a string: {sig}</p>
  // Good
  return <p>Signal is subscribed and its value updates the DOM: {wire(sig)}</p>
  ```

- Remove support for `attrs`. This was specific to Sinuous.

- Remove the global event proxy. This was specific to Sinuous.

- Fix array handling to create and populate fragments correctly (#13).

- Adopt `svg()` into the `haptic/dom` package instead of `haptic/stdlib`.

**`haptic/state`**

- Rename vocals to simply signals; a term the community is familiar with. Rename
  reactors to wires (note "wS+wC" and "core" were also used for some time).

- Signals now accept a "SubToken" `$` to initiate a read-subscribe instead of
  the previous `s(...)` wrapper function. Here's an updated example from the 0.6
  changelog:

  ```ts
  const data = signal({ count: 0, text: '' });
  wire($ => {
    console.log("Wire will run when count is updated:", data.count($));
    console.log("Wire doesn't run when text is updated:", data.text());
  })();
  ```

  This makes the two types of reads look more visually similar and makes it
  clearly a read.

  This $ token is actually also a function that makes it easier to unpack
  multiple signal values since it's a fairly common operation:

  ```tsx
  // This is fine and works...
  const [a, b, c] = [sigA($), sigB($), sigC($)]
  // This is smaller and has the same type support for TS
  const [a, b, c] = $(sigA, sigB, sigC);
  ```

- Names/IDs for signals and wires are now their function name. The actual JS
  function name! This is from a nice `{[k](){}}[k]` hack and allows signals and
  wires to appear naturally in console logs and stacktraces.

- Transactions are now atomic so all wires read the same signal value (#9).

- Anonymous (unnamed) signals can directly created with `= signal.anon(45);`

- Add lazy computed signals ✨ (#1 and #14)

  This is Haptic's version of a `computed()` without creating a new data type.

  Instead, these are defined by passing a wire into a signal, which then acts as
  the computation engine for the signal, while the signal is responsible for
  communicating the value to other wires.

  ```ts
  const state = signal({
    count: 45,
    countSquared(wire($ => state.count($) ** 2)),
    countSquaredPlusFive(wire($ => state.countSquared($) + 5)),
  });
  // Note that the computation has never run up to now. They're _lazy_.

  // Calling countSquaredPlusFive will run countSquared, since it's a dependency.
  state.countSquaredPlusFive(); // 2030

  // Calling countSquared does _no work_. It's not stale. The value is cached.
  state.countSquared(); // 2025
  ```

- Replace the expensive topological sort (Set to Array) to a ancestor lookup
  loop that actually considers all grandchildren, not only direct children.

- Rework all internal wire states to use a 3-field bitmask (#14).

- Unpausing is no longer done by calling the wire since it was inconsistent with
  how wires worked in all other cases. Wires must always be able to be run
  manually without changing state. Now running a paused wire leaves it paused.
  Use the new `wireResume()` to unpause (#14).

- Removed the ability to chain wires into multiple DOM patches. It was dangerous
  and lead to unpredictable behaviour with `when()` or computed signals. It's an
  accident waiting to happen (#14).

- Implement a test runner in Zora that supports TS, ESM, and file watching.

- Change the function signature for `when()` to accept a `$ => *` function
  instead of a wire. Instead, a wire is created internally.

  ```diff
  -when(wire($ => {
  +when($ => {
    const c = data.count($);
    return c <= 0 ? '-0' : c <= 10 ? '1..10' : '+10'
  -}), {
  +}, {
    '-0'   : () => <p>There's no items</p>
    '1..10': () => <p>There's between 1 and 10 items</p>
    '+10'  : () => <p>There's a lot of items</p>
  });
  ```

  This is because I removed chaining for wires, so `when()` can't simply extend
  the given wire, it would need to nest it in a new wire. It makes most sense to
  be a computed signal, but typing `when(signal.anon(wire($ =>...` is awful, so
  creating a single wire is the best API choice.

## 0.8.0

- Redesign the reactivity engine from scratch based on explicit subscriptions.

  Designed separately in https://github.com/heyheyhello/haptic-reactivity.

  Replaces `haptic/s` as `haptic/v`.

  Introduces _Vocals_ as signals and _Reactors_ as effects. Subscriptions are
  explicitly linked by a function `s(...)` created for each reactor run:

  ```ts
  const v = vocals({ count: 0, text: '' });
  rx(s => {
    console.log("Reactor will run when count is updated:", s(v.count));
    console.log("Reactor doesn't run when text is updated:", v.text());
  })();
  ```

  Globally unique IDs are used to tag each vocal and reactor. This is useful for
  debugging subscriptions.

  Accidental subscriptions are avoided without needing a `sample()` method.

  Reactors must consistently use vocals as either a read-pass or read-subscribe.
  Mixing these into the same reactor will throw.

  Reactors tracking nesting (reactors created within a reactor run).

  Reactors use a finite-state-machine to avoid infinite loops, track paused and
  stale states, and mark if they have subscriptions after a run.

  Reactors can be paused. This includes all nested reactors. When manually run
  to unpause, the reactor only runs if is has been marked as _stale_.

  Reactors are topologically sorted to avoid nested children reactors running
  before their parent. This is because reactors clear all children when run, so
  these children would otherwise run more times than needed.

- Add `when()` to conditionally switch DOM content in an efficient way.

- Replace Sinuous' `api.subscribe` with a generic patch callback.

## 0.1.0 - 0.6.0

- Drop computed signals. They're confusing.

- List issues with the observer pattern architecture of Haptic and Sinuous.
  These will be addressed later.

- Add `on()`, `transaction()`, and `capture()`.

## 0.0.0

- Rewrite Sinuous in TypeScript. Lifting only `sinuous/h` and
  `sinuous/observable` to Haptic as `haptic/h` and `haptic/s`.

- Include multiple d.ts files which allow for patching other reactive libraries
  into the JSX namespace of `haptic/h`.

- Drop HTM over JSX: https://gitlab.com/nthm/stayknit/-/issues/1

  I love the idea of HTM but it's fragile and no editor plugins provide
  comparable autocomplete, formatting, and error checking to JSX. It's too easy
  to have silently broken markup in HTM. It's also noticable runtime overhead.

  HTM can be worth it for zero-transpilation workflows, but Haptic already uses
  TypeScript. That ship has sailed. Debugging is already supported by sourcemaps
  to show readble TS - JSX naturally fits there.

  Haptic needs to approachable to new developers. It's a better developer
  experience to use JSX.

- Design systems for SSR, CSS-in-JS, and Hydration. These are part of the modern
  web stack. They will be designed alongside Haptic to complete the picture.

  https://github.com/heyheyhello/stayknit/

- Design lifecycle hook support. Supports `onAttach` and `onDetach` hooks
  **without** using `MutationObserver`.

  https://www.npmjs.com/package/sinuous-lifecycle

## Origin

- Began researching ideas for designing reactivity in ways that still love the
  DOM; without needing a virtual DOM or reconcilation algorithms.

  Notes are at https://gitlab.com/nthm/lovebud

  Discover Sinuous shortly after and contribute there instead.
