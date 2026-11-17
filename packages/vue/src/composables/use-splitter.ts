import type {
    AnyTypes,
    GroupIdOf,
    SplitterEngine,
    SplitterHandle,
    SplitterModel,
    SplitterRef,
    SplitterTypes,
} from "@fragiola/splitter";
import {
    type ComputedRef,
    computed,
    inject,
    type MaybeRefOrGetter,
    toRaw,
    toValue,
} from "vue";
import { GroupKey, typedModel } from "../context";
import { useExternal } from "../utils/render";

/** The splitter a part renders in: its model, its engine, and the id of the enclosing group. */
export interface SplitterContextValue<T extends SplitterTypes = AnyTypes> {
    model: SplitterModel<T>;
    engine: SplitterEngine;
    /** the enclosing group (inside a `Splitter.Group`), or the root group (through a ref) */
    groupId: GroupIdOf<T>;
}

function contextOf<T extends SplitterTypes>(
    source: SplitterHandle,
): SplitterContextValue<T> {
    return {
        model: typedModel<T>(source.model),
        engine: source.engine,
        groupId: source.groupId as GroupIdOf<T>,
    };
}

/**
 * The model and engine of the splitter. Inside a `Splitter.Group`, its own (`groupId` is the
 * enclosing group), which never changes for the component (a new `id` or `model` remounts the
 * group). With a `splitterRef`, the root group's that holds the ref, from anywhere, as a computed
 * ref that is `null` while none does.
 *
 * ```ts
 * const { model, groupId } = useSplitter();
 * model.run("group.reset", { groupId });
 * const splitter = useSplitter(splitterRef); // outside the group: splitter.value
 * ```
 */
export function useSplitter<
    T extends SplitterTypes = AnyTypes,
>(): SplitterContextValue<T>;
export function useSplitter<T extends SplitterTypes = AnyTypes>(
    splitterRef: MaybeRefOrGetter<SplitterRef>,
): ComputedRef<SplitterContextValue<T> | null>;
export function useSplitter<T extends SplitterTypes = AnyTypes>(
    splitterRef?: MaybeRefOrGetter<SplitterRef>,
): SplitterContextValue<T> | ComputedRef<SplitterContextValue<T> | null> {
    if (splitterRef === undefined) {
        const group = inject(GroupKey, null);
        if (!group) {
            throw new Error(
                "useSplitter must be used inside Splitter.Group, or be given a splitterRef",
            );
        }
        return contextOf<T>(group);
    }
    return useHeldSplitter<T>(() => toRaw(toValue(splitterRef)));
}

/** @internal the splitter a ref holds, as a computed ref (`null` while no root group holds it) */
export function useHeldSplitter<T extends SplitterTypes>(
    splitterRef: () => SplitterRef,
): ComputedRef<SplitterContextValue<T> | null> {
    const held = useExternal(
        () => splitterRef().subscribe,
        () => splitterRef().current,
    );
    return computed(() => (held.value ? contextOf<T>(held.value) : null));
}
