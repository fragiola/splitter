import type {
    AnyTypes,
    GroupIdOf,
    Layout,
    Orientation,
    SplitterModel,
    SplitterRef,
    SplitterTypes,
} from "@fragiola/splitter";
import { defineComponent, h, provide, toRaw, useId } from "vue";
import { useGroupRoot } from "../composables/internal";
import { type GroupPartState, useGroupPart } from "../composables/use-group";
import { eraseModel, GroupKey } from "../context";
import {
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
    type SplitterComponent,
} from "../utils/primitive";
import { type RenderSlot, renderElement } from "../utils/render";

/**
 * `Splitter.Group`'s props: React's, with Vue's names for the callbacks a parent listens to.
 * `v-model:layout` pairs `layout` with `update:layout`; `@layout-change` is the same event as
 * `update:layout` (React's `onLayoutChange`), `@layout-commit` React's `onLayoutCommit`.
 */
export interface GroupProps<T extends SplitterTypes = AnyTypes>
    extends PrimitiveProps {
    /**
     * the group's id, as the saved layout names it; default: a generated one, stable across server
     * and client. Another id remounts the group
     */
    id?: GroupIdOf<T> | undefined;
    /** panels side by side (`horizontal`, the default) or stacked (`vertical`) */
    orientation?: Orientation | undefined;
    /** none of its separators can be used (code can still resize its panels) */
    disabled?: boolean | undefined;
    /**
     * the model to register in (a root group only): default, a new one for the outermost group,
     * and the enclosing panel's for a group nested in one. Another model remounts the group
     */
    model?: SplitterModel<T> | undefined;
    /**
     * the layout (each panel's size in percent, by panel id), applied when the group registers and
     * whenever it changes (`group.set-layout`); pair it with `update:layout` (`v-model:layout`)
     */
    layout?: Readonly<Layout> | undefined;
    /** the layout it starts with, unless the model has a saved one for it */
    defaultLayout?: Readonly<Layout> | undefined;
    /** `v-model:layout`: the layout changed, on every commit, drag steps included */
    "onUpdate:layout"?: ((layout: Readonly<Layout>) => void) | undefined;
    /** `@layout-change`: the layout changed, on every commit, drag steps included */
    onLayoutChange?: ((layout: Readonly<Layout>) => void) | undefined;
    /**
     * `@layout-commit`: a layout was committed: a drag released, a key pressed, a command run
     * (never a drag step)
     */
    onLayoutCommit?: ((layout: Readonly<Layout>) => void) | undefined;
    /** a handle that gives code outside the group its model and engine (a root group only) */
    splitterRef?: SplitterRef | undefined;
    /** how far an arrow key moves a separator, in percent (a root group only, read once; default 5) */
    keyboardStep?: number | undefined;
    /** a double click on a separator resets its panel (a root group only, read once; default true) */
    resetOnDoubleClick?: boolean | undefined;
}

export interface GroupSlots extends RenderSlot<GroupPartState> {
    /** the group's panels and separators */
    default?: SlotFunction<{ state: GroupPartState }>;
}

const PROPS = [
    "id",
    "orientation",
    "disabled",
    "model",
    "layout",
    "defaultLayout",
    "onUpdate:layout",
    "onLayoutChange",
    "onLayoutCommit",
    "splitterRef",
    "keyboardStep",
    "resetOnDoubleClick",
    "as",
] as const satisfies readonly (keyof GroupProps)[];

/** The props a bare attribute sets to `true` (`<Splitter.Group disabled>`). */
const BOOLEANS = [
    "disabled",
    "resetOnDoubleClick",
] as const satisfies readonly (keyof GroupProps)[];

/** a key per model: another model remounts the group */
const modelKeys = new WeakMap<object, number>();
let nextModelKey = 0;
function keyOfModel(model: object): number {
    let key = modelKeys.get(model);
    if (key === undefined) {
        key = nextModelKey++;
        modelKeys.set(model, key);
    }
    return key;
}

/**
 * One mounted group: its id and its model never change (they remount it); a new parent panel id
 * moves it in place.
 */
const GroupRoot = definePrimitive<GroupProps & { id: string }, GroupSlots>(
    "GroupRoot",
    PROPS,
    (props, { attrs, slots }) => {
        const context = useGroupRoot(() => ({
            id: props.id,
            orientation: props.orientation ?? "horizontal",
            disabled: props.disabled ?? false,
            model: props.model ? eraseModel(props.model) : undefined,
            layout: props.layout,
            defaultLayout: props.defaultLayout,
            onLayoutChange: (layout) => {
                props["onUpdate:layout"]?.(layout);
                props.onLayoutChange?.(layout);
            },
            onLayoutCommit: (layout) => props.onLayoutCommit?.(layout),
            splitterRef: props.splitterRef,
            keyboardStep: props.keyboardStep,
            resetOnDoubleClick: props.resetOnDoubleClick,
        }));
        provide(GroupKey, context);
        const part = useGroupPart(context);
        return () => {
            const state = part.state.value;
            const { ref, style, ...own } = part.props.value;
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

/**
 * A group of panels laid out along one orientation, with a `Splitter.Separator` between
 * neighbouring panels. The outermost group creates the model and the engine; a group inside a
 * `Splitter.Panel` joins them and nests in that panel. Its element is a flex container. Another
 * `id` or `model` remounts it.
 */
export const Group: SplitterComponent<GroupProps, GroupSlots> = defineComponent(
    {
        name: "SplitterGroup",
        inheritAttrs: false,
        // a bare boolean attribute reaches GroupRoot as it came, which casts it
        props: [...PROPS],
        setup(props, { attrs, slots }) {
            // the default id: unique on the page, and the same on the server and the client
            const generatedId = useId();
            return () => {
                const id = (props.id as string | undefined) ?? generatedId;
                const model = props.model as object | undefined;
                const key = `${id}\n${model ? keyOfModel(toRaw(model)) : ""}`;
                return h(GroupRoot, { ...attrs, ...props, id, key }, slots);
            };
        },
    },
) as unknown as SplitterComponent<GroupProps, GroupSlots>;
