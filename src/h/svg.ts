import { api } from './index.js'

const svg = (...args) => {
  const prev = api.ns;
  api.ns = 'http://www.w3.org/2000/svg';
  const el = api.h(...args);
  api.ns = prev;
  return el;
};

export { svg };
