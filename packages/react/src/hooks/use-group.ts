import type { Orientation } from "@fragiola/splitter";
import * as React from "react";
import { type GroupContextValue, useGroupContext } from "../context";
import { shallowEqual } from "../utils/shallow-equal";
import { dataAttributes } from "../utils/use-render";
import { useEngineValue, useModelValue } from "./internal";

/** What a group shows: its `data-*` attributes and the state its `className`/`style`/`render` get. */
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

export interface UseGroupResult {
    /** what the group shows as `data-*` */
    state: GroupPartState;
    /** what goes on the group's element: the ref that binds it, its structural style, `data-*` */
    props: {
        ref: React.RefCallback<HTMLElement>;
        style: React.CSSProperties;
    } & Record<`data-${string}`, string>;
}

/**
 * The lower layer of `Splitter.Group`: the state of the enclosing group and the props of its
 * element. `Splitter.Group` creates (or joins) the model and registers the group; this hook reads
 * it.
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
                orientation: state?.orientation ?? group.orientation,
                disabled: state?.disabled ?? group.disabled,
                path: model.get("group-path-by", { groupId }),
            };
        },
        shallowEqual,
    );
    const dragging = useEngineValue(engine, () =>
        engine.is("group-dragging", { groupId }),
    );
    const ref = React.useCallback(
        (element: HTMLElement | null) =>
            element ? engine.adapter.bindGroup(groupId, element) : undefined,
        [engine, groupId],
    );
    const state: GroupPartState = { id: groupId, ...selected, dragging };
    return {
        state,
        props: {
            ref,
            style: {
                display: "flex",
                flexDirection:
                    state.orientation === "horizontal" ? "row" : "column",
                flexWrap: "nowrap",
            },
            ...dataAttributes({
                "splitter-part": "group",
                "splitter-path": state.path,
                orientation: state.orientation,
                disabled: state.disabled,
                dragging: state.dragging,
            }),
        },
    };
}
