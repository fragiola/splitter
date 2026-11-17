import type { EntityReader } from "./group-layout";
import type { GroupState, SeparatorState } from "./types";

/** The id of the separator between two neighbouring panels. */
export function separatorIdOf(
    beforePanelId: string,
    afterPanelId: string,
): string {
    return `${beforePanelId}:${afterPanelId}`;
}

function separatorAt(
    group: GroupState,
    index: number,
): SeparatorState | undefined {
    const before = group.panelIds[index];
    const after = group.panelIds[index + 1];
    if (before === undefined || after === undefined) {
        return undefined;
    }
    const id = separatorIdOf(before, after);
    const options = Object.hasOwn(group.separators, id)
        ? group.separators[id]
        : undefined;
    return {
        type: "separator",
        id,
        groupId: group.id,
        index,
        panelIds: [before, after],
        disabled: group.disabled || options?.disabled === true,
        resetOnDoubleClick: options?.resetOnDoubleClick !== false,
    };
}

// memoized per group object: the list is the same (frozen) array until the group changes
const cache = new WeakMap<GroupState, readonly SeparatorState[]>();

/** A group's separators, in order: one between each pair of neighbouring panels. */
export function separatorsOf(group: GroupState): readonly SeparatorState[] {
    let separators = cache.get(group);
    if (!separators) {
        separators = Object.freeze(
            group.panelIds.slice(1).flatMap((_, index) => {
                const separator = separatorAt(group, index);
                return separator ? [Object.freeze(separator)] : [];
            }),
        );
        cache.set(group, separators);
    }
    return separators;
}

/** The separator with this id, in whichever group it is. */
export function findSeparator(
    reader: EntityReader,
    separatorId: string,
): SeparatorState | undefined {
    // a panel id may hold a colon itself: try every split
    for (
        let at = separatorId.indexOf(":");
        at >= 0;
        at = separatorId.indexOf(":", at + 1)
    ) {
        const panel = reader.panel(separatorId.slice(0, at));
        const group = panel && reader.group(panel.groupId);
        if (!group || !panel) {
            continue;
        }
        const index = group.panelIds.indexOf(panel.id);
        if (group.panelIds[index + 1] === separatorId.slice(at + 1)) {
            return separatorAt(group, index);
        }
    }
    return undefined;
}

/** The group's separator options, keeping only the separators it has now. */
export function pruneSeparatorOptions(
    group: GroupState,
): GroupState["separators"] {
    const ids = new Set(separatorsOf(group).map(({ id }) => id));
    const kept = Object.entries(group.separators).filter(([id]) => ids.has(id));
    return kept.length === Object.keys(group.separators).length
        ? group.separators
        : Object.fromEntries(kept);
}
