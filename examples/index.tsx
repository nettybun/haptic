import { h } from '../publish';
import { vocals } from '../publish/v';

// Avoid TS any type...
import type { VocalSubscriber } from '../publish/v';

const data = vocals({
  count: 0,
});

const Page = () =>
  <main>
    <p>Clicked {(s: VocalSubscriber) => s(data.count)} times</p>
    <button onClick={() => data.count(data.count() + 1)}>Inc</button>
  </main>;

document.body.innerHTML = '';
document.body.appendChild(<Page/>);
