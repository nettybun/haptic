# Haptic

Reactive web rendering in TSX with no virtual DOM, no compilers, and no magic.
It's under 1600 bytes min+gz.

```tsx
import { h } from 'haptic';
import { signal, core } from 'haptic/state';
import { when } from 'haptic/std';

const data = signal({
  count: 0,
  countNext: wire($ => data.count($) + 1),
});

// Create a single anonymous signal
const text = signal.anon(100);
// Create a single signal
const { name } = signal({ name: 100 })

const Page = () =>
  <div>
    <button onClick={data.count(data.count() + 1)}>
      Increment up to {wire(data.countNext)}
    </button>
    <p>Content below changes when <code>data.count > 5</code></p>
    {when(wire($ => data.count($) > 5 ? "T" : "F"), {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {wire(data.count)}</p>,
    })}
  </div>;

document.body.appendChild(<Page/>);
```

## Install

```
npm install --save haptic
```

Alternatively, unbundled ESM-only development can link directly to the module
bundle on Skypack or UNPKG such as https://unpkg.com/haptic?module;

## Introduction

_TODO: Link to the nested readme.md's of each package_.

There's a full tutorial in progress. When its ready it will be a deployed demo
application like https://github.com/heyheyhello/stayknit.

### Packages

Haptic is split into a few different imports to help both bundled and unbundled
development. The `haptic/dom` package handles rendering TSX and also supports a
patch function to update content. This supports any reactivity library. Haptic
comes with its own reactive state library `haptic/state`. The `haptic` package
is Haptic DOM with Haptic State targeted as the reactivity library by modifying
the JSX namespace to accepts signals and wires as attributes and children.

### Reactivity

_TODO: Example snippets. Try to do a light overview and then redirect to ./wire/readme.md_

Reactivity is wired into a page explicitly by subscribing signals and cores.
This is then debuggable at runtime with proper naming and lookups.

<...>

Haptic leverages your editor to help you catch errors and misunderstandings
while writing - before the code is ever run.

_TODO: Link to screenshots as done in issue #5_

## Ideas and Values

Haptic was born out of "JavaScript Fatigue" and of wanting to target new and
experienced developers alike. It's explicit, small, has no dependencies, chooses
vanilla TS/JS over DSLs, is descriptive and recoverable about its errors, and is
interoperable with other libraries.

Part of programming today is dealing with the constant over-engineer of tools
with complex and custom compilers, languages, and dependencies. This hurts
everyone through burnout and gatekeeping. Few people understand the tools they
use everyday. You don't have to understand Haptic to use it, but know you're in
good company if you ever wish to look under the hood. It's only ~600 lines of
documented source code; 340 is its single-file reactive state engine.

You should be able to publish a modern reactive web app and understand the whole
programming stack. Haptic started as a way to help non-developers write code.

## Motivation

Haptic started as a rewrite of Sinuous in TS using TSX over tag templates for
HTML. The focus was on type safety, debugging, and leveraging the editor.
Sinuous taught the idea of being modular and supporting a flexible API that
supports multiple reactive libraries; including no reactivity at all. Haptic has
generalized this with `api.patch` but still maintains API-compatibility to
support community packages. Most of the hyperscript reviver code is borrowed but
the state library is now unrelated after many iterations.

The reactive state library was influenced by Sinuous, Solid, S.js, Reactor.js,
and Dipole.
