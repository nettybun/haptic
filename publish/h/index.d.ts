declare const api: {
    ns: string;
    h: (tag?: string | [] | undefined, props?: unknown, ...children: unknown[]) => Element | Node | DocumentFragment | undefined;
    svg: <T extends () => Element>(closure: T) => ReturnType<T>;
    add: (parent: Node, value: string | number | Node | (string | number | Node)[], endMark?: Node | undefined) => Node | {
        _startMark: Text;
    };
    insert: (el: Node, value: unknown, endMark?: Node | undefined, current?: Node | {
        _startMark: Text;
    } | undefined, startNode?: ChildNode | null | undefined) => Node | {
        _startMark: Text;
    } | undefined;
    property: (el: Node, value: unknown, name: string | null, isAttr?: boolean | undefined, isCss?: boolean | undefined) => void;
    remove: (parent: Node, startNode: ChildNode | null, endMark: Node) => void;
    subscribe: (_: () => void) => void;
};
declare const h: typeof api.h;
export { h, api };
