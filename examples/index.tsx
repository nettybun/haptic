import { h, api } from '../src/index.js';
// import { wS, wR } from '../src/w/index.js';
import type { WireReactor, WireSignal, SubToken } from '../src/w/index.js';

import {
  regDebugRender,
  regDebugPatchHandler,
  regDebugTrackSignalSubscriptions
} from './registryDebugging.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type X = any;
declare function wR<T>(fn: ($: SubToken) => T): WireReactor<T>;

declare function wS1<T extends {
  [K in keyof T]: (() => X) | T[K]
}>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends () => () => infer R ? R : T[K]>;
}
const data1 = wS1({
  text: '',
  count: 0,
  countPlusOne: () => () => data1.count() + 1,
  countPlusTwo: () => () => data1.countPlusOne() + 1,
});

// This works. Least verbose working version...
declare function wS2<T extends {
  [K in keyof T]: (($: SubToken) => X) | T[K]
}>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends ($: SubToken) => () => infer R ? R : T[K]>;
}
const data2 = wS2({
  text: '',
  count: 0,
  countPlusOne: ($) => () => data2.count($) + 1,
  countPlusTwo: ($) => () => data2.countPlusOne($) + 1,
});

// This works. Somewhat verbose...
declare function wS3<T extends {
  [K in keyof T]: (($: SubToken) => X) | T[K]
}>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends ($: SubToken) => infer R ? R : T[K]>;
}
const data3 = wS3({
  text: '',
  count: 0,
  countPlusOne($): number {
    return data3.count($) + 1;
  },
  countPlusTwo($): number {
    return data3.countPlusOne($) + 1;
  },
});

// This works. Extremely verbose though...
declare function wS4<T extends {
  [K in keyof T]: (() => WireReactor<X>) | T[K]
}>(obj: T): {
  [K in keyof T]: WireSignal<T[K] extends () => WireReactor<infer R> ? R : T[K]>;
}
const data4 = wS4({
  text: '',
  count: 0,
  countPlusOne(): WireReactor<number> {
    return wR(($) => data4.count($) + 1);
  },
  countPlusTwo(): WireReactor<number> {
    return wR(($) => data4.countPlusOne($) + 1);
  },
});

const data = data4;

// @ts-ignore
window.data = data;

// TODO: insert.patch(el, value) and property.patch(el, prop, value)
api.patchHandler = regDebugPatchHandler;
regDebugTrackSignalSubscriptions(Object.values(data));

const externallyDefinedReactorTest = wR(($) => {
  return `data.text chars: ${data.text($).length}; `
    + `data.count chars: ${String(data.count($)).length}`;
});

const Page = () =>
  <main>
    <p>This has been clicked {wR(data.count)} times</p>
    <p>Squared, that's {data.countPlusOne()}</p>
    {/* This currently, incorrectly, returns the function rather than calling it
    until you pass it back into itself because it's wired to understand writes
    only, not the initial creation */}
    <input
      placeholder='Type something...'
      value={wR(data.text)}
      onInput={(ev) => {
        data.text(ev.currentTarget.value);
      }}
      style='display:block'/>
    <button onClick={() => data.count(data.count() + 1)}>Inc</button>
    <p>Here's math:
      {wR(($) => data.count($) < 5
        ? Math.PI * data.count($)
        : `Text: "${data.text($)}" is ${data.text($).length} chars`)}
    </p>
    <p>Here's math again as $(v, v):
      {wR(($) => {
        const [count, text] = $(data.count, data.text);
        return (count < 5
          ? Math.PI * count
          : `Text: "${text}" is ${text.length} chars`);
      })}
    </p>
    <p>Functions that aren't reactors? {() => <span>Function is serialized</span>}</p>
    <p>{externallyDefinedReactorTest}</p>
  </main>;

document.body.appendChild(<Page/>);

const regEl = <pre/>;
regDebugRender(regEl);
document.body.appendChild(regEl);
