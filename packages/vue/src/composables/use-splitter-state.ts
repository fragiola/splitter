import type {
    AnyTypes,
    SplitterModel,
    SplitterRef,
    SplitterState,
    SplitterTypes,
} from "@fragiola/splitter";
import {
    type ComputedRef,
    computed,
    type MaybeRefOrGetter,
    toRaw,
    toValue,
} from "vue";
import { useExternal } from "../utils/render";
import {
    type SplitterContextValue,
    useHeldSplitter,
    useSplitter,
} from "./use-splitter";

export interface UseSplitterStateOptions<S = unknown> {
    /**
     * the splitter to read: the root group's that holds this ref, from anywhere (the answer is
     * `undefined` while none does); default: the enclosing `Splitter.Group`'s
     */
    splitterRef?: MaybeRefOrGetter<SplitterRef> | undefined;
    /** whether two answers are the same, so the readers are not triggered (`Object.is`) */
    isEqual?: ((a: S, b: S) => boolean) | undefined;
}

/**
 * An answer of the model (a `get` or an `is`), as a computed ref that triggers its readers only
 * when the answer changes (`isEqual`, `Object.is` by default). The selector runs once per model
 * state, and again when a reactive value it reads changes; keep it pure. Inside a
 * `Splitter.Group` it reads the group's model; with a `splitterRef` it reads the root group's that
 * holds the ref, from anywhere, and answers `undefined` while none does.
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
    options: UseSplitterStateOptions<S> & {
        splitterRef: MaybeRefOrGetter<SplitterRef>;
    },
): ComputedRef<S | undefined>;
export function useSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options?: UseSplitterStateOptions<S> & { splitterRef?: undefined },
): ComputedRef<S>;
export function useSplitterState<
    T extends SplitterTypes = AnyTypes,
    S = unknown,
>(
    selector: (splitter: SplitterContextValue<T>, state: SplitterState) => S,
    options: UseSplitterStateOptions<S> = {},
): ComputedRef<S | undefined> {
    const { splitterRef, isEqual = Object.is } = options;
    // inside a group, its splitter (it throws outside one); with a ref, the one the ref holds
    const inside = splitterRef === undefined ? useSplitter<T>() : undefined;
    const splitter: ComputedRef<SplitterContextValue<T> | null> =
        splitterRef === undefined
            ? computed(() => inside ?? null)
            : useHeldSplitter<T>(() => toRaw(toValue(splitterRef)));
    // the splitter's model state: a new object on every commit
    const state = useExternal(
        () => {
            const model: SplitterModel<T> | undefined = splitter.value?.model;
            return model
                ? (listener: () => void) => model.subscribe(() => listener())
                : undefined;
        },
        () => splitter.value?.model.get("state"),
    );
    // the last answer, and the model it came from: another model's answer is never kept
    let last: { model: SplitterModel<T>; value: S } | undefined;
    return computed(() => {
        const current = splitter.value;
        const now = state.value;
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
