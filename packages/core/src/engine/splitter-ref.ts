// The splitter reachable from outside its root group, as Grid Layout's `createGridLayoutRef`
// (fragiola/grid-layout, same author and licence). Framework-free: each adapter's root group hands
// its splitter to the ref, and its hooks follow the ref with the framework's own reactivity.

import type { SplitterModel } from "../state/model";
import type { SplitterEngine } from "./splitter-engine";

/** One splitter on screen: its model, its engine and its root group, as a `splitterRef` holds them. */
export interface SplitterHandle {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    /** the root group's id */
    readonly groupId: string;
}

/**
 * A handle on a splitter from outside its root group: `current` is the root group's model,
 * engine and id while a root group holds it (`<Splitter.Group splitterRef={splitterRef}>`), `null`
 * otherwise. Unlike a plain ref it tells when that changes, so hooks follow it from anywhere
 * (`useSplitter(splitterRef)`).
 */
export interface SplitterRef {
    readonly current: SplitterHandle | null;
    /** listens to a root group taking or releasing it; returns the unsubscription */
    subscribe(listener: () => void): () => void;
}

const noop = () => {};

/** What sets a ref's `current`: kept off the ref, so only an adapter writes it. */
const writers = new WeakMap<object, (value: SplitterHandle | null) => void>();

/**
 * A handle on a splitter, made outside a component (a module, a test, a store): the same as the
 * React adapter's `useSplitterRef()` returns. A `splitterRef` must be made by one of the two.
 */
export function createSplitterRef(): SplitterRef {
    let current: SplitterHandle | null = null;
    const listeners = new Set<() => void>();
    const splitterRef: SplitterRef = {
        get current() {
            return current;
        },
        subscribe(listener) {
            const wrapper = () => listener();
            listeners.add(wrapper);
            return () => {
                listeners.delete(wrapper);
            };
        },
    };
    writers.set(splitterRef, (value) => {
        current = value;
        for (const listener of [...listeners]) {
            listener();
        }
    });
    return splitterRef;
}

/**
 * Adapter-only (an app never calls it): hands a root group's splitter to its `splitterRef`;
 * returns the release. A ref belongs to one mounted root at a time: a second one is reported in
 * the console and does not take it, rather than breaking the page for a mistake the types cannot
 * see.
 */
export function attachSplitterRef(
    splitterRef: SplitterRef,
    handle: SplitterHandle,
): () => void {
    const write = writers.get(splitterRef);
    if (!write) {
        console.error(
            "splitterRef: the ref must come from createSplitterRef() or useSplitterRef()",
        );
        return noop;
    }
    if (splitterRef.current && splitterRef.current !== handle) {
        console.error(
            "splitterRef: this ref is already held by another mounted root group; give each root its own",
        );
        return noop;
    }
    write(handle);
    return () => {
        if (splitterRef.current === handle) {
            write(null);
        }
    };
}
