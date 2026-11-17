import { computed, type Signal } from "@angular/core";
import type {
    AnyTypes,
    SplitterModel,
    SplitterRef,
    SplitterState,
    SplitterTypes,
} from "@fragiola/splitter";
import { fromStore } from "../utils/signals";
import {
    enclosingSplitter,
    heldSplitter,
    type SplitterContextValue,
} from "./inject-splitter";

export interface InjectSplitterStateOptions<S = unknown> {
    /**
     * the splitter to read: the root group's that holds this ref (or the ref a function reads),
     * from anywhere (the answer is `undefined` while none does); default: the enclosing
     * `[splitterGroup]`'s
     */
    splitterRef?: SplitterRef | (() => SplitterRef | undefined) | undefined;
    /** whether two answers are the same, so the readers are not told (`Object.is`) */
    isEqual?: ((a: S, b: S) => boolean) | undefined;
}

/**
 * An answer of the model (a `get` or an `is`), as a signal that changes only when the answer
 * changes (`isEqual`, `Object.is` by default). The selector runs once per model state, and again
 * when a signal it reads changes; keep it pure. Inside a `[splitterGroup]` it reads the group's
 * model (read it once the group has its inputs, as {@link injectSplitter}); with a `splitterRef`
 * it reads the root group's that holds the ref, from anywhere, and answers `undefined` while none
 * does. Call it in an injection context.
 *
 * ```ts
 * readonly collapsed = injectSplitterState(({ model }) =>
 *     model.is("panel-collapsed", { panelId: "nav" }),
 * );
 * ```
 */
export function injectSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options: InjectSplitterStateOptions<S> & {
        splitterRef: SplitterRef | (() => SplitterRef | undefined);
    },
): Signal<S | undefined>;
export function injectSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options?: InjectSplitterStateOptions<S> & { splitterRef?: undefined },
): Signal<S>;
export function injectSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options: InjectSplitterStateOptions<S> = {},
): Signal<S | undefined> {
    const { splitterRef, isEqual = Object.is } = options;
    // inside a group, its splitter (it throws outside one); with a ref, the one the ref holds
    const splitter: Signal<SplitterContextValue<T> | null> =
        splitterRef === undefined
            ? enclosingSplitter<T>("injectSplitterState")
            : heldSplitter<T>(splitterRef);
    // the splitter's model state: a new object on every commit
    const state = fromStore(
        () => {
            const model: SplitterModel<T> | undefined = splitter()?.model;
            return model
                ? (listener: () => void) => model.subscribe(() => listener())
                : undefined;
        },
        () => splitter()?.model.get("state"),
    );
    // the last answer, and the model it came from: another model's answer is never kept
    let last: { model: SplitterModel<T>; value: S } | undefined;
    return computed(() => {
        const current = splitter();
        const now = state();
        if (!current || now === undefined) {
            last = undefined;
            return undefined;
        }
        const value = selector(current, now);
        if (
            last !== undefined &&
            last.model === current.model &&
            isEqual(last.value, value)
        ) {
            return last.value;
        }
        last = { model: current.model, value };
        return value;
    });
}
