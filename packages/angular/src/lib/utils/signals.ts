// From Grid Layout (fragiola/grid-layout, packages/angular/src/lib/utils/signals.ts `fromStore`), same author and licence.
// A store the directives and the injection functions follow as a signal: the model, the engine,
// a group's registry, a splitter ref.

import {
    computed,
    effect,
    type Signal,
    signal,
    untracked,
} from "@angular/core";

/** A subscription: calls its listener on each change, returns the remover. */
export type Subscribe = (listener: () => void) => () => void;

/**
 * A value read from an external store as a signal: it re-reads `read()` whenever the store
 * notifies (and whenever a signal it reads changes), and tells its readers only when the value
 * changes (`equal`, `Object.is` by default). The store itself may change: `subscribe` is read in a
 * reactive context (`undefined`: nothing to follow yet). The subscription ends with the directive
 * (or the component) that made it.
 */
export function fromStore<S>(
    subscribe: () => Subscribe | undefined,
    read: () => S,
    equal: (a: S, b: S) => boolean = Object.is,
): Signal<S> {
    const tick = signal(0);
    effect((onCleanup) => {
        const subscribeTo = subscribe();
        if (!subscribeTo) return;
        onCleanup(
            subscribeTo(() => {
                tick.update((value) => value + 1);
            }),
        );
        // a change between the first read and the subscription is read again
        untracked(() => tick.update((value) => value + 1));
    });
    return computed(
        () => {
            tick();
            return read();
        },
        { equal },
    );
}
