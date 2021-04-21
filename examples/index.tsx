/* eslint-disable @typescript-eslint/no-unused-vars */

import { h, api } from '../src/index.js';
import { wS, wR } from '../src/w/index.js';
import type { WireReactor, WireSignal, SubToken } from '../src/w/index.js';

// import {
//   regDebugRender,
//   regDebugPatchHandler,
//   regDebugTrackSignalSubscriptions
// } from './registryDebugging.js';

// TypeScript #43683 helped me figure this out
const data = wS({
  text: '',
  count: 0,
  // TODO:
  // - `name: () => X` works but will need ($: SubToken) manually defined

  // - `($): number => X` works but needs X type manually defined. This also
  //    isn't great for being transparent and honest. All I see in wS is X is a
  //    function. What if they accidentally passed a function not knowing about
  //    computed signals at all. It's best to be explicit. `$name: () => wR`
  //    would be most explicit and less accidental? TS can use tag template
  //    types to detect $ but what about error handling then? I still have to
  //    call the function though, which isn't great... That could have side
  //    effects and what if I call it to unpack the wR and it's not a wR. ohno.

  // - `wR($ => X)` directly needs X type manually defined. However, it's
  //    easiest to check in wS, it's most explicit, zero accidents, and $ is
  //    typed because wR... Writing the return type isn't super fun but it will
  //    error if its wrong so it's not as bad as "as T" like I originally
  //    thought; it's type safe.

  countPlusOne: wR(($): number => data.count($) + 1),
  countPlusTwo: wR(($): number => data.countPlusOne($) + 1),
});

// @ts-ignore
Object.assign(window, { data, wR, wS, api });

// TODO: insert.patch(el, value) and property.patch(el, prop, value)
// api.patchHandler = regDebugPatchHandler;
// regDebugTrackSignalSubscriptions(Object.values(data) as WireSignal[]);

const externallyDefinedReactorTest = wR(($) => {
  return `data.text chars: ${data.text($).length}; `
    + `data.count chars: ${String(data.count($)).length}`;
});

const Page = () =>
  <main>
    <p>This has been clicked {wR(data.count)} times</p>
    <p>Initial countPlusOne (never updated): {data.countPlusOne()}</p>
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

// const regEl = <pre/>;
// regDebugRender(regEl);
// document.body.appendChild(regEl);
