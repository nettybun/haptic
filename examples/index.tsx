import { h } from '../src';
import { rxKnown, rxStates, vocals, rx } from '../src/v';

const data = vocals({
  text: '',
  count: 0,
  registryContent: '',
});

const Page = () =>
  <main>
    {/* TODO: No? Reactions don't return anything... */}
    <p>This has been clicked {rx(data.count)} times</p>
    <input
      placeholder='Type something...'
      value={rx(data.text)}
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
        // Ugh reactions can't return anything...
        rx($ => {
          return data.count($) < 5
            ? Math.PI * data.count($)
            : `Text: "${data.text($)}" is ${data.text($).length} chars`;
        })
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
          state: rxStates.get(rx.state) || '?',
        };
      });
      console.log(reg);
      data.registryContent(JSON.stringify(reg, null, 4));
    }}>
      Load rx registry
    </button>
    <pre>{rx(data.registryContent)}</pre>
  </main>;

document.body.innerHTML = '';
document.body.appendChild(<Page/>);

// console.log(data.count($)); // TODO: Is this less awkward syntax?
