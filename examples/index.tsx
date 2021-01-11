import { h, api } from '../publish/index';

const Page = () =>
  <main>
    <p>Example JSX</p>
  </main>;

api.add(document.body, <Page/>);
