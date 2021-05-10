Hyperscript reviver for JSX in Haptic.

This is a fork of the Sinuous "h" package that has been ported to TypeScript,
simplified in a few places, and adapted to support a general [`api.patch()`][1]
method for reactive libraries. This package isn't tied to [Haptic Wire][2] and
can be used with any reactive library such as Sinuous, MobX, Hyperactiv, and
other friends. It can also be used without reactivity at all.

It's 920 bytes min+gzip on its own.

Designed to be explicit, type safe, and interoperable with the Sinuous
ecosystem. The Sinuous repository lists some [community packages][3].

This package exports a vanilla JSX namespace that doesn't expect any reactive
functions as elements or attributes. To support a reactive library, see the main
Haptic package which [overwrites this JSX namespace][4] to support Haptic Wire;
follow a similar process to support another library of your choice.

[1]: https://github.com/heyheyhello/haptic/blob/haptic-w/src/index.ts#L26
[2]: https://github.com/heyheyhello/haptic/tree/haptic-w/src/wire
[3]: https://github.com/luwes/sinuous#community
[4]: https://github.com/heyheyhello/haptic/blob/haptic-w/src/index.ts#L42
