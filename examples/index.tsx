/* eslint-disable @typescript-eslint/no-unused-vars */

import { h, api } from '../src/index.js';
import { wS, wR, v$ } from '../src/wire/index.js';

// TypeScript #43683 helped me figure this out
const data = wS({
  text: '',
  count: 0,
  countPlusOne: wR(($): number => {
    console.log('Conputing countPlusOne');
    return data.count($) + 1;
  }),
  countPlusTwo: wR(($): number => {
    console.log('Conputing countPlusTwo');
    return data.countPlusOne($) + 1;
  }),
});

// @ts-ignore
Object.assign(window, { api, data, wR, wS });

// TODO: insertPatcher(el, value) and propertyPatcher(el, prop, value)
// api.patchHandler = regDebugPatchHandler;

const externallyDefinedReactorTest = wR(($) => {
  return `data.text chars: ${data.text($).length}; `
    + `data.count chars: ${String(data.count($)).length}`;
});

const externalReactorMacroTest = ($ = v$) => {
  data.count($);
};
// Subscribe to both data.text and data.count
wR(($) => {
  data.text($);
  externalReactorMacroTest($);
});
// Subscribe to only data.text
wR(($) => {
  data.text($);
  // This doesn't write "undefined" to data.count:
  externalReactorMacroTest();
});
// Subscribe to only data.text
wR(($) => {
  data.text($);
  // Explicit and function author doesn't need to specify a default parameter:
  externalReactorMacroTest(v$);
});

const Page = () =>
  <main>
    <p>This has been clicked {wR(data.count)} times</p>
    <p>Initial countPlusOne (never updated): {data.countPlusOne()}</p>
    <input
      placeholder='Type something...'
      value={wR(data.text)}
      onInput={(ev) => {
        // Use setNotEqual so arrow keys and pasting identical text doesn't trigger
        // Think of setNotSeen which collects a Set of seen values. NEAT.
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
