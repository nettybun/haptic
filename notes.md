# Notes

Hello :)

I still need to write documentation for Haptic; sorry it's been a while. The
drive to fork this into another repo was to simplify the codebase and provide
strict typings for both the engine and JSX. I succeeded in doing that by having
separate JSX typings for haptic (haptic/h+haptic/s) and haptic/h. The typings
allow people to easily patch in any other reactive libraries, not only haptic/s.

The codebase was simplified by adding strict typings, removing the monorepo
architecture, and removing build scripts to use esbuild instead. I hope that
it's something new developers can comfortably reason about. The code itself is
only about 200 lines for each of haptic/h and haptic/s.

I've been trying to optimize signals by reading a lot about other observer
implementations and the history of sinuous/observable. It's not looking great,
honestly. The more I read and test it the way reactivity is handled makes it
hard to debug code. This isn't specific to Haptic or Sinuous, but in general
observer architectures.

The rest of this document is about the issues with the observer pattern
architecture.

## Reactivity concerns

The current implementation works. I was happy to understand and re-implement
sinuous/observable as haptic/s and upstream questions and patches. It feels
really good out of the box as a solution to reactivity and fine-grained DOM
updating that is worth introducing new developers to. It's intuitive. However,
as I've dug into it more and pulled at the internals, I'm increasingly worried
the architecture won't scale to larger applications and that it isn't conducive
to debugging and performance analysis.

### Difficult to reason about

I've taken many pages of notes trying to understand this architecture. I've
authored the haptic/s library. Still, it's very hard reason about mentally and
to debug how the system is connected. This is made even worse in haptic/h where
it's hard to tell the coverage that an `api.subscribe` will have on a function.

### No debugging or global tracking

Things are beautiful and intuitive until there's an issue. Such as an infinite
render loop that's attaching/detaching a DOM element until the browser crashes.
How can a developer approach this for debugging? Unfortauntely there are no
metrics of who's calling who - all ws and cs functions have their lists built
into their functions and there's no global lookups. Developers don't have access
to those functions from anywhere; especially not a console. Even worse, signals
don't have names (`Function#name` is blank).

### Blurry definition of a computed

The line between computeds and functions is very blurry since `h()` will wrap
any and all functions in `api.subscribe`, turning it into a computed whether
there's a signal or not.

All computeds could be replaced by normal functions and `api.subscribe` will
achieve the same result of collecting all ws signals and listening to changes.
The subscription list will be the same since ws signals are normally passed up
from cs to cs.

### Predicting execution and lifetimes

Computed aren't lazy. They'll update immediately for a ws write, and are called
multiple times during a single ws write - let alone a series of back-to-back
writes outside of a transaction. Thankfully there's no recursion (seen in S.js)
but it's still a lot to wrap your head around the execution flow.

Understanding memory lifetimes and `unsubscribe()` is hard too. I was orignally
worried to learned that Sinuous _never_ calls unsubscribe. It seems dangerous.
However, reading Adam Haile's S.js documentation (what sinuous/observable is
based on) clears up the architecture very well. Turns out, automatic memory
handling is implemented on from the idea that a cs will unsubscribe/cleanup
itself _and_ all it's children (`csNested`) _on every update_. This takes down
the whole tree of computeds, destroying relationships between any ws and the
tree's cs signals. Afterwards, connections are re-established from scratch...

The idea of clearing and rebuilding the world each update is a React mindset;
aren't we better than that?

I started this research to find a way to disable subtrees of computeds that are
removed from the DOM or off-screen. I think I've found a way to do that via
onDetach/onAttach lifecycle hooks to save some work, but honestly the whole tree
is still updating non-stop when no one is looking. There's a lot of overhead.

### Unwinding hyperscript calls

I'll admit that some of the "complexity" and difficulty of reactivity comes from
the unwinding of `h()`, unrelated to haptic/s. Hyperscript, due to eager eval in
JS, is computed backwards. If you look at an `api.subscribe` block it's easy to
think _"oh this will apply to this node and all children"_ but actually the
children have already been dealt with and are `Node` types by now.

## Possible changes

I was wondering if h() needs to change, such as:

```tsx
<div class=#{signal}>This is some content: {variable} with a #{signal}</div>
```

