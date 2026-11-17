import { defaultLayout } from "../layout/default-layout";
import { layoutNumbersEqual } from "../layout/numbers";
import { preservePixelSizes } from "../layout/preserve-pixel-sizes";
import { isCollapsedIn } from "../layout/resize-panel";
import { resolveConstraints } from "../layout/resolve-constraints";
import type { Layout, ResolvedConstraints } from "../layout/types";
import { validateLayout } from "../layout/validate-layout";
import type { GroupMeasure } from "../units/resolve-size";
import type { Draft } from "./draft";
import type { GroupState, PanelState, SplitterState } from "./types";

/** Reads entities from a draft or a committed state alike. */
export interface EntityReader {
    group(id: string): GroupState | undefined;
    panel(id: string): PanelState | undefined;
}

/** An {@link EntityReader} over a committed state. */
export function readerOf(state: SplitterState): EntityReader {
    return {
        group: (id) =>
            Object.hasOwn(state.groups, id) ? state.groups[id] : undefined,
        panel: (id) =>
            Object.hasOwn(state.panels, id) ? state.panels[id] : undefined,
    };
}

/** The group's panels, in order. */
export function panelsOf(
    reader: EntityReader,
    group: GroupState,
): PanelState[] {
    return group.panelIds.flatMap((panelId) => {
        const panel = reader.panel(panelId);
        return panel ? [panel] : [];
    });
}

/** The group's panels' constraints in percent, in order, with a measure (default: the group's). */
export function constraintsOf(
    reader: EntityReader,
    group: GroupState,
    measure: GroupMeasure | undefined = group.measure,
): ResolvedConstraints[] {
    return panelsOf(reader, group).map((panel) =>
        resolveConstraints(panel.id, panel, measure),
    );
}

/** Whether two layouts hold the same panels at the same (rounded) sizes. */
export function layoutsEqual(a: Layout, b: Layout): boolean {
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every(
            (key) =>
                Object.hasOwn(b, key) &&
                layoutNumbersEqual(a[key] ?? 0, b[key] ?? 0),
        )
    );
}

/**
 * Sets a group's layout. A panel this change collapses remembers the size it had, to return to
 * it on expand (`trackRestore`, default true).
 */
export function commitLayout(
    draft: Draft,
    group: GroupState,
    next: Layout,
    options: { pristine?: boolean; trackRestore?: boolean } = {},
): GroupState {
    const { pristine = false, trackRestore = true } = options;
    if (trackRestore) {
        for (const item of constraintsOf(draft, group)) {
            if (
                item.collapsible &&
                !isCollapsedIn(item, group.layout) &&
                isCollapsedIn(item, next)
            ) {
                const panel = draft.panel(item.panelId);
                const size = group.layout[item.panelId];
                if (panel && size !== undefined) {
                    draft.setPanel({ ...panel, restoreSize: size });
                }
            }
        }
    }
    // an unchanged layout keeps its object (and a default layout stays the default)
    const unchanged = layoutsEqual(group.layout, next);
    const nextPristine = unchanged ? group.pristine || pristine : pristine;
    if (unchanged && nextPristine === group.pristine) {
        return group;
    }
    return draft.setGroup({
        ...group,
        layout: unchanged ? group.layout : { ...next },
        pristine: nextPristine,
    });
}

/**
 * The key of a set of panels in a group's `layoutMemory`: the JSON of its sorted ids, so the
 * order the panels are in does not matter and any id (a colon, a quote) is safe.
 */
export function panelSetKey(panelIds: readonly string[]): string {
    return JSON.stringify([...panelIds].sort());
}

/**
 * The group with the layout it is leaving remembered for its panel set (a layout the user
 * changed only: a default one is derived again anyway), and the one remembered for the set it is
 * entering, when there is one.
 */
function rememberLayout(
    draft: Draft,
    group: GroupState,
    panelIds: readonly string[],
): { group: GroupState; remembered: Readonly<Layout> | undefined } {
    const leaving = Object.keys(group.layout);
    const memory: Record<string, Readonly<Layout>> = { ...group.layoutMemory };
    if (leaving.length > 0 && !group.pristine) {
        Object.defineProperty(memory, panelSetKey(leaving), {
            value: group.layout,
            enumerable: true,
            writable: true,
            configurable: true,
        });
    }
    const key = panelSetKey(panelIds);
    const remembered = Object.hasOwn(memory, key) ? memory[key] : undefined;
    return {
        group: draft.setGroup({ ...group, layoutMemory: memory }),
        remembered,
    };
}

