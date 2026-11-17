import { computed, type Signal } from "@angular/core";
import type {
    AnyTypes,
    GroupIdOf,
    SplitterEngine,
    SplitterHandle,
    SplitterModel,
    SplitterRef,
    SplitterTypes,
} from "@fragiola/splitter";
import { injectGroupContext, requireRuntime, typedModel } from "../context";
import { fromStore } from "../utils/signals";

/** The splitter a part renders in: its model, its engine, and the id of the enclosing group. */
export interface SplitterContextValue<T extends SplitterTypes = AnyTypes> {
    model: SplitterModel<T>;
    engine: SplitterEngine;
    /** the enclosing group (inside a `[splitterGroup]`), or the root group (through a ref) */
    groupId: GroupIdOf<T>;
}

/** A splitter ref, or a function that reads one (a signal input: `() => this.splitterRef()`). */
export type SplitterRefSource =
    | SplitterRef
    | (() => SplitterRef | undefined)
    | undefined;

function contextOf<T extends SplitterTypes>(
    source: SplitterHandle,
): SplitterContextValue<T> {
    return {
        model: typedModel<T>(source.model),
        engine: source.engine,
        groupId: source.groupId as GroupIdOf<T>,
    };
}

/** @internal the ref a source gives now */
export function refOf(source: SplitterRefSource): SplitterRef | undefined {
    return typeof source === "function" ? source() : source;
}

/** @internal the splitter a ref holds, as a signal (`null` while no root group holds it) */
export function heldSplitter<T extends SplitterTypes>(
    source: SplitterRefSource,
): Signal<SplitterContextValue<T> | null> {
    const held = fromStore(
        () => refOf(source)?.subscribe,
        () => refOf(source)?.current ?? null,
    );
    return computed(() => {
        const handle = held();
        return handle ? contextOf<T>(handle) : null;
    });
}

/** @internal the enclosing group's splitter, as a signal that throws until the group has inputs */
export function enclosingSplitter<T extends SplitterTypes>(
    part: string,
): Signal<SplitterContextValue<T>> {
    const group = injectGroupContext(part);
    return computed(() => {
        const { model, engine, groupId } = requireRuntime(group, part);
        return contextOf<T>({ model, engine, groupId });
    });
}

/**
 * The model and engine of the splitter, as a signal. Inside a `[splitterGroup]`, its own
 * (`groupId` is the enclosing group): read it once the group has its inputs (in an effect, a
 * computed, a template or a handler, not in a constructor). With a `splitterRef` (or a function
 * that reads one), the root group's that holds the ref, from anywhere: `null` while none does.
 * Call it in an injection context.
 *
 * ```ts
 * readonly splitter = injectSplitter();
 * reset() {
 *     const { model, groupId } = this.splitter();
 *     model.run("group.reset", { groupId });
 * }
 * readonly outside = injectSplitter(this.splitterRef); // outside the group: null until held
 * ```
 */
export function injectSplitter<T extends SplitterTypes = AnyTypes>(): Signal<
    SplitterContextValue<T>
>;
export function injectSplitter<T extends SplitterTypes = AnyTypes>(
    splitterRef: SplitterRef | (() => SplitterRef | undefined),
): Signal<SplitterContextValue<T> | null>;
export function injectSplitter<T extends SplitterTypes = AnyTypes>(
    ...args: [] | [SplitterRef | (() => SplitterRef | undefined)]
): Signal<SplitterContextValue<T> | null> {
    if (args.length === 0) {
        return enclosingSplitter<T>("injectSplitter");
    }
    return heldSplitter<T>(args[0]);
}
