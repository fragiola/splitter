// What a group shares with its parts, and a panel with a group nested in it.

import { InjectionToken, inject, type Signal } from "@angular/core";
import type {
    AnyTypes,
    Orientation,
    SplitterEngine,
    SplitterModel,
    SplitterTypes,
} from "@fragiola/splitter";
import type { GroupRegistry } from "./utils/group-registry";

/**
 * A group's model and engine (shared by every group nested in it), its id, and what its parts
 * register with. The registry is erased (`AnyTypes`): the typed surface is each directive's
 * inputs.
 */
export interface GroupRuntime {
    readonly model: SplitterModel;
    readonly engine: SplitterEngine;
    readonly groupId: string;
    readonly registry: GroupRegistry;
}

/** The context of a `[splitterGroup]`. */
export interface GroupContext {
    /**
     * its model, engine, id and registry, made from its inputs once they are set (its `ngOnInit`,
     * which runs before its parts'); `null` before
     */
    readonly runtime: Signal<GroupRuntime | null>;
    /** the orientation the group declares: what it renders with until the model has it */
    readonly orientation: Signal<Orientation>;
    /** whether the group declares itself disabled (same) */
    readonly disabled: Signal<boolean>;
    /**
     * a panel's size before the model has it: from the group's `layout` or `defaultLayout`, or the
     * model's saved layout of the group (undefined otherwise)
     */
    initialSizeOf(panelId: string): number | undefined;
}

export const SPLITTER_GROUP = new InjectionToken<GroupContext>("SplitterGroup");

/** The panel a subtree renders in: a group inside it nests in it and joins its model. */
export interface PanelContext {
    /** the group the panel is in */
    readonly group: GroupContext;
    readonly panelId: Signal<string>;
}

export const SPLITTER_PANEL = new InjectionToken<PanelContext>("SplitterPanel");

/** The enclosing group's context, or a clear error outside one. */
export function injectGroupContext(part: string): GroupContext {
    const context = inject(SPLITTER_GROUP, { optional: true });
    if (!context) {
        throw new Error(`${part} must be used inside [splitterGroup]`);
    }
    return context;
}

/** A group's runtime, or a clear error when it is read before the group's inputs are set. */
export function requireRuntime(
    group: GroupContext,
    part: string,
): GroupRuntime {
    const runtime = group.runtime();
    if (!runtime) {
        throw new Error(
            `${part}: its [splitterGroup] has no inputs yet (read it after the group's ngOnInit)`,
        );
    }
    return runtime;
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

/** The erased model seen with the registry `T` the caller declares (`injectSplitter<T>()`). */
export function typedModel<T extends SplitterTypes>(
    model: SplitterModel,
): SplitterModel<T> {
    return model as unknown as SplitterModel<T>;
}
