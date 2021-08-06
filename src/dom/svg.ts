import { api } from './index.js';

/** Renders SVGs by setting h() to the SVG namespace. */
const svg = <T extends () => Node>(closure: T): ReturnType<T> => {
  const prev = api.ns;
  api.ns = 'http://www.w3.org/2000/svg';
  const el = closure();
  api.ns = prev;
  return el as ReturnType<T>;
};

export { svg };
