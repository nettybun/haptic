# Reactive state engine

Defines _signals_ as read/write reactive variables, and _cores_ as reactive
functions. These two are wired together as subscriptions to enable reactivity.

Wiring happens when a core runs. Cores are defined by their function which does
some work using signals. This function is called with a subscription-token "$"
that can be given to signals when reading their values. This creates a
subscription to that signal, and any writes to subscribed signals will run the
core again. To read without subscribing simply don't use the token; there is no
need for `sample()` as seen in other libraries.

**Signals** can be read-passed, read-subscribed (using a token), and written to.
If a core is written to a signal, the signal becomes a "computed-signal" which
caches the value of the core and is lazy in its evaluation - it only runs the
core to update the value if absolutely necessary.

**Cores** manage a function. This function can be replaced (in `api.patch` this
is used for re-renders). Cores produce a subscription token which can be given
to signals during a read. They keep track of which signals have been read-passed
and which have been read-subscribed to enforce consistency. They're implemented
as finite-state-machines and cannot infinitely loop. They also keep track of how
many times they've been run.

The system is tolerant to thrown errors and uses proper function naming to
display meaningful stacktraces in both signals and cores.

It's 876 bytes min+gzip on its own.

It's normal ESM and can be used by itself in any JS environment, no DOM needed.
