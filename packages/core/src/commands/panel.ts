import { layoutNumbersEqual } from "../layout/numbers";
import { isCollapsedIn, resizePanel } from "../layout/resize-panel";
import { idField, sizeField } from "../schema/fragments";
import type { Draft } from "../state/draft";
import { commitLayout, constraintsOf, relayout } from "../state/group-layout";
import { pruneSeparatorOptions } from "../state/separators";
import type { GroupState, PanelConstraints, PanelState } from "../state/types";
import { sizeToPercentage } from "../units/resolve-size";
import { defineCommand, type Failure, fail, ok } from "./define";
import { isFailure, requireGroup, requirePanel } from "./rules";

const CONSTRAINT_KEYS = [
    "minSize",
    "maxSize",
    "defaultSize",
    "collapsible",
    "collapsedSize",
    "collapsedThreshold",
    "disabled",
    "groupResizeBehavior",
] as const;

const constraintFields = {
    minSize: sizeField(
        "the smallest size the panel takes when expanded (default 0)",
    ),
    maxSize: sizeField("the largest size the panel takes (default 100%)"),
    defaultSize: sizeField(
        "the size the panel starts with when no saved layout has one (default: an equal share of what is left)",
    ),
    collapsible: {
        type: "boolean",
        description:
            "whether the panel can collapse below its minimum, to its collapsed size",
    },
    collapsedSize: sizeField("the panel's size when collapsed (default 0)"),
    collapsedThreshold: sizeField(
        "how far past its minimum a drag goes before the panel collapses (default: halfway between collapsed and minimum)",
    ),
    disabled: {
        type: "boolean",
        description:
            "the panel is resized neither directly nor by resizing its neighbours (code still can)",
    },
    groupResizeBehavior: {
        enum: ["preserve-relative-size", "preserve-pixel-size"],
        description:
            "when the group resizes, keep the panel's percentage (preserve-relative-size, default) or its pixels (preserve-pixel-size)",
    },
} as const;

function nullable<const S extends { readonly description: string }>(schema: S) {
    const { description, ...rest } = schema;
    return {
        description: `${description}; null removes it`,
        anyOf: [rest, { type: "null" }],
    } as const;
}

const panelResult = {
    type: "object",
    properties: { panelId: idField("the panel") },
    required: ["panelId"],
    additionalProperties: false,
} as const;

const sizeResult = {
    type: "object",
    properties: {
        size: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "the panel's size after the command, in percent",
        },
    },
    required: ["size"],
    additionalProperties: false,
} as const;

/** Lays a group out again after its panels changed, and forgets the separators it lost. */
function restructure(draft: Draft, groupId: string): void {
    const group = relayout(draft, groupId);
    if (group) {
        const separators = pruneSeparatorOptions(group);
        if (separators !== group.separators) {
            draft.setGroup({ ...group, separators });
        }
    }
}

/** The panel's constraints in percent, with its group's measure. */
function resolvedOf(draft: Draft, group: GroupState, panelId: string) {
    const constraints = constraintsOf(draft, group);
    return {
        constraints,
        item: constraints.find((item) => item.panelId === panelId),
    };
}

export const panelAdd = defineCommand({
    name: "panel.add",
    description:
        "Registers a panel in a group, with its constraints as declared (sizes: a number is px; a string carries its unit, %, px, em, rem, vh or vw; a string without one is %). Panels sort by order (their document position), so a panel rendered conditionally lands in its place. The group's layout becomes its default layout, or the saved one once the group holds exactly its saved panels.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            id: idField("the new panel's id (generated when absent)"),
            groupId: idField("the group the panel belongs to"),
            order: {
                type: "number",
                description:
                    "where the panel sits among its group's panels (its document position); default: after the others",
            },
            ...constraintFields,
        },
        required: ["groupId"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { panelId: idField("the new panel's id") },
        required: ["panelId"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        if (payload.id !== undefined && draft.panel(payload.id)) {
            return fail(
                "refused",
                `a panel "${payload.id}" already exists`,
                "/id",
            );
        }
        const id = payload.id ?? draft.newId("panel");
        const orders = group.panelIds.map(
            (panelId) => draft.panel(panelId)?.order ?? 0,
        );
        const { id: _id, groupId, order, ...constraints } = payload;
        const panel: PanelState = {
            type: "panel",
            id,
            groupId,
            order: order ?? (orders.length === 0 ? 0 : Math.max(...orders) + 1),
            ...constraints,
        };
        draft.setPanel(panel);
        draft.setGroup({ ...group, panelIds: [...group.panelIds, id] });
        restructure(draft, group.id);
        return ok({ panelId: id });
    },
});

export const panelUpdate = defineCommand({
    name: "panel.update",
    description:
        "Changes what a panel's markup declares: its order or its constraints (null removes one, so its default applies). The layout is clamped to the new constraints.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            panelId: idField("the panel to change"),
            order: {
                type: "number",
                description:
                    "where the panel sits among its group's panels (its document position)",
            },
            minSize: nullable(constraintFields.minSize),
            maxSize: nullable(constraintFields.maxSize),
            defaultSize: nullable(constraintFields.defaultSize),
            collapsible: nullable(constraintFields.collapsible),
            collapsedSize: nullable(constraintFields.collapsedSize),
            collapsedThreshold: nullable(constraintFields.collapsedThreshold),
            disabled: nullable(constraintFields.disabled),
            groupResizeBehavior: nullable(constraintFields.groupResizeBehavior),
        },
        required: ["panelId"],
        additionalProperties: false,
    },
    resultSchema: panelResult,
    reduce(payload, { draft }) {
        const found = requirePanel(draft, payload.panelId);
        if (isFailure(found)) {
            return found;
        }
        const next: Record<string, unknown> = { ...found.panel };
        if (payload.order !== undefined) {
            next.order = payload.order;
        }
        for (const key of CONSTRAINT_KEYS) {
            const value = payload[key];
            if (value === null) {
                delete next[key];
            } else if (value !== undefined) {
                next[key] = value;
            }
        }
        draft.setPanel(next as unknown as PanelState);
        restructure(draft, found.group.id);
        return ok({ panelId: found.panel.id });
    },
});

