import type { AnyTypes, SplitterTypes } from "@fragiola/splitter";
import { provide } from "vue";
import {
    type PanelPartState,
    type UsePanelOptions,
    usePanel,
} from "../composables/use-panel";
import { PanelKey, useGroupContext } from "../context";
import {
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
    type SplitterComponent,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

/**
 * `Splitter.Panel`'s props: its declaration (`usePanel`'s options), with `@resize`, `@collapse`
 * and `@expand` for its callbacks.
 */
export interface PanelProps<T extends SplitterTypes = AnyTypes>
    extends PrimitiveProps,
        UsePanelOptions<T> {}

export interface PanelSlots extends RenderSlot<PanelPartState> {
    /** the panel's content (a `Splitter.Group` in it nests in it) */
    default?: SlotFunction<{ state: PanelPartState }>;
}

const PROPS = [
    "id",
    "minSize",
    "maxSize",
    "defaultSize",
    "collapsible",
    "collapsedSize",
    "collapsedThreshold",
    "disabled",
    "groupResizeBehavior",
    "onResize",
    "onCollapse",
    "onExpand",
    "as",
] as const satisfies readonly (keyof PanelProps)[];

/** The props a bare attribute sets to `true` (`<Splitter.Panel collapsible>`). */
const BOOLEANS = [
    "collapsible",
    "disabled",
] as const satisfies readonly (keyof PanelProps)[];

/**
 * A panel of the enclosing `Splitter.Group`: a flex item whose size comes from the group's layout.
 * Its order is its position in the document, so a panel rendered conditionally lands where it is
 * in the markup. A `Splitter.Group` inside it nests in it.
 */
export const Panel: SplitterComponent<PanelProps, PanelSlots> = definePrimitive<
    PanelProps,
    PanelSlots
>(
    "Panel",
    PROPS,
    (props, { attrs, slots }) => {
        const { model, engine } = useGroupContext("Splitter.Panel");
        const panel = usePanel(() => props);
        provide(PanelKey, {
            model,
            engine,
            panelId: () => panel.state.value.id,
        });
        return () => {
            const state = panel.state.value;
            const { ref, style, ...own } = panel.props.value;
            return renderElement({
                tag: "div",
                as: props.as,
                attrs,
                render: slots.render,
                state,
                ref,
                props: own,
                style,
                children: slots.default
                    ? () => slots.default?.({ state })
                    : undefined,
            });
        };
    },
    BOOLEANS,
);
