declare type X = any;
declare type Fn = () => unknown;
declare type Base<T> = {
    (): T;
    $o: 1;
};
declare type WritableSignal<T> = Base<T> & {
    (nextValue: T): T;
    cs: Set<ComputedSignal<X>>;
    csRun?: Set<ComputedSignal<X>>;
    pending: T | [];
};
declare type ComputedSignal<T> = Base<T> & {
    lazy: boolean;
    stale: boolean;
    ws: WritableSignal<X>[];
    csNested: ComputedSignal<X>[];
};
declare type Signal<T> = WritableSignal<T> | ComputedSignal<T>;
declare function createWritableSignal<T>(value: T): WritableSignal<T>;
declare function createComputedSignal<F extends Fn, T = ReturnType<F>>(fn: F): ComputedSignal<T>;
declare function subscribe(fn: Fn): () => void;
declare function unsubscribe(computed: ComputedSignal<X>): void;
declare function capture(fn: (unsubscribe?: () => void) => unknown): void;
declare function transaction<T>(fn: () => T): T;
declare function sample<T>(fn: () => T): T;
declare function on(signals: Signal<X>[], fn: Fn, options?: { onlyChanges: boolean; }): ComputedSignal<unknown>;
export { Signal, WritableSignal, ComputedSignal };
export { createWritableSignal as s, createWritableSignal as signal, createComputedSignal as c, createComputedSignal as computed, capture, subscribe, unsubscribe, transaction, sample, on };
