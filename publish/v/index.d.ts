declare type X = any;
declare type Fn = () => unknown;

declare type Rx = {
    (): undefined;
    id: string;
    fn: (s: VocalSubscriber) => unknown;
    sr: Set<Vocal<X>>;
    pr: Set<Vocal<X>>;
    inner: Set<Rx>;
    runs: number;
    depth: number;
    state:
        | typeof STATE_ON
        | typeof STATE_RUNNING
        | typeof STATE_PAUSED
        | typeof STATE_PAUSED_STALE
        | typeof STATE_OFF;
    pause: () => void;
    unsubscribe: () => void;
};
declare type Vocal<T> = {
    (): T;
    (value: T): void;
    id: string;
    rx: Set<Rx>;
    next?: T;
};
declare type VocalSubscriber = <T = X>(v: Vocal<T>) => T;

// Global registry
declare const rxKnown: Set<Rx>;

// FSM
declare const STATE_ON:           readonly [];
declare const STATE_RUNNING:      readonly [];
declare const STATE_PAUSED:       readonly [];
declare const STATE_PAUSED_STALE: readonly [];
declare const STATE_OFF:          readonly [];

declare function rxCreate(fn: Fn): Rx;
declare function vocalsCreate<T>(o: T): { [P in keyof T]: Vocal<T[P]>; };
declare function transaction<T>(fn: () => T): T;
declare function adopt<T>(rxParent: Rx, fn: () => T): T;

export { rxCreate as rx, vocalsCreate as vocals, transaction, adopt, rxKnown };
export { Rx, Vocal, VocalSubscriber };
