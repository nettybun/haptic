# Haptic

Reactive web rendering in TSX with no virtual DOM, no compilers, no
dependencies, and no magic.

It's under 1600 bytes min+gz.

```tsx
import { h } from 'haptic';
import { signal, wire } from 'haptic/state';
import { when } from 'haptic/stdlib';

const state = signal({
  text: '',
  count: 0,
});

const Page = () =>
  <div>
    <h1>"{wire(data.text)}"</h1>
    <p>You've typed {wire($ => state.text().length)} characters</p>
    <input
      placeholder='Type here!'
      value={wire(data.text)}
      onChange={(ev) => data.text(ev.currentTarget.value)}
    />
    <button onClick={state.count(state.count() + 1)}>
      +1
    </button>
    <p>After {wire($ => 5 - state.count($))} clicks the content will change</p>
    {when(wire($ => state.count($) > 5 ? "T" : "F"), {
      T: () => <strong>There are over 5 clicks!</strong>,
      F: () => <p>Clicks: {wire(state.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```

Haptic is small, explicit, and modest because it was born out of JavaScript
Fatigue. It runs in vanilla JS environments and renders using the DOM. It
embraces the web.

The barrier to entry in web development is so high because we're drowning in the
over-engineering of our own tools.

This is a step away from compilers, customs DSLs, and DOM diffing.

Instead, Haptic focuses on a modern and reliable developer experience:

- __Writing in the editor__ leverages TypeScript to provide strong type feedback
  and verify code before it's even run. JSDoc comments also supply documentation
  when hovering over all exports.

- __Testing at runtime__ behaves as you'd expect; a div is a div. It's also
  nicely debuggable with good error messages and by promoting code styles that
  naturally name things in ways that are displayed in console logs and
  stacktraces. It's subtle, but it's especially helpful for reviewing reactive
  subscriptions. You'll thank me later.

- __Optimizing code__ is something you can do by hand. Haptic let's you write
  modern reactive web apps and still understand every part of the code. You
  don't need to know how Haptic works to use it, but you're in good company if
  you ever look under the hood. It's only ~600 lines of well-documented source
  code; 340 of which is the single-file reactive state engine.

## Install

```
npm install --save haptic
```

Alternatively link directly to the module bundle on Skypack or UNPKG such as
https://unpkg.com/haptic?module for an unbundled ESM script.

## Packages

Haptic is a small collection of packages. This keeps things lightweight and
helps you only use what you'd like. Each package can be used on its own.

The `haptic` package is simply a version of `haptic/dom` configured to use
`haptic/state` for reactivity.

Rendering is handled in `haptic/dom` and supports any reactive library including
none at all. Reactivity and state is provided by `haptic/state`. Framework
features are part of the standard library in `haptic/stdlib`.

### [Haptic DOM](./src/dom/readme.md)

### [Haptic State](./src/state/readme.md)

### [Haptic Stdlib](./src/stdlib/readme.md)

## Motivation

Haptic started as a port of Sinuous to TS that used TSX instead of HTML tag
templates. The focus shifted to type safety, debugging, leveraging the editor,
and eventually designing a new reactive state engine from scratch after
influence from Sinuous, Solid, S.js, Reactor.js, and Dipole.

Hyperscript code is still largely borrowed from Sinuous and Haptic maintains the
same modular API with the new addition of `api.patch`.
