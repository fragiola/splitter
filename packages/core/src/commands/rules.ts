import type { Layout } from "../layout/types";
import type { Draft } from "../state/draft";
import { findSeparator } from "../state/separators";
import type { GroupState, PanelState, SeparatorState } from "../state/types";
import { type Failure, fail } from "./define";

/** The group with this id, or `not_found` at `path`. */
export function requireGroup(
    draft: Draft,
    groupId: string,
    path = "/groupId",
): GroupState | Failure {
    return (
        draft.group(groupId) ?? fail("not_found", `no group "${groupId}"`, path)
    );
}

/** The panel with this id, and its group, or `not_found` at `path`. */
export function requirePanel(
    draft: Draft,
    panelId: string,
    path = "/panelId",
): { panel: PanelState; group: GroupState } | Failure {
    const panel = draft.panel(panelId);
    const group = panel && draft.group(panel.groupId);
    return panel && group
        ? { panel, group }
        : fail("not_found", `no panel "${panelId}"`, path);
}

/** The separator with this id, or `not_found`. */
export function requireSeparator(
    draft: Draft,
    separatorId: string,
): SeparatorState | Failure {
    return (
        findSeparator(draft, separatorId) ??
        fail("not_found", `no separator "${separatorId}"`, "/separatorId")
    );
}

/** Whether a lookup failed. */
export function isFailure<V extends object>(
    value: V | Failure,
): value is Failure {
    return "ok" in value && value.ok === false;
}

/** `invalid_payload` when a layout does not hold exactly the group's panels. */
export function checkLayoutPanels(
    group: GroupState,
    layout: Layout,
    path: string,
): Failure | undefined {
    for (const panelId of Object.keys(layout)) {
        if (!group.panelIds.includes(panelId)) {
            return fail(
                "invalid_payload",
                `"${panelId}" is not a panel of group "${group.id}"`,
                `${path}/${panelId.replace(/~/g, "~0").replace(/\//g, "~1")}`,
            );
        }
    }
    for (const panelId of group.panelIds) {
        if (!Object.hasOwn(layout, panelId)) {
            return fail(
                "invalid_payload",
                `the layout has no size for panel "${panelId}"`,
                path,
            );
        }
    }
    return undefined;
}
