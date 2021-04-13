import { h, api } from '../src/index.js';
import { wireSignals, wR } from '../src/w/index.js';

import {
  regDebugRender,
  regDebugPatchHandler,
  regDebugTrackSignalSubscriptions
} from './registryDebugging.js';

const s1 = wireSignals({
  text: '',
  count: 0,
});
const c1 = wireSignals({
  countSquared: wR(($) => s1.count($) ** 2),
});
const c2 = wireSignals({
  countSquaredSquared: wR(($) => c1.countSquared($) ** 2),
});
const data = { ...s1, ...c1, ...c2 };

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
    <p>Squared, that's {data.countSquared()}</p>
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
