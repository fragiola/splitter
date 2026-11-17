// Type fixtures (checked by `pnpm typecheck`, never run): what must compile, and what must not
// (`@ts-expect-error`). The registry `T` flows from `typedSplitter<T>()` into the parts' props, and
// from the composables' type argument into the model.
import type * as Core from "@fragiola/splitter";
import { type ComputedRef, h } from "vue";
import {
    createSplitterModel,
    type GroupPartState,
    type Layout,
    type PanelPartState,
    type SeparatorPartState,
    Splitter,
    type SplitterJson,
    type SplitterModel,
    type SplitterRef,
    typedSplitter,
    useSplitter,
    useSplitterState,
} from "../../src";

interface Types {
    readonly groupId: "main" | "sidebar";
    readonly panelId: "nav" | "editor";
}

/** `true` when `A` and `B` are the same type. */
type Equal<A, B> =
    (<V>() => V extends A ? 1 : 2) extends <V>() => V extends B ? 1 : 2
        ? true
        : false;

/** The props a component takes. */
type PropsOf<C extends abstract new (...args: never) => { $props: object }> =
    InstanceType<C>["$props"];

/** What a component's scoped slot `K` receives. */
type SlotScope<
    C extends abstract new (
        ...args: never
    ) => { $slots: object },
    K extends keyof InstanceType<C>["$slots"],
> = Parameters<NonNullable<InstanceType<C>["$slots"][K]>>[0];

const Typed = typedSplitter<Types>();

// the registry's ids in the typed parts' props
export const groupId: Equal<
    PropsOf<typeof Typed.Group>["id"],
    "main" | "sidebar" | undefined
> = true;
export const panelId: Equal<
    PropsOf<typeof Typed.Panel>["id"],
    "nav" | "editor" | undefined
> = true;
export const typedModel: Equal<
    PropsOf<typeof Typed.Group>["model"],
    SplitterModel<Types> | undefined
> = true;
// the untyped parts take any id
export const anyPanelId: Equal<
    PropsOf<typeof Splitter.Panel>["id"],
    string | undefined
> = true;

// the callbacks a parent listens to (`v-model:layout`, `@layout-commit`, `@resize`)
export const updateLayout: Equal<
    PropsOf<typeof Splitter.Group>["onUpdate:layout"],
    ((layout: Readonly<Layout>) => void) | undefined
> = true;

// the render slot and the default slot get each part's state
export const groupState: Equal<
    SlotScope<typeof Splitter.Group, "render">["state"],
    GroupPartState
> = true;
export const panelState: Equal<
    SlotScope<typeof Splitter.Panel, "default">["state"],
    PanelPartState
> = true;
export const separatorState: Equal<
    SlotScope<typeof Splitter.Separator, "render">["state"],
    SeparatorPartState
> = true;

export function render(splitterRef: SplitterRef) {
    const model = createSplitterModel<Types>();
    return h(
        Typed.Group,
        { id: "main", model, splitterRef, orientation: "vertical" },
        () => [
            h(Typed.Panel, { id: "nav", minSize: 200, collapsible: true }),
            h(Splitter.Separator, { resetOnDoubleClick: false }),
            h(Typed.Panel, {
                id: "editor",
                groupResizeBehavior: "preserve-pixel-size",
            }),
        ],
    );
}

export function wrong() {
    return [
        // @ts-expect-error: not a panel id of the registry
        h(Typed.Panel, { id: "other" }),
        // @ts-expect-error: a size is a number or a string
        h(Splitter.Panel, { minSize: true }),
        // @ts-expect-error: not an orientation
        h(Splitter.Group, { orientation: "diagonal" }),
    ];
}

export function composables(splitterRef: SplitterRef) {
    const { model, groupId } = useSplitter<Types>();
    model.run("group.reset", { groupId });
    // @ts-expect-error: not a panel id of the registry
    model.run("panel.collapse", { panelId: "other" });
    const held = useSplitter<Types>(splitterRef);
    held.value?.model.run("panel.collapse", { panelId: "nav" });

    const collapsed: ComputedRef<boolean> = useSplitterState<Types, boolean>(
        ({ model }) => model.is("panel-collapsed", { panelId: "nav" }),
    );
    const size = useSplitterState(
        ({ model }) => model.get("panel-size-by", { panelId: "a" })?.percentage,
        { splitterRef },
    );
    // @ts-expect-error: undefined while no group holds the ref
    const sure: ComputedRef<number> = useSplitterState(() => 1, {
        splitterRef,
    });
    useSplitterState<Types>(({ model }) =>
        // @ts-expect-error: not a panel id of the registry
        model.is("panel-collapsed", { panelId: "other" }),
    );
    return [collapsed, size, sure];
}

// the core's types, re-exported: the core's own, not look-alikes
export const sameModel: Equal<
    SplitterModel<Types>,
    Core.SplitterModel<Types>
> = true;
export const sameJson: Equal<SplitterJson, Core.SplitterJson> = true;
