import { h } from '../src';
import { rxRegistry, vocals, rx } from '../src/v';

const data = vocals({
  text: '',
  count: 0,
  registryContent: '',
});

const localRx = rx($ => {
  const content = data.registryContent($);
  return `The registry content is ${content.length} long now at ${new Date().toLocaleTimeString()}`;
});

const Page = () =>
  <main>
    {/* I think this is ok. Haptic will monkey-patch the fn to extract its return value */}
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
      {rx($ => data.count($) < 5
        ? Math.PI * data.count($)
        : `Text: "${data.text($)}" is ${data.text($).length} chars`)}
    </p>
    <p>Here's math again as $(v, v):
      {rx($ => {
        const [c, t] = $(data.count, data.text);
        return (c < 5
          ? Math.PI * c
          : `Text: "${t}" is ${t.length} chars`);
      })}
    </p>
    <p>Functions that aren't reactions??? {() => <span>WHOA DAMN SERIALIZED!</span>}</p>
    <button onClick={() => {
      const reg: Record<string, unknown> = {};
      rxRegistry.forEach(rx => {
        reg[rx.name] = {
          /* eslint-disable key-spacing */
          fn   : rx.fn.name,
          sr   : [...rx.sr].map(x => x.name),
          pr   : [...rx.pr].map(x => x.name),
          inner: [...rx.inner].map(x => x.name),
          runs : rx.runs,
          depth: rx.depth,
          state: [
            'STATE_OFF',
            'STATE_ON',
            'STATE_RUNNING',
            'STATE_PAUSED',
            'STATE_PAUSED_STALE',
          ][rx.state],
        };
      });
      console.log(reg);
      data.registryContent(JSON.stringify(reg, null, 4));
    }}>
      Load rx registry
    </button>
    <p>{localRx}</p>
    <pre>{rx(data.registryContent)}</pre>
  </main>;

document.body.innerHTML = '';
document.body.appendChild(<Page/>);
