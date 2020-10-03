declare type X = any;
declare type Fn = () => unknown;
declare type ReadonlySocket<T> = {
    (): T;
    $o: 1;
};
declare type Socket<T> = ReadonlySocket<T> & {
    (nextValue: T): T;
    _computeds: Set<Computed<X>>;
    _computedsRan: Set<Computed<X>> | undefined;
    _pending: T | [];
};
declare type ComputedSocket<T> = ReadonlySocket<T> & {
    _computed: Computed<T>;
};
declare type Computed<T> = {
    (): T;
    _stale: boolean;
    _depSockets: Socket<X>[];
    _children: Computed<X>[];
};
declare function createSocket<T>(value: T): Socket<T>;
declare function createComputedSocket<F extends Fn, T = ReturnType<F>>(fn: F): ComputedSocket<T>;
declare function subscribe<F extends Fn>(fn: F): () => void;
declare function unsubscribe<F extends Fn & {
    _computed: Computed<X>;
}>(fn: F): void;
declare function transaction(fn: Fn): unknown;
declare function sample(fn: Fn): unknown;
declare function on(sockets: Socket<X>[], fn: Fn, options?: {
    onlyChanges: boolean;
}): ComputedSocket<unknown>;
export { createSocket as socket, createSocket as s, createComputedSocket as computed, subscribe, unsubscribe, transaction, sample, on };
