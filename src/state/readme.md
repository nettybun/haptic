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

It's 908 bytes min+gzip on its own.

It's normal ESM and can be used by itself in any JS environment, no DOM needed.

## Signals

These are reactive read/write variables who notify subscribers when they've been
written to. They are the only dispatchers in the reactive system.

```ts
const state = signal({
  name: 'Deciduous Willow',
  age: 85,
});

state.name;           // [Function: signal|0{name}]
state.name();         // 'Deciduous Willow'
state.name('Willow');
state.name();         // 'Willow'
```

The subscribers to signals are wires, which will be introduced next. They
subscribe by read-subscribing the signal. This is an important distinction -
signals have two types of reads!

```ts
state.name();  // Passive read (read-pass)
state.name($); // Subscribed read (read-subscribe)
```

This is unlike other reactive libraries, but it'll save us a lot of debugging.
Separating the reads it makes subscribed reads an explicit and visually distinct
action from passive reads. This makes Haptic an opt-in design, and it doesn't
need the `sample()` function seen in other libraries. This is explained later
when introducing wires, which is also where the `$` value comes from.

Both signals and wires are tagged with a name and identifier to help debugging.
In the above example it was `signal|0{name}`. This is the actual JS function
name, so developer tools will show it by default when inspecting values, logging
to the console, and in error stacktraces. It helps greatly with visualizing the
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

Any value can be written and stored in a signal, but if a wire is written, the
signal becomes a __lazy computed-signal__ that returns the result of the wire's
function. It's like using a formula in a spreadsheet. These are really efficient
and only rerun the wire when dependencies mark the result as stale. These are
introduced later on.

## Wires

These are task runners who subscribe to signals and react to signal writes. They
hold a function (the task) and manage its subscriptions, nested wires, run
count, and other metadata. The wire provides a "\$" token to the function call
that, at your discretion as the developer, can use to read-subscribe to signals.

```ts
wire($ => {
  // Explicitly subscribe to state.name using the subtoken "$"
  console.log("Update to state.name:", state.name($));
})
```

Earlier, when introducing signals, I mentioned a `sample()` method isn't needed.
Let's dive into that. Consider this code:

```ts
wire($ => {
  const name = state.name($);
  console.log("Update to state.name:", name);
  // Calling a function...
  if (name.length > 10) pushToNameQueue(name);
})
```

**_Is this safe?_** i.e can we predict the subscriptions for this system? In
many reactive libraries the answer is no... We don't know what's happening in
that function call, so it could make any number of subscriptions by reading
other signals. These accidental subscriptions would cause unexpected runs that
can be hard to debug. **In Haptic, it's safe**. The `$` token wasn't passed to
the function call, so we can guarantee our wire only subscribes to `state.name`.

In other libraries you need to remember to wrap all function calls in `sample()`
to opt-out of subscriptions. In Haptic, you pass around "$".

Here's some other features about wires:

  - They track which signals are read-passed and which are read-subscribed to
    maintain read consistency; if the same signal does `sig($)` and `sig()` the
    wire will throw.

  - They're finite-state-machines that can be reset, running, idle, paused, and
    stale. They use the FSM state to stop infinite loops, skip being run when
    paused or when part of a computed-signal, and knowing if they need to run
    once they're resumed.

  - They keep track of how many times they've run. This is useful for profiling
    and debugging.

  - The wire function has post-run tasks which are used to piggyback on a wire
    run in a non-destructive way. It may not seem immediately useful, but this
    is how `api.patch` wires reactivity into the DOM and is also why a single
    wire to be patched into multiple places in the DOM. Computed-signals update
    their stored values this way too.

  - In the rare case that a function (maybe third party) requires a "\$" token
    as a parameter but you don't want to consent to unknown subscriptions in
    your wire, you can import and pass the void-token "\$v" instead.

Lastly, this is a more complex example using wires and signals to build a small
application:

```tsx
const data = signal({
  text: '',
  count: 0,
});

// Wiring in the DOM
document.body.appendChild(
  <div>
    <h1>"{wire(data.text)}"</h1>
    <p>Uses {wire($ => data.text($).length)} characters of text</p>
    <input
      value={wire(data.text)}
      onInput={(ev) => data.text(ev.currentTarget.value)}
    />
  </div>
);

// Wiring a general subscription, as an effect
wire($ => {
  console.log('Text was updated to', data.text($)); // Read-Subscribe
  console.log('The count also happens to be', data.count()); // Read-Pass
})();
```

In the above example, typing in the input box updates the text signal and causes
updates to the DOM and logs to the console. However, updates to the count signal
don't update anything; no one is subscribed.

## Computed-Signals

This is Haptic's version of a `computed()` seen in other reactive libraries.
It's like writing a formula in a spreadsheet cell rather than a static value.

```ts
const state = signal({
  name: 'Deciduous Willow',
  age: 85,
  // This defines a lazy computed-signal
  nameReversed: wire(($): string =>
    state.name($).split('').reverse().join()),
});
```

The wire for `nameReversed` has never run at this point. It will only run when
the signal is read, such as `state.nameReversed()`. It'll cache this value, so
subsequent reads are cheap and avoid the computation. When `name` is changed, it
marks `nameReversed` as stale, so the next read will require the wire run.

Here's another example that reads/runs computed-signals "backwards" while still
behaving as expected:

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

---

## Nice principals about state

- Reading a signal (pass-read) is always safe. There should be no reason to wish
  you could snake around the function call by reading the stored value directly.
  This is because Haptic is explicit and there's no accidental subscriptions.

- Wires can always be manually run by calling them and this won't cause other
  side-effects within the engine or trigger other chain reactions. It's safe to
  debug by calling.

- Similarly, its expected that people will try interacting with wires and
  signals in the console. I try to make that debugging experience nice.

- There's readable and consistent naming; no shorthand notations in code and
  function properties. They also all have nice JSDoc comments for your editor.

- Computed-signals are lazy and will do their best to avoid redoing work. They
  don't even run when initialized.

- Creating a computed-signal by writing an active/used wire into a signal
  provides a _reasonable_ experience but I don't recommend it. The wire will
  work as expected **until it is reset/unsubscribed by a subsequent write** to
  which replaces the wire. I've prioritized having consistent signal behaviour
  so writes _always_ write. I stop the wire so it doesn't keep running in the
  void and never get garbage collected. I don't want to throw or complain that
  the wire needs to be dealt with, so I default to resetting it. I understand
  this doesn't make everyone happy. If you plan to ever convert a
  computed-signal to a normal signal take care to re-run the wire if needed.

## Concerns

- Converting a computed-signal to a signal via write isn't very explicit. It
  could be an accident. Is that OK? Depends what camp you're in. The "save the
  wires" camp wants writes to not disturb the wire. The "signals are signals"
  camp wants to maintain consistent write behaviour. Haptic does the latter.
