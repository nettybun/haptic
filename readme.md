# Haptic

Reactive web rendering in TSX with no virtual DOM, no compiler, no special
tooling, and no magic. It's 1.4kb min+gz before tree-shaking.

This is a fork of Sinuous that simplifies the programming stack and developer
experience for reactive rendering. It does this by staying close to vanilla
TS/JS, being small, and being explicit.

Haptic is against the trend of frameworks that appear simple to use by moving
their complexity into custom compilers, tooling, and dependencies. This
over-engineering causes never ending development and specifically hurts new
developers who are trying to learn.

There's minimum hidden complexity in Haptic. It's ~500 lines of source code; 220
of which is the single-file reactivity engine called haptic/w. Reactivity is
wired into a page explicitly by subscribing signals and reactors. This is then
debuggable at runtime with proper naming and lookups.

Its first goal is to setup non-developers (i.e partners/friends) on the path to
building basic web apps they can understand.

It's a work in progress but nearing completion.
