import { api } from './index.js';

type Value = Node | string | number;
type Frag = { _startMark: Text };
type FragReturn = Frag | Node | undefined;

const asNode = (value: unknown): Text | Node | DocumentFragment => {
  if (typeof value === 'string') {
    return document.createTextNode(value);
  }
  // Note that a DocumentFragment is an instance of Node
  if (!(value instanceof Node)) {
    // Passing an empty array creates a DocumentFragment
    // Note this means api.add is not purely a subcall of api.h; it can nest
    return api.h([], value) as DocumentFragment;
  }
  return value;
};

const maybeFragOrNode = (value: Text | Node | DocumentFragment): FragReturn => {
  const { childNodes } = value;
  if (value.nodeType !== 11 /* DOCUMENT_FRAGMENT_NODE */) return;
  if (childNodes.length < 2) return childNodes[0];
  // For a fragment of 2 elements or more add a startMark. This is required for
  // multiple nested conditional computeds that return fragments.

  // It looks recursive here but the next call's fragOrNode is only Text('')
  return { _startMark: api.add(value, '', childNodes[0]) as Text };
};

/** Add a node before a reference node or at the end */
const add = (parent: Node, value: Value | Value[], endMark?: Node) => {
  value = asNode(value);
  const fragOrNode = maybeFragOrNode(value) || value;

  // If endMark is `null`, value will be added to the end of the list.
  parent.insertBefore(value, (endMark && endMark.parentNode && endMark) as Node | null);
  return fragOrNode;
};

export { add };
