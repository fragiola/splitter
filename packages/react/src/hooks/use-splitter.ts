import type {
    AnyTypes,
    GroupIdOf,
    SplitterEngine,
    SplitterHandle,
    SplitterModel,
    SplitterRef,
    SplitterTypes,
} from "@fragiola/splitter";
import * as React from "react";
import { GroupContext, typedModel } from "../context";

/** The splitter a part renders in: its model, its engine, and the id of the enclosing group. */
export interface SplitterContextValue<T extends SplitterTypes = AnyTypes> {
    model: SplitterModel<T>;
    engine: SplitterEngine;
    /** the enclosing group (inside a `Splitter.Group`), or the root group (through a ref) */
    groupId: GroupIdOf<T>;
}

const noSubscription = () => () => {};
const noSplitter = () => null;

/**
 * The model and engine of the splitter: inside a `Splitter.Group`, its own (`groupId` is the
 * enclosing group); with a `splitterRef`, the root group's that holds the ref, from anywhere, or
 * `null` while none does.
 *
 * ```ts
 * const { model, groupId } = useSplitter();
 * model.run("group.reset", { groupId });
 * const splitter = useSplitter(splitterRef); // outside the group
 * ```
 */
export function useSplitter<
    T extends SplitterTypes = AnyTypes,
>(): SplitterContextValue<T>;
export function useSplitter<T extends SplitterTypes = AnyTypes>(
    splitterRef: SplitterRef,
): SplitterContextValue<T> | null;
export function useSplitter<T extends SplitterTypes = AnyTypes>(
    splitterRef?: SplitterRef,
): SplitterContextValue<T> | null {
    const group = React.useContext(GroupContext);
    const read = splitterRef ? () => splitterRef.current : noSplitter;
    const held: SplitterHandle | null = React.useSyncExternalStore(
        splitterRef ? splitterRef.subscribe : noSubscription,
        read,
        read,
    );
    const source = splitterRef ? held : group;
    const value = React.useMemo(
        () =>
            source
                ? {
                      model: typedModel<T>(source.model),
                      engine: source.engine,
                      groupId: source.groupId as GroupIdOf<T>,
                  }
                : null,
        [source],
    );
    if (!splitterRef && !value) {
        throw new Error(
            "useSplitter must be used inside Splitter.Group, or be given a splitterRef",
        );
    }
    return value;
}
