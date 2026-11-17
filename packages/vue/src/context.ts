import type {
    AnyTypes,
    Orientation,
    SplitterEngine,
    SplitterModel,
    SplitterTypes,
} from "@fragiola/splitter";
import { type InjectionKey, inject } from "vue";
import type { GroupRegistry } from "./utils/group-registry";

/**
 * The context of a `Splitter.Group`: its model and engine (shared by every group nested in it),
 * its id, and what its parts register with. The registry is erased (`AnyTypes`): a child cannot
 * infer the group's `T` through injection, so the typed surface is each part's props and
 * `typedSplitter<T>()`. A new `id` or `model` remounts the group, so these never change for a
 * mounted group.
 */
export interface GroupContextValue {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly groupId: string;
    readonly registry: GroupRegistry;
    /** the orientation the group declares: what it renders with until the model has it */
    readonly orientation: () => Orientation;
    /** whether the group declares itself disabled (same) */
    readonly disabled: () => boolean;
    /**
     * a panel's size before the model has it: from the group's `layout` or `defaultLayout`, or the
     * model's saved layout of the group (undefined otherwise)
     */
    readonly initialSizeOf: (panelId: string) => number | undefined;
}

export const GroupKey: InjectionKey<GroupContextValue> =
    Symbol("SplitterGroup");

/** The panel a subtree renders in: a group inside it nests in it and joins its model. */
export interface PanelContextValue {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly panelId: () => string;
}

export const PanelKey: InjectionKey<PanelContextValue> =
    Symbol("SplitterPanel");

export function useGroupContext(part: string): GroupContextValue {
    const context = inject(GroupKey, null);
    if (!context) {
        throw new Error(`${part} must be rendered inside Splitter.Group`);
    }
    return context;
}

/**
 * A model of any registry, seen as `SplitterModel<AnyTypes>`. `SplitterModel<T>` takes `T` in its
 * commands' payloads, so it is not assignable to the erased type; the adapter only passes it on.
 */
export function eraseModel<T extends SplitterTypes>(
    model: SplitterModel<T>,
): SplitterModel<AnyTypes> {
    return model as unknown as SplitterModel<AnyTypes>;
}

/** The erased model seen with the registry `T` the caller declares (`useSplitter<T>()`). */
export function typedModel<T extends SplitterTypes>(
    model: SplitterModel,
): SplitterModel<T> {
    return model as unknown as SplitterModel<T>;
}
