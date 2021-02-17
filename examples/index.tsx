import { h } from '../src';
import { reactorRegistry, wireSignals, wR } from '../src/w';

const data = wireSignals({
  text: '',
  count: 0,
  registryContent: '',
});

const localDef = wR($ => {
  const content = data.registryContent($);
  return `The registry content is ${content.length} long now at ${new Date().toLocaleTimeString()}`;
});

const Page = () =>
  <main>
    {/* I think this is ok. Haptic will monkey-patch the fn to extract its return value */}
    <p>This has been clicked {wR(data.count)} times</p>
    <input
      placeholder='Type something...'
      value={wR(data.text)}
      // @ts-ignore TODO:
      onKeyUp={ev => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.text(ev.target.value);
      }}
      style='display:block'/>
    <button onClick={() => data.count(data.count() + 1)}>Inc</button>
    <p>Here's math:
      {wR($ => data.count($) < 5
        ? Math.PI * data.count($)
        : `Text: "${data.text($)}" is ${data.text($).length} chars`)}
    </p>
    <p>Here's math again as $(v, v):
      {wR($ => {
        const [count, text] = $(data.count, data.text);
        return (count < 5
          ? Math.PI * count
          : `Text: "${text}" is ${text.length} chars`);
      })}
    </p>
    <p>Functions that aren't reactors? {() => <span>Function is serialized</span>}</p>
    <button onClick={() => {
      const reg: Record<string, unknown> = {};
      reactorRegistry.forEach(reactor => {
        reg[reactor.name] = {
          /* eslint-disable key-spacing */
          fn: reactor.fn.toString(),
          rS: [...reactor.rS].map(x => x.name),
          rP: [...reactor.rP].map(x => x.name),
          inner: [...reactor.inner].map(x => x.name),
          runs: reactor.runs,
          depth: reactor.depth,
          state: [
            'OFF',
            'ON',
            'RUNNING',
            'PAUSED',
            'PAUSED_STALE',
          ][reactor.state],
        };
      });
      console.log(reg);
      data.registryContent(JSON.stringify(reg, null, 4));
    }}>
      Load rx registry
    </button>
    <p>{localDef}</p>
    <pre>{wR(data.registryContent)}</pre>
  </main>;

document.body.innerHTML = '';
document.body.appendChild(<Page/>);
