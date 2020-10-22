// type Fn = () => unknown
// Using string for now but really this will be functions for hydration?
type El = { tag: string, content: (El | string)[] } | undefined;
type Component = (...args: unknown[]) => El;

// These always return the same function body
const whenStr = ''; // when().toString()
const signalStr = ''; // signal().toString()
const computedStr = ''; // computed(() => {}).toString()

function funcString(arg: () => unknown): string {
  const str = arg.toString();
  if (str === whenStr)
    return '✨ when() ✨';
  if (str === signalStr)
    return '✨ signal() ✨';
  if (str === computedStr)
    return '✨ computed() ✨';
  return str;
}

function h(tag?: string | [] | Component, props?: unknown, ...children: unknown[]): El
function h(...args: unknown[]): El {
  let el: El;
  const item = (arg: unknown) => {
    // eslint-disable-next-line eqeqeq
    if (!arg) return;
    else if (typeof arg === 'string') {
      if (!el) el = { tag: arg, content: [] };
      // Otherwise ignore the string
    }
    else if (Array.isArray(arg)) {
      if (!el) el = { tag: '[]', content: [] };
      arg.forEach(item);
    }
    // Props but not El
    else if (typeof arg === 'object' && !((arg as { tag: string }).tag)) {
      if (!el) {
        throw new Error('No el during object hydration');
      }
      const attrs = arg as { [k: string]: unknown };
      for (const name in attrs) {
        const value = attrs[name] as (() => unknown) & { $o?: 1 };
        if (name.startsWith('on') && !value.$o) {
          // Don't use funcString since these are explicitly not signals
          el.content.push(`attrEventListener:${name}:${value.toString()}`);
          continue;
        }
        if (typeof value === 'function') {
          el.content.push(`attrSubcription:${funcString(value)}`);
          continue;
        }
      }
    }
    else if (typeof arg === 'function') {
      if (el) {
        // TODO: Find the <! comment block and make a startMark
        // Just call api.insert on the parentNode of the startMark comment?
        const str = funcString(arg as () => unknown);
        el.content.push(`insertSubscription:${str}`);
        el.content.push('FUNCTION ▶');
        // Don't push to content but actually reloop it through h() to filter
        item(arg());
        el.content.push('FUNCTION ❌');
      } else {
        // Support components (unsafe)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        el = arg(...args.splice(1));
        if (!el) {
          throw new Error('No el after component call');
        }
        el.tag = `🔶 <${arg.name || '?'}/> ${el.tag}`;
      }
    } else {
      if (!el) {
        throw new Error('No el during default case add');
      }
      el.content.push(arg as El);
    }
  };
  args.forEach(item);
  return el;
}

export { h };