Which explicitly shows a #{} subscription.

I don't want people to guess what subscriptions are happening under the hood.
It's too easy to accidentally make ws/cs connections by forgetting `api.sample`
or `api.capture` to prevent them. Developers also need to think about the
context of where code will run in the future - I ran into this writing `when()`
and despite being very experienced in this field of reactivity, it took a long
time to understand the issue.

Imagine this situation, for instance. You have two components.

```tsx
C1 = () => { return <div>{() => cond() ? '...' : <p>OK <C2/></p>}</div> }
C2 = () => { counter(counter()++); return <span>{expensiveMathCalc}</span> }
```

Here C2 isn't actually wanting to depend on counter; the author forgot to
isolate with `api.sample` - I mean why would they, their JSX doesn't use any
signals. (Notice, you don't know that by looking at `{expensiveMathCalc}`; you'd
need to visit that function (all the way down) and look for signals).

Will C1's render (`api.subscribe`) get `counter()` as a dependency?

Later when the counter updates because some other component did an increment,
will the engine re-run `cond()` and re-run C2? Does that trigger the counter
again, in an infinite loop? What about the expensive math calc? Oh no. It's hard
to reason about because things aren't explicit. You also can't debug after
initialization to see dependencies since their hidden in the ws/cs. Signal
dependencies are stored as one huge list of all children cs and ws, not broken
up by where they came from (and they're cleared/rebuilt each update!).

Developers need to be able to do `getDepsByNode(el)` or similar to return the
current state of the renderer: `{ marker, current, updateFn, signals }`.

It's tricky.

### Ref-couting?

When trying to figure out how to disable DOM updates for content that's off
screen or disconnected, I went through _a lot_ of iterations on designs but
found that the system complexity always goes up. I thought I'd do lazy cs
signals with ref-counting: once a subscribe() links to a lazy cs, it tells any
other cs signals to be less lazy; not exactly recompute, but push changes
upstream eventually hitting the subscribe signal again which will turn around
and pull from those cs/ws signals. It's hard to draw on paper.

### Separating by dimension

There's also a dimensionality problem between the mindset needed for thinking of
the component tree, execution tree, and DOM tree.

They're similar, but not the same.

If a `when()` block wants to disable signals on a subtree you're maybe thinking
in terms of component trees, but maybe also of the DOM tree and imagining how
similar code would use `querySelectorAll()` (which is a nice thought but can't
work even if signals were written to element attributes, because all possible
signals for a DOM tree aren't necessarily present at one time; they appear later
as done in C1/C2 above).

I'm not sure how to separate the dimensions that ws/cs run in, but doing so
could help understanding and intuition.

### Removing computeds

The distinction between computeds and general functions is confusing. There's
also an idea of a computed acting as a memo of sorts, but people should instead
use a memo that does less bookkeeping than a computed. In the very least it's
separated from the rest of the render functionality, making it easier to reason
about.

Computeds aren't lazy and will update _every_ dependency change. There's
batching, via transactions, but honestly no one thinks about using them until
after issues arise. Instead, today's systems are fast enough to not think about
all the unneeded recalculations. Other libraries have this batching issue too:
in Hyperactiv they use a debounce period (yes really) to batch based on time.

### Wrapping root/capture around all components

I'm not sure if wrapping all `h()` component calls in `api.capture/root` will
fix the C1/C2 problem (if that problem exists). I get confused thinking about
how dimensionality may play into this issue in ways I can't see right now.

## New approach

Here's a pitch: There's writable signals and side-effects. There aren't
computeds; use functions. Side effects don't return a value; they're void. When
a ws updates, it tells a global handler which queues a rAF that will, later,
update the corresponding se blocks.

This way many ws signals can update and only after the JS main-loop is done do
the effects update once. It's built-in transactions.

If no ws is called, then no se is stale, then the rAF isn't even scheduled.

If you need a memo use a memo. That has less bookkeeping than a computed did.

There's no tree of nested signals. There's only ws. The se aren't even in the
same JS execution.

This could introduce infinite loops if an se sets a ws. That's OK! There's a
global handler, so debugging why a rAF is called and by who should be easier.

This might be a cleaner way to do signals. I'll try it someday ✨
