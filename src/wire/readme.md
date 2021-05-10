Reactivity engine for Haptic.

Defines _signals_ as read/write reactive variables, and _cores_ as reactive
functions. These two are wired together as _subscriptions_ to enable reactivity.

Wiring happens when a core runs and gives its subscription-token "$" to signals
when reading their values. When subscribed, any writes to those signals will
call the core to clear subscriptions and rerun.

**Signals** can be read-passed, read-subscribed (using a token), and written to.
If a core is written to a signal, the signal becomes a "computed-signal" which
caches the value of the core and is lazy in its evaluation - it only runs the
core to update the value if absolutely necessary.

**Cores** manage a function. This function can be replaced, and Haptic DOM uses
this to patch web content. Cores produce a subscription token which can be given
to signals during a read. They keep track of which signals have been read-passed
and which have been read-subscribed to enforce consistency. They're implemented
as finite-state-machines and cannot infinitely loop. They also keep track of how
many times they've been run.

The system is tolerant to thrown errors and uses proper function naming to
display meaningful stacktraces in both signals and cores.

It's 880 bytes min+gzip on its own.

It can be used without the rest of Haptic, such as in Node/Deno.
