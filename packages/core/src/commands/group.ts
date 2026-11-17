import { defaultLayout } from "../layout/default-layout";
import { validateLayout } from "../layout/validate-layout";
import { idField, layoutField, orientationField } from "../schema/fragments";
import { groupJsonOf } from "../state/document";
import { commitLayout, constraintsOf, remeasure } from "../state/group-layout";
import type { GroupState } from "../state/types";
import { defineCommand, fail, ok } from "./define";
import { checkLayoutPanels, isFailure, requireGroup } from "./rules";

const layoutResult = {
    type: "object",
    properties: {
        layout: layoutField("the group's layout after the command"),
    },
    required: ["layout"],
    additionalProperties: false,
} as const;

export const groupAdd = defineCommand({
    name: "group.add",
    description:
        "Registers a group: panels laid out side by side (horizontal) or stacked (vertical). Its panels are added with panel.add. A nested group names the panel it sits in. A group the loaded document saved takes its saved layout once all its saved panels are added.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            id: idField("the new group's id (generated when absent)"),
            orientation: orientationField(
                "how its panels are laid out (default horizontal)",
            ),
            parentPanelId: idField("the panel a nested group sits in"),
            disabled: {
                type: "boolean",
                description:
                    "no separator of the group can be used (default false)",
            },
        },
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { groupId: idField("the new group's id") },
        required: ["groupId"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        if (payload.id !== undefined && draft.group(payload.id)) {
            return fail(
                "refused",
                `a group "${payload.id}" already exists`,
                "/id",
            );
        }
        const id = payload.id ?? draft.newId("group");
        const group: GroupState = {
            type: "group",
            id,
            orientation: payload.orientation ?? "horizontal",
            ...(payload.parentPanelId === undefined
                ? {}
                : { parentPanelId: payload.parentPanelId }),
            disabled: payload.disabled === true,
            panelIds: [],
            layout: {},
            pristine: true,
            separators: {},
        };
        draft.setGroup(group);
        return ok({ groupId: id });
    },
});

export const groupUpdate = defineCommand({
    name: "group.update",
    description:
        "Changes what a group's markup declares: its orientation, the panel it sits in (null: none), whether it is disabled.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            groupId: idField("the group to change"),
            orientation: orientationField("how its panels are laid out"),
            parentPanelId: {
                anyOf: [idField("a panel id"), { type: "null" }],
                description: "the panel it sits in; null: it is not nested",
            },
            disabled: {
                type: "boolean",
                description: "no separator of the group can be used",
            },
        },
        required: ["groupId"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { groupId: idField("the group changed") },
        required: ["groupId"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        const { parentPanelId: _parent, ...rest } = group;
        const parent =
            payload.parentPanelId === undefined
                ? group.parentPanelId
                : (payload.parentPanelId ?? undefined);
        draft.setGroup({
            ...rest,
            ...(parent === undefined ? {} : { parentPanelId: parent }),
            orientation: payload.orientation ?? group.orientation,
            disabled: payload.disabled ?? group.disabled,
        });
        return ok({ groupId: group.id });
    },
});

export const groupRemove = defineCommand({
    name: "group.remove",
    description:
        "Unregisters a group and its panels. Groups nested in its panels stay: they are removed on their own. With keepLayout, a layout the user changed is kept as a saved group (it stays in the JSON document) and comes back when the group registers again with the same panels: a view that unmounts and mounts again keeps its layout.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            groupId: idField("the group to remove"),
            keepLayout: {
                type: "boolean",
                description:
                    "keep the group's layout, when it is not the default one, until it registers again",
            },
        },
        required: ["groupId"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            groupId: idField("the removed group"),
            panelIds: {
                type: "array",
                items: { type: "string" },
                description: "the panels removed with it",
            },
        },
        required: ["groupId", "panelIds"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        if (payload.keepLayout === true && !group.pristine) {
            draft.setPending(groupJsonOf(draft, group));
        }
        for (const panelId of group.panelIds) {
            draft.deletePanel(panelId);
        }
        draft.deleteGroup(group.id);
        return ok({ groupId: group.id, panelIds: [...group.panelIds] });
    },
});

export const groupSetLayout = defineCommand({
    name: "group.set-layout",
    description:
        "Sets a group's whole layout: each panel's size in percent, by panel id (every panel of the group, no other). Sizes that do not sum to 100 are scaled; each is clamped to its panel's constraints (disabled panels included). Returns the layout applied.",
    transient: true,
    payloadSchema: {
        type: "object",
        properties: {
            groupId: idField("the group to lay out"),
            layout: layoutField(
                "each panel's size in percent, by panel id: every panel of the group",
            ),
        },
        required: ["groupId", "layout"],
        additionalProperties: false,
    },
    resultSchema: layoutResult,
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        const wrong = checkLayoutPanels(group, payload.layout, "/layout");
        if (wrong) {
            return wrong;
        }
        const next = commitLayout(
            draft,
            group,
            validateLayout(payload.layout, constraintsOf(draft, group)),
        );
        return ok({ layout: { ...next.layout } });
    },
});

export const groupReset = defineCommand({
    name: "group.reset",
    description:
        "Resets a group to its default layout: each panel at its defaultSize, the others sharing the rest equally.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: { groupId: idField("the group to reset") },
        required: ["groupId"],
        additionalProperties: false,
    },
    resultSchema: layoutResult,
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        const next = commitLayout(
            draft,
            group,
            defaultLayout(constraintsOf(draft, group)),
            { pristine: true },
        );
        return ok({ layout: { ...next.layout } });
    },
});

export const groupMeasure = defineCommand({
    name: "group.measure",
    description:
        "Reports what a group measures on screen, so sizes in px, em, rem, vh and vw resolve without a DOM. The engine runs it as a transient step whenever the group resizes; it is not saved in the JSON. Panels with groupResizeBehavior preserve-pixel-size keep their pixels; the layout is clamped to the constraints the measure resolves.",
    transient: true,
    payloadSchema: {
        type: "object",
        properties: {
            groupId: idField("the group measured"),
            axisSize: {
                type: "number",
                minimum: 0,
                description:
                    "the group's size along its orientation, in pixels (the sum of its panels' sizes)",
            },
            fontSize: {
                type: "number",
                minimum: 0,
                description: "the group's computed font size, in pixels (em)",
            },
            rootFontSize: {
                type: "number",
                minimum: 0,
                description: "the root element's font size, in pixels (rem)",
            },
            viewportWidth: {
                type: "number",
                minimum: 0,
                description: "the viewport's width, in pixels (vw)",
            },
            viewportHeight: {
                type: "number",
                minimum: 0,
                description: "the viewport's height, in pixels (vh)",
            },
        },
        required: ["groupId", "axisSize"],
        additionalProperties: false,
    },
    resultSchema: layoutResult,
    reduce(payload, { draft }) {
        const group = requireGroup(draft, payload.groupId);
        if (isFailure(group)) {
            return group;
        }
        const { groupId: _groupId, ...measure } = payload;
        const next = remeasure(draft, group, measure);
        return ok({ layout: { ...next.layout } });
    },
});
