import type * as React from "react";
import {
    type SeparatorPartState,
    type UseSeparatorOptions,
    useSeparator,
} from "../hooks/use-separator";
import { type DivPrimitiveProps, useRenderElement } from "../utils/use-render";

export interface SeparatorProps
    extends DivPrimitiveProps<SeparatorPartState>,
        UseSeparatorOptions {
    children?: React.ReactNode;
}

/**
 * The separator between two neighbouring panels (`role="separator"`, Window Splitter): drag it
 * with the pointer, or focus it and use the arrows, Home, End and Enter; double click it to reset
 * its panel. Place one between each pair of panels: the n-th separator of a group, in document
 * order, is the one after its n-th panel. It has no name of its own: give it an `aria-label`.
 */
export function Separator(props: SeparatorProps) {
    const { disabled, resetOnDoubleClick, children, ...rest } = props;
    const { state, props: separator } = useSeparator({
        disabled,
        resetOnDoubleClick,
    });
    const { ref, style, ...separatorProps } = separator;
    return useRenderElement("div", rest, {
        state,
        ref,
        props: { ...separatorProps, children },
        style,
    });
}
