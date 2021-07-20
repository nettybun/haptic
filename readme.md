# Haptic

Reactive web rendering in TSX with no virtual DOM, no compilers, and no magic.
It's under 1600 bytes min+gz.

```tsx
import { h } from 'haptic';
import { signal, core } from 'haptic/wire';
import { when } from 'haptic/util';

const data = signal({
  count: 0,
  countNext: core($ => data.count($) + 1),
});

// Create a single anonymous signal
const text = signal.anon(100);
// Create a single signal
const { name } = signal({ name: 100 })

const Page = () =>
  <div>
    <button onClick={data.count(data.count() + 1)}>
      Increment up to {core(data.countNext)}
    </button>
    <p>Content below changes when <code>data.count > 5</code></p>
    {when(core($ => data.count($) > 5 ? "T" : "F"), {
      T: () => <p>There have been more than 5 clicks</p>,
      F: () => <p>Current click count is {core(data.count)}</p>,
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
comes with its own reactive library packaged as `haptic/wire`. The `haptic`
package is Haptic DOM with Haptic Wire set as the reactivity engine. It also
modifies the JSX namespace to accepts cores as element attributes and children.

### Reactivity

_TODO: Example snippets. Try to do a light overview and then redirect to ./wire/readme.md_

Reactivity is wired into a page explicitly by subscribing signals and cores.
This is then debuggable at runtime with proper naming and lookups.

<...>

Haptic leverages your editor to help you catch errors and misunderstandings
while writing - before the code is ever run.

_TODO: Link to screenshots as done in issue #5_

## Ideas and Values

Haptic's focus is to be good inside and out. Libraries do this best when they
help developers and non-developers alike; some good values are being intuitive,
explicit, short, and transparent. Haptic does this by focusing on vanilla TS/JS
rather than a DSL, being small with no dependencies, and being descriptive and
recoverable about errors. An unfortunate trend on the web is to to over-engineer
tools with complex and custom compilers, languages, and dependencies. This hurts
everyone through burnout and gatekeeping. Few people understand the tools they
use everyday. You don't have to understand Haptic to use it, but know you're in
good company if you ever wish to look under the hood. It's only ~600 lines of
documented source code; 320 is its single-file reactivity engine.

You should be able to publish a modern reactive web app and understand the whole
programming stack. Haptic started as a way to help non-developers write code.

## Inspiration

Haptic started as a rewrite of Sinuous in TS using TSX over tag templates for
HTML. The focus was on type safety, debugging, and leverging the editor. Sinuous
originally taught the idea of being modular and supporting a flexible API that
supports multiple reactive libraries; including no reactivity at all. Haptic has
generalized this with `api.patch` but still maintains API-compatibility to
support community packages. Most of the hyperscript reviver code is still
borrowed, but the reactivity engine has been replaced with Haptic Wire.

Wire was influenced by Sinuous, Solid, S.js, Reactor.js, and Dipole.
