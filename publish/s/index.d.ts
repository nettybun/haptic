declare type X = any;
declare type Fn = () => unknown;
declare type Base<T> = {
    (): T;
    $o: 1;
};
declare type Subject<T> = Base<T> & {
    (nextValue: T): T;
    observers: Set<Update<X>>;
    observersRan: Set<Update<X>> | undefined;
    pending: T | [];
};
declare type ComputedSubject<T> = Base<T> & {
    update: Update<T>;
};
declare type Update<T> = {
    (): T;
    stale: boolean;
    subjects: Subject<X>[];
    children: Update<X>[];
};
declare function createSubject<T>(value: T): Subject<T>;
declare function createComputedSubject<F extends Fn, T = ReturnType<F>>(fn: F): ComputedSubject<T>;
declare function subscribe<F extends Fn>(fn: F): () => void;
declare function unsubscribe<F extends Fn & { _update: Update<X>; }>(fn: F): void;
declare function transaction(fn: Fn): unknown;
declare function sample(fn: Fn): unknown;
declare function on(subjects: Subject<X>[], fn: Fn, options?: { onlyChanges: boolean; }): ComputedSubject<unknown>;
export { Subject, ComputedSubject, Update };
export { createSubject as s, createSubject as subject, createComputedSubject as computed, subscribe, unsubscribe, transaction, sample, on };
