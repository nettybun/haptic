/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { signal, wire } from '../src/state/index';
import type { Signal, Wire } from '../src/state/index';

import {} from 'zora';

// Because these only exist in TypeScript `declare` and esbuild `--define`
Object.assign(globalThis, {
  S_RUNNING: 4,
  S_SKIP_RUN_QUEUE: 2,
  S_NEEDS_RUN: 1,
});

// ❯ npm run build
// ❯ cat test/haptic.test.ts | sed 's|../src/state/index.js|haptic/state|g' | npx esbuild --loader=ts | node --input-type=module

const state = signal({
  count: 0,
  countPlusOne: wire(function cPO($): number {
    console.log('Computing countPlusOne');
    return state.count($) + 1;
  }),
  countPlusTwo: wire(function cPT($): number {
    console.log('Computing countPlusTwo');
    return state.countPlusOne($) + 1;
  }),
});

const handlerFor = <T>(name: keyof typeof state): ProxyHandler<Signal<T>> => ({
  apply: function(sig, thisArg, arg) {
    if (arg.length === 0) {
      console.group(`R: state.${name}()`);
      const v = sig();
      console.log(`-> ${v}`);
      console.groupEnd();
      return v;
    }
    if (arg.length === 1) {
      console.group(`W: state.${name}(${arg[0]})`);
      sig(arg[0]);
      console.groupEnd();
      return;
    }
    throw '>1 signal argument';
  },
});

const stateProx = {} as typeof state;
let k: keyof typeof state;
for (k in state) stateProx[k] = new Proxy(state[k], handlerFor(k));

const w = wire(function effect($) {
  console.log('Effect: count is', state.count($));
  // state.countPlusOne($);
  // state.countPlusTwo($);
});
w();

stateProx.count(1);
stateProx.count(2);
stateProx.count(3);
stateProx.countPlusTwo();

console.log('count wires', [...state.count.wires].map((x) => x.name));

console.log('cPO wires', [...state.countPlusOne.wires].map((x) => x.name));
console.log('cPO cw.sigRS', [...(state.countPlusOne.cw as Wire).sigRS].map((x) => x.name));

console.log('cPT wires', [...state.countPlusTwo.wires].map((x) => x.name));
console.log('cPT cw.sigRS', [...(state.countPlusTwo.cw as Wire).sigRS].map((x) => x.name));

// console.log('Turn effect wire off');
// wireReset(w);

stateProx.count(4);
stateProx.countPlusTwo();
stateProx.countPlusOne();
stateProx.countPlusTwo();
