import type { AnyTypes, SplitterTypes } from "@fragiola/splitter";
import * as React from "react";
import { PanelContext, useGroupContext } from "../context";
import {
    type PanelPartState,
    type UsePanelOptions,
    usePanel,
} from "../hooks/use-panel";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface PanelProps<T extends SplitterTypes = AnyTypes>
    extends Omit<DivPrimitiveProps<PanelPartState>, "id" | "onResize">,
        UsePanelOptions<T> {
    children?: React.ReactNode;
}

/**
 * A panel of the enclosing `Splitter.Group`: a flex item whose size comes from the group's layout.
 * Its order is its position in the document, so a panel rendered conditionally lands where it is
 * in the markup. A `Splitter.Group` inside it nests in it.
 */
export function Panel<T extends SplitterTypes = AnyTypes>(
    props: PanelProps<T>,
) {
    const {
        id,
        minSize,
        maxSize,
        defaultSize,
        collapsible,
        collapsedSize,
        collapsedThreshold,
        disabled,
        groupResizeBehavior,
        onResize,
        onCollapse,
        onExpand,
        children,
        ...rest
    } = props;
    const { model, engine } = useGroupContext("Splitter.Panel");
    const { state, props: panel } = usePanel<T>({
        id,
        minSize,
        maxSize,
        defaultSize,
        collapsible,
        collapsedSize,
        collapsedThreshold,
        disabled,
        groupResizeBehavior,
        onResize,
        onCollapse,
        onExpand,
    });
    const { ref, style, ...panelProps } = panel;
    const context = React.useMemo(
        () => ({ model, engine, panelId: state.id }),
        [model, engine, state.id],
    );
    const element = useRenderElement("div", rest, {
        state,
        ref,
        props: { ...panelProps, children },
        style,
    });
    return (
        <PanelContext.Provider value={context}>{element}</PanelContext.Provider>
    );
}