export const panelRemove = defineCommand({
    name: "panel.remove",
    description:
        "Unregisters a panel. Its group's layout becomes the default layout of the panels left.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: { panelId: idField("the panel to remove") },
        required: ["panelId"],
        additionalProperties: false,
    },
    resultSchema: panelResult,
    reduce(payload, { draft }) {
        const found = requirePanel(draft, payload.panelId);
        if (isFailure(found)) {
            return found;
        }
        const { panel, group } = found;
        draft.deletePanel(panel.id);
        draft.setGroup({
            ...group,
            panelIds: group.panelIds.filter((id) => id !== panel.id),
        });
        restructure(draft, group.id);
        return ok({ panelId: panel.id });
    },
});

/** Resizes a panel to `size` percent and commits the layout; the size it got. */
function resizeTo(
    draft: Draft,
    group: GroupState,
    panelId: string,
    size: number,
    allowPartialSize = false,
): number {
    const { constraints } = resolvedOf(draft, group, panelId);
    const next = commitLayout(
        draft,
        group,
        resizePanel({
            layout: group.layout,
            constraints,
            panelId,
            size,
            allowPartialSize,
        }),
    );
    return next.layout[panelId] ?? 0;
}

export const panelResize = defineCommand({
    name: "panel.resize",
    description:
        "Resizes a panel to a size (a number is px; a string carries its unit, %, px, em, rem, vh or vw; a string without one is %). The nearest panels make room within their constraints, those after it first. A size other than % needs the group measured. Code may resize a disabled panel. Returns the size it got, in percent.",
    transient: true,
    payloadSchema: {
        type: "object",
        properties: {
            panelId: idField("the panel to resize"),
            size: sizeField("the size to give it"),
        },
        required: ["panelId", "size"],
        additionalProperties: false,
    },
    resultSchema: sizeResult,
    reduce(payload, { draft }) {
        const found = requirePanel(draft, payload.panelId);
        if (isFailure(found)) {
            return found;
        }
        const size = sizeToPercentage(payload.size, found.group.measure);
        if (size === undefined) {
            return fail(
                "refused",
                `"${String(payload.size)}" cannot be resolved before group "${found.group.id}" is measured`,
                "/size",
            );
        }
        return ok({ size: resizeTo(draft, found.group, found.panel.id, size) });
    },
});

/** `refused` unless the panel is collapsible. */
function requireCollapsible(
    draft: Draft,
    group: GroupState,
    panel: PanelConstraints & { id: string },
): Failure | undefined {
    const { item } = resolvedOf(draft, group, panel.id);
    return item?.collapsible
        ? undefined
        : fail("refused", `panel "${panel.id}" is not collapsible`, "/panelId");
}

export const panelCollapse = defineCommand({
    name: "panel.collapse",
    description:
        "Collapses a collapsible panel to its collapsed size; the panel remembers its size to return to it on expand. Refused when the panel is not collapsible or the other panels cannot take its space. Returns its size, in percent.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: { panelId: idField("the panel to collapse") },
        required: ["panelId"],
        additionalProperties: false,
    },
    resultSchema: sizeResult,
    reduce(payload, { draft }) {
        const found = requirePanel(draft, payload.panelId);
        if (isFailure(found)) {
            return found;
        }
        const { panel, group } = found;
        const refused = requireCollapsible(draft, group, panel);
        if (refused) {
            return refused;
        }
        const { item } = resolvedOf(draft, group, panel.id);
        if (!item || isCollapsedIn(item, group.layout)) {
            return ok({ size: group.layout[panel.id] ?? 0 });
        }
        const size = resizeTo(draft, group, panel.id, item.collapsedSize);
        if (!layoutNumbersEqual(size, item.collapsedSize)) {
            return fail(
                "refused",
                `the other panels of group "${group.id}" cannot take the space of panel "${panel.id}"`,
                "/panelId",
            );
        }
        return ok({ size });
    },
});

export const panelExpand = defineCommand({
    name: "panel.expand",
    description:
        "Expands a collapsed panel to the size it had before collapsing (its minimum when it has none), or to the largest size that fits when the other panels cannot make room for all of it. Refused when the panel is not collapsible or nothing can make room. Returns its size, in percent.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: { panelId: idField("the panel to expand") },
        required: ["panelId"],
        additionalProperties: false,
    },
    resultSchema: sizeResult,
    reduce(payload, { draft }) {
        const found = requirePanel(draft, payload.panelId);
        if (isFailure(found)) {
            return found;
        }
        const { panel, group } = found;
        const refused = requireCollapsible(draft, group, panel);
        if (refused) {
            return refused;
        }
        const { item } = resolvedOf(draft, group, panel.id);
        if (!item || !isCollapsedIn(item, group.layout)) {
            return ok({ size: group.layout[panel.id] ?? 0 });
        }
        const target = panel.restoreSize ?? item.minSize;
        const size = resizeTo(
            draft,
            group,
            panel.id,
            target === 0 ? 1 : target,
            true,
        );
        if (layoutNumbersEqual(size, item.collapsedSize)) {
            return fail(
                "refused",
                `the other panels of group "${group.id}" cannot make room for panel "${panel.id}"`,
                "/panelId",
            );
        }
        return ok({ size });
    },
});
