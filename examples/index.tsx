import { h } from '../publish';
import { rxKnown, vocals } from '../publish/v';

// Avoid TS any type...
import type { VocalSubscriber } from '../publish/v';

type $ = VocalSubscriber
// const z = (rx: (s: VocalSubscriber) => unknown) => rx;

const data = vocals({
  text: '',
  count: 0,
  registryContent: '',
});

const Page = () =>
  <main>
    <p>This has been clicked {(s:$) => s(data.count)} times</p>
    <input
      placeholder='Type something...'
      value={s => s(data.text)}
      // @ts-ignore TODO:
      onKeyUp={ev => {
        // @ts-ignore TODO:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.text(ev.target.value);
      }}
      style='display:block'/>
    <button onClick={() => data.count(data.count() + 1)}>Inc</button>
    <p>Here's math:
      {
        (s:$) => s(data.count) < 5
          ? Math.PI * s(data.count)
          : `Text: "${s(data.text)}" is ${s(data.text).length} chars`
      }
    </p>
    <button onClick={() => {
      const reg: Record<string, unknown> = {};
      rxKnown.forEach(rx => {
        reg[rx.id] = {
          /* eslint-disable key-spacing */
          fn   : rx.fn.name,
          sr   : [...rx.sr].map(x => x.id),
          pr   : [...rx.pr].map(x => x.id),
          inner: [...rx.inner].map(x => x.id),
          runs : rx.runs,
          depth: rx.depth,
          state: rx.state,
        };
      });
      console.log(reg);
      data.registryContent(JSON.stringify(reg, null, 4));
    }}>
      Load rx registry
    </button>
    {/* TODO: This syntax is more awkward than I thought it would be */}
    <pre>{(s:$) => s(data.registryContent)}</pre>
  </main>;

document.body.innerHTML = '';
document.body.appendChild(<Page/>);

// console.log(data.count($)); // TODO: Is this less awkward syntax?
