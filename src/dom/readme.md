# Hyperscript/TSX reviver

This is a fork of the Sinuous "h" package that has been ported to TypeScript,
simplified in a few places, and adapted to support a general [`api.patch()`][1]
method for reactive libraries. As a package, haptic/dom isn't tied to any
reactive library, so while Haptic as a bundle defaults to [haptic/wire][2],
others such as sinuous/observable, mobx, and hyperactiv should work fine. This
package can also be used without reactivity at all.

It's 964 bytes min+gzip on its own.

Designed to be explicit, type safe, and interoperable with the Sinuous
ecosystem. The Sinuous repository lists some [community packages][3].

This package exports a vanilla JSX namespace that doesn't expect any reactive
functions as elements or attributes. To support a reactive library, see the main
Haptic package which [overwrites this JSX namespace][4] to support Haptic Wire;
follow a similar process to support another library of your choice.

## `h()`

## `api()`

[1]: https://github.com/heyheyhello/haptic/blob/haptic-w/src/index.ts#L26
[2]: https://github.com/heyheyhello/haptic/tree/haptic-w/src/wire
[3]: https://github.com/luwes/sinuous#community
[4]: https://github.com/heyheyhello/haptic/blob/haptic-w/src/index.ts#L42
