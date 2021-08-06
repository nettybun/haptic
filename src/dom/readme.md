# Hyperscript/TSX reviver

This is a fork of the `sinuous/h` package from Sinuous. It was ported to
TypeScript, simplified in a few places, and now uses a general `api.patch()`
method to support DOM updates with any reactive library. There's no reactivity
baked into `haptic/dom`. Haptic configures reactivity in the primary `haptic`
package where it pairs this reviver with `haptic/state`.

It's 964 bytes min+gzip on its own.

Designed to be explicit, type safe, and interoperable with the Sinuous
ecosystem. The Sinuous repository lists some [community packages][1].

This `haptic/dom` package exports a vanilla JSX namespace that doesn't expect or
support any reactive functions as elements or attributes. To use a reactive
library of your choice, repeat how the `haptic` package configures `api.patch`
and the JSX namespace for `haptic/state`.

## `h(tag: Tag, props?: unknown, ...children: unknown[]): El | undefined`

```ts
type El = Element | Node | DocumentFragment;
type Tag = El | Component | [] | string;
type Component = (...args: unknown[]) => El | undefined;
```

The hyperscript reviver. This is really standard. It's how trees of elements are
defined in most frameworks; both JSX and traditional/transpiled `h()`-based
system alike.

The only notable difference from other frameworks is that functions inlined in
JSX will be serialized to strings. This is a deviation from Sinuous' reviver
which automatically converts any function to a `computed()` (their version of a
computed-signal) in order to support DOM updates. Haptic's reviver explicitly
only targets wires inlined in JSX - any non-wire function is skipped.

The following two uses of `h()` are equivalent:

```tsx
import { h } from 'haptic/dom';

document.body.appendChild(
  h('div', { style: 'margin-top: 10px;' },
    h('p', 'This is content.')
  )
);

document.body.appendChild(
  <div style='margin-top: 10px;'>
    <p>This is content</p>
  </div>
);
```

## `api: { ... }`

The internal API that connects the functions of the reviver allowing you to
replace or configure them. It was ported from Sinuous, and maintains most of
their API-compatibility, meaning Sinuous community plugins should work.

Read `./src/dom/index.ts` for the available methods/configurations.

Typically the usecase is to override methods with wrappers so work can be done
during the render. For example, I wrote a package called _sinuous-lifecycle_
that provides `onAttach` and `onDetach` lifecycle hooks and works by listening
to API calls to check for components being added or removed.

Here's a simple example:

```tsx
import { api } from 'haptic';

const hPrev = api.h;
api.h = (...rest) => {
  console.log('api.h:\t', rest);
  return hPrev(...rest);
};

const addPrev = api.add;
api.add = (...rest) => {
  console.log('api.add:\t', rest);
  return addPrev(...rest);
};

<p>This is a <em>test<em/>...</p>
```

This will log:

```
api.h:   ["em", null, "test"]
api.add: [<em>, "test"]
api.h:   ["p", null, "This is a", <em>, "..."]
api.add: [<p>, "This is a"]
api.add: [<p>, <em>]
api.add: [<p>, "..."]
```

## `svg(closure: () => Node)): El | undefined`

Tells Haptic's reviver to create SVG namespaced DOM elements for the duration of
the closure. This means it uses `document.createElementNS` instead of the usual
HTML `document.createElement`. Without this, elements like `<title>` would have
very different behaviour.

Usage:

```tsx
import { h, svg } from 'haptic'; // or 'haptic/dom';

cosnt <Page> = () =>
  <p>HTML text with an add icon {svg(() =>
    <svg viewBox="0 0 15 15" fill="none" width="15" height="15">
      <path d="M7.5 1v13M1 7.5h13" stroke="#000"/>
    </svg>
  )} inlined in the sentence.
  </p>;

document.body.appendChild(<Page/>);
```

[1]: https://github.com/luwes/sinuous#community
