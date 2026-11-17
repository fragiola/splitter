import type {
    AnyTypes,
    GroupIdOf,
    Layout,
    Orientation,
    SplitterModel,
    SplitterRef,
    SplitterTypes,
} from "@fragiola/splitter";
import type * as React from "react";
import { eraseModel, GroupContext } from "../context";
import { useGroupRoot } from "../hooks/internal";
import { type GroupPartState, useGroupPart } from "../hooks/use-group";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface GroupProps<T extends SplitterTypes = AnyTypes>
    extends Omit<DivPrimitiveProps<GroupPartState>, "id"> {
    /** the group's id, as the saved layout names it; default: a generated one, stable across server and client */
    id?: GroupIdOf<T> | undefined;
    /** panels side by side (`horizontal`, the default) or stacked (`vertical`) */
    orientation?: Orientation | undefined;
    /** none of its separators can be used (code can still resize its panels) */
    disabled?: boolean | undefined;
    /**
     * the model to register in (a root group only): default, a new one for the outermost group,
     * and the enclosing panel's for a group nested in one
     */
    model?: SplitterModel<T> | undefined;
    /**
     * the layout (each panel's size in percent, by panel id), applied when the group registers and
     * whenever it changes (`group.set-layout`); pair it with `onLayoutChange`
     */
    layout?: Layout | undefined;
    /** the layout it starts with, unless the model has a saved one for it */
    defaultLayout?: Layout | undefined;
    /** the layout changed: on every commit, drag steps included */
    onLayoutChange?: ((layout: Readonly<Layout>) => void) | undefined;
    /** a layout was committed: a drag released, a key pressed, a command run (never a drag step) */
    onLayoutCommit?: ((layout: Readonly<Layout>) => void) | undefined;
    /** a handle that gives code outside the group its model and engine (a root group only) */
    splitterRef?: SplitterRef | undefined;
    /** how far an arrow key moves a separator, in percent (a root group only, read once; default 5) */
    keyboardStep?: number | undefined;
    /** a double click on a separator resets its panel (a root group only, read once; default true) */
    resetOnDoubleClick?: boolean | undefined;
    children?: React.ReactNode;
}

/**
 * A group of panels laid out along one orientation, with a `Splitter.Separator` between
 * neighbouring panels. The outermost group creates the model and the engine; a group inside a
 * `Splitter.Panel` joins them and nests in that panel. Its element is a flex container.
 */
export function Group<T extends SplitterTypes = AnyTypes>(
    props: GroupProps<T>,
) {
    const {
        id,
        orientation = "horizontal",
        disabled = false,
        model,
        layout,
        defaultLayout,
        onLayoutChange,
        onLayoutCommit,
        splitterRef,
        keyboardStep,
        resetOnDoubleClick,
        children,
        ...rest
    } = props;
    const context = useGroupRoot({
        id,
        orientation,
        disabled,
        model: model ? eraseModel(model) : undefined,
        layout,
        defaultLayout,
        onLayoutChange,
        onLayoutCommit,
        splitterRef,
        keyboardStep,
        resetOnDoubleClick,
    });
    const { state, props: group } = useGroupPart(context);
    const { ref, style, ...groupProps } = group;
    const element = useRenderElement("div", rest, {
        state,
        ref,
        props: { ...groupProps, children },
        style,
    });
    return (
        <GroupContext.Provider value={context}>{element}</GroupContext.Provider>
    );
}