/** Sorts panel ids by their panels' `order`, keeping the current order on ties (stable). */
function sortPanelIds(draft: Draft, panelIds: readonly string[]): string[] {
    return [...panelIds].sort(
        (a, b) => (draft.panel(a)?.order ?? 0) - (draft.panel(b)?.order ?? 0),
    );
}

/**
 * Applies the loaded document's saved layout of a group once the group holds exactly the saved
 * panels: their sizes, collapsed panels at their collapsed size, and each restore size.
 */
function applyPending(draft: Draft, group: GroupState): GroupState {
    const saved = draft.pendingGroup(group.id);
    if (
        !saved ||
        saved.panels.length !== group.panelIds.length ||
        !saved.panels.every(({ id }) => group.panelIds.includes(id))
    ) {
        return group;
    }
    const constraints = constraintsOf(draft, group);
    const layout: Layout = {};
    for (const entry of saved.panels) {
        const item = constraints.find(({ panelId }) => panelId === entry.id);
        layout[entry.id] =
            entry.collapsed === true && item?.collapsible
                ? item.collapsedSize
                : entry.size;
        const panel = draft.panel(entry.id);
        if (panel && entry.restoreSize !== undefined) {
            draft.setPanel({ ...panel, restoreSize: entry.restoreSize });
        }
    }
    draft.deletePending(group.id);
    return commitLayout(draft, group, validateLayout(layout, constraints), {
        trackRestore: false,
    });
}

/**
 * After the group's panels changed (added, removed, reordered or their constraints changed):
 * panels sorted by `order`, then the saved layout when the group now holds exactly its panels;
 * else, when the set of panels changed, the layout the group last had with the new set (the one
 * it leaves is remembered), or the default layout; else the default layout again while it is
 * pristine, or the layout validated against the new constraints.
 */
export function relayout(
    draft: Draft,
    groupId: string,
): GroupState | undefined {
    const current = draft.group(groupId);
    if (!current) {
        return undefined;
    }
    const panelIds = sortPanelIds(
        draft,
        current.panelIds.filter((id) => draft.panel(id) !== undefined),
    );
    const sameOrder =
        panelIds.length === current.panelIds.length &&
        panelIds.every((id, i) => current.panelIds[i] === id);
    const group = sameOrder
        ? current
        : draft.setGroup({ ...current, panelIds });
    const pendingApplied = applyPending(draft, group);
    if (pendingApplied !== group) {
        return pendingApplied;
    }
    const constraints = constraintsOf(draft, group);
    const samePanels =
        Object.keys(group.layout).length === panelIds.length &&
        panelIds.every((id) => Object.hasOwn(group.layout, id));
    if (!samePanels) {
        const { group: remembering, remembered } = rememberLayout(
            draft,
            group,
            panelIds,
        );
        if (remembered) {
            return commitLayout(
                draft,
                remembering,
                validateLayout(remembered, constraints),
                { trackRestore: false },
            );
        }
        return commitLayout(draft, remembering, defaultLayout(constraints), {
            pristine: true,
            trackRestore: false,
        });
    }
    if (group.pristine) {
        return commitLayout(draft, group, defaultLayout(constraints), {
            pristine: true,
            trackRestore: false,
        });
    }
    return commitLayout(
        draft,
        group,
        validateLayout(group.layout, constraints),
    );
}

/**
 * A new measure of the group: collapsed panels stay collapsed at their (newly resolved) collapsed
 * size, `preserve-pixel-size` panels keep their pixels, and the layout is validated against the
 * constraints the measure resolves (or derived again while it is the default).
 */
export function remeasure(
    draft: Draft,
    group: GroupState,
    measure: GroupMeasure,
): GroupState {
    const before = constraintsOf(draft, group);
    const measured = draft.setGroup({ ...group, measure: { ...measure } });
    const after = constraintsOf(draft, measured);
    if (group.pristine) {
        return commitLayout(draft, measured, defaultLayout(after), {
            pristine: true,
            trackRestore: false,
        });
    }
    const layout: Layout = { ...group.layout };
    for (const [index, item] of before.entries()) {
        const next = after[index];
        if (next && isCollapsedIn(item, group.layout)) {
            layout[item.panelId] = next.collapsedSize;
        }
    }
    const preserved = preservePixelSizes({
        layout,
        constraints: after,
        prevAxisSize: group.measure?.axisSize ?? 0,
        nextAxisSize: measure.axisSize,
    });
    return commitLayout(draft, measured, validateLayout(preserved, after), {
        trackRestore: false,
    });
}
