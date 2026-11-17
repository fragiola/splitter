import type { Orientation } from "@fragiola/splitter";
import { type ComputedRef, type CSSProperties, computed } from "vue";
import { type GroupContextValue, useGroupContext } from "../context";
import { dataAttributes, type ElementRef, elementRef } from "../utils/render";
import { shallowEqual } from "../utils/shallow-equal";
import { useEngineValue, useModelValue } from "./internal";

/** What a group shows: its `data-*` attributes and the state its `render` slot gets. */
export interface GroupPartState {
    /** the group's id */
    id: string;
    orientation: Orientation;
    /** none of its separators can be used */
    disabled: boolean;
    /** a pointer is dragging one of its separators */
    dragging: boolean;
    /** its path from the root group (`/g0`, `/g0/p1/g0`); undefined until it registers */
    path: string | undefined;
}

/** What goes on a group's element. */
export type GroupElementProps = {
    /** the template ref that binds the element */
    ref: ElementRef;
    /** its structural style: a flex container along the orientation */
    style: CSSProperties;
} & Record<`data-${string}`, string>;

export interface UseGroupResult {
    /** what the group shows as `data-*` */
    state: ComputedRef<GroupPartState>;
    /** what goes on the group's element (`v-bind`): the ref that binds it, its structural style, `data-*` */
    props: ComputedRef<GroupElementProps>;
}

/**
 * The lower layer of `Splitter.Group`: the state of the enclosing group and the props of its
 * element. `Splitter.Group` creates (or joins) the model and registers the group; this composable
 * reads it.
 */
export function useGroup(): UseGroupResult {
    return useGroupPart(useGroupContext("useGroup"));
}

/** @internal `useGroup` for a given group (the `Splitter.Group` that provides it) */
export function useGroupPart(group: GroupContextValue): UseGroupResult {
    const { model, engine, groupId } = group;
    const selected = useModelValue(
        model,
        () => {
            const state = model.get("group-by", { id: groupId });
            return {
                orientation: state?.orientation ?? group.orientation(),
                disabled: state?.disabled ?? group.disabled(),
                path: model.get("group-path-by", { groupId }),
            };
        },
        shallowEqual,
    );
    const dragging = useEngineValue(engine, () =>
        engine.is("group-dragging", { groupId }),
    );
    const ref = elementRef((element) =>
        engine.adapter.bindGroup(groupId, element),
    );
    const state = computed<GroupPartState>(() => ({
        id: groupId,
        ...selected.value,
        dragging: dragging.value,
    }));
    const props = computed<GroupElementProps>(() => {
        const current = state.value;
        return {
            ref,
            style: {
                display: "flex",
                flexDirection:
                    current.orientation === "horizontal" ? "row" : "column",
                flexWrap: "nowrap",
            },
            ...dataAttributes({
                "splitter-part": "group",
                "splitter-path": current.path,
                orientation: current.orientation,
                disabled: current.disabled,
                dragging: current.dragging,
            }),
        };
    });
    return { state, props };
}
