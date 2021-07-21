# Reactive state

Defines __signals__ as read/write reactive variables, and __wires__ as reactive
functions. These are linked together into "subscriptions" to enable reactivity.

Subscriptions are a two-way linking between wires and signals, and are setup
when a wire runs its function. After, when a signal is written to, it runs all
of its subscribed wires. Subscribing is an explicit opt-in process, explained
below; there's no need for a `sample()` function found in other libraries.

The reactivity engine is resilient to errors. Individual signals and wires can
throw without disrupting the system. To help debugging, meaningful function
names are generated for both signals and wires and these show up naturally in
developer tools, console.log, and error stacktraces.

It's 876 bytes min+gzip on its own.

It's normal ESM and can be used by itself in any JS environment, no DOM needed.

## Signals

These are reactive variables and are the dispatchers of the reactive system.
They break read/write into two types of reads, unlike other reactive libraries:
read-pass or read-subscribe. This makes subscribing to a signal an explicit and
visually distinct action from a normal signal read. Haptic is opt-in and doesn't
need a `sample()` function to support opt-outs.

Any value can be written and stored in a signal. If a wire is written, the
signal becomes a __lazy computed-signal__ that returns the result of the wire's
function. These are really efficient and only rerun the wire when dependencies
mark the result as stale.

```ts
const state = signal({
  name: 'Deciduous Willow',
  age: 85,
  // This defines a lazy computed-signal
  nameReversed: wire(($): string =>
    state.name().split('').reverse().join()),
});

state.name;           // [Function: signal|0{name}]
state.name();         // 'Deciduous Willow'
state.name('Willow');
state.name();         // 'Willow'
```

You'll notice that signals are tagged with a name and identifier. This helps
debugging. Wires are named this way too. Developer tools show this name by
default when inspecting values, and this helps greatly with visualizing the
subscriptions between signals and wires.

Sometimes defining an entire state object can be too much overhead. To skip
naming, there's a `signal.anon()` function to directly return an unnamed signal
that's not packed into an object.

```ts
// Named as [Function: signal|1{ans}]
const { ans } = signal({ ans: 100 });

// Anonymous as [Function: signal|1{}]
const ans = signal.anon(100);
```

## Wires

These are task runners who subscribe to signals and react to signal writes. They
hold a function (the task) and manage its subscriptions, nested wires, run
count, and other metadata. The wire provides a "\$" token to the function call
that, at your discretion as the developer, can use to read-subscribe to signals.

Here are some features about wires:

  - They track which signals are read-passed and which are read-subscribed to
    maintain read consistency; if the same signal does `sig($)` and `sig()` the
    wire will throw.

  - They're finite-state-machines that can be reset, running, idle, paused, and
    stale. They use the FSM state to stop infinite loops, skip runs when paused,
    and resume work (if needed) when unpaused.

  - They keep track of how many times they've run. This is useful for profiling
    and debugging.

  - The wire function `wire.fn` can be replaced. It may not seem immediately
    useful, but this is how `api.patch` wires reactivity into the DOM and is
    also why a single wire to be patched into multiple places in the DOM.

  - In the rare case that a function (maybe third party) requires a "\$" token
    as a parameter but you don't want to consent to unknown subscriptions in
    your wire, you can import and pass the void-token "\$v" instead.

```tsx
const data = signal({
  text: '',
  count: 0,
});

// Wiring in the DOM
document.body.appendChild(
  <div>
    <h1>"{wire(data.text)}"</h1>
    <p>Uses {wire($ => data.text().length)} characters of text</p>
    <input
      value={wire(data.text)}
      onChange={(ev) => data.text(ev.currentTarget.value)}
    />
  </div>
);

// Wiring a general subscription, as an effect
wire($ => {
  console.log('Text was updated to', data.text($)); // Read-Subscribe
  console.log('The count also happens to be', data.count()); // Read-Pass
});
```

In the above example, typing in the input box updates the text signal and causes
updates to the DOM and logs to the console. However, updates to the count signal
don't update anything; no one is subscribed.
