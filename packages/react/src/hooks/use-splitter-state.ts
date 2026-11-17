import type {
    AnyTypes,
    SplitterRef,
    SplitterState,
    SplitterTypes,
} from "@fragiola/splitter";
import * as React from "react";
import { type SplitterContextValue, useSplitter } from "./use-splitter";

export interface UseSplitterStateOptions<S = unknown> {
    /**
     * the splitter to read: the root group's that holds this ref, from anywhere (the hook answers
     * `undefined` while none does); default: the enclosing `Splitter.Group`'s
     */
    splitterRef?: SplitterRef | undefined;
    /** whether two answers are the same, so the component does not re-render (`Object.is`) */
    isEqual?: ((a: S, b: S) => boolean) | undefined;
}

const noSubscription = () => () => {};

/**
 * An answer of the model (a `get` or an `is`), re-rendering the component only when it changes
 * (`isEqual`, `Object.is` by default). The selector runs once per model state; keep it pure.
 * Inside a `Splitter.Group` it reads the group's model; with a `splitterRef` it reads the root
 * group's that holds the ref, from anywhere, and answers `undefined` while none does.
 *
 * ```ts
 * const collapsed = useSplitterState(({ model }) =>
 *     model.is("panel-collapsed", { panelId: "nav" }),
 * );
 * const layout = useSplitterState(
 *     ({ model }) => model.get("layout-by", { groupId: "main" }),
 *     { splitterRef },
 * );
 * ```
 */
export function useSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options: UseSplitterStateOptions<S> & { splitterRef: SplitterRef },
): S | undefined;
export function useSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options?: UseSplitterStateOptions<S> & { splitterRef?: undefined },
): S;
export function useSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options: UseSplitterStateOptions<S> = {},
): S | undefined {
    const { splitterRef, isEqual = Object.is } = options;
    // one implementation behind useSplitter's two overloads: it throws outside a group without a ref
    const splitter = (
        useSplitter as (
            splitterRef?: SplitterRef,
        ) => SplitterContextValue<T> | null
    )(splitterRef);
    const latest = React.useRef({ selector, isEqual });
    latest.current = { selector, isEqual };
    // the last answer, and what it was computed from: a new state, splitter or selector (a closure
    // over new props) selects again
    const cache = React.useRef<
        | {
              state: SplitterState;
              value: S;
              splitter: SplitterContextValue<T>;
              selector: typeof selector;
          }
        | undefined
    >(undefined);
    const model = splitter?.model;
    const subscribe = React.useCallback(
        (onChange: () => void) =>
            model ? model.subscribe(() => onChange()) : noSubscription(),
        [model],
    );
    const getSnapshot = (): S | undefined => {
        if (!splitter) {
            return undefined;
        }
        const state = splitter.model.get("state");
        const current = latest.current.selector;
        const previous = cache.current;
        if (
            previous?.state === state &&
            previous.splitter === splitter &&
            previous.selector === current
        ) {
            return previous.value;
        }
        const value = current(splitter, state);
        const kept =
            previous !== undefined &&
            previous.splitter.model === splitter.model &&
            latest.current.isEqual(previous.value, value)
                ? previous.value
                : value;
        cache.current = { state, value: kept, splitter, selector: current };
        return kept;
    };
    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
