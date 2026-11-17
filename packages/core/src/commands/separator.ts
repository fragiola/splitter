import { adjustLayoutByDelta } from "../layout/adjust-layout-by-delta";
import { validateLayout } from "../layout/validate-layout";
import { idField, layoutField } from "../schema/fragments";
import { commitLayout, constraintsOf } from "../state/group-layout";
import { defineCommand, fail, ok } from "./define";
import {
    checkLayoutPanels,
    isFailure,
    requireGroup,
    requireSeparator,
} from "./rules";

export const separatorMove = defineCommand({
    name: "separator.move",
    description:
        "Moves a separator by delta percent of its group: positive grows the panels before it (the start side), negative the panels after it. The panels on the shrinking side give space nearest first, within their constraints; a collapsible panel snaps collapsed or open at its threshold; disabled panels do not change. A drag sends every step from the layout it started from (origin), as a transient step, then once more to commit. Refused when the separator or its group is disabled. Returns the layout applied.",
    transient: true,
    payloadSchema: {
        type: "object",
        properties: {
            separatorId: idField(
                "the separator to move: `<beforePanelId>:<afterPanelId>`",
            ),
            delta: {
                type: "number",
                description:
                    "how far to move it, in percent of the group: positive grows the panels before it",
            },
            origin: layoutField(
                "the layout the move is measured from (a drag's layout when it started); default: the layout now",
            ),
            source: {
                enum: ["pointer", "keyboard"],
                description:
                    "what moves it (default pointer): the keyboard collapses or expands a collapsible panel in one step instead of at its threshold",
            },
        },
        required: ["separatorId", "delta"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: {
            layout: layoutField("the group's layout after the move"),
        },
        required: ["layout"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        const separator = requireSeparator(draft, payload.separatorId);
        if (isFailure(separator)) {
            return separator;
        }
        if (separator.disabled) {
            return fail(
                "refused",
                `separator "${separator.id}" is disabled`,
                "/separatorId",
            );
        }
        const group = requireGroup(draft, separator.groupId);
        if (isFailure(group)) {
            return group;
        }
        if (payload.origin) {
            const wrong = checkLayoutPanels(group, payload.origin, "/origin");
            if (wrong) {
                return wrong;
            }
        }
        const constraints = constraintsOf(draft, group);
        const origin = payload.origin
            ? validateLayout(payload.origin, constraints)
            : group.layout;
        const moved = adjustLayoutByDelta({
            delta: payload.delta,
            initialLayout: origin,
            prevLayout: group.layout,
            constraints,
            pivotIndices: [separator.index, separator.index + 1],
            trigger: payload.source ?? "pointer",
        });
        // a drag's commit compares with where it started: its steps settled nothing
        const next = commitLayout(
            draft,
            group,
            validateLayout(moved, constraints),
            { from: origin },
        );
        return ok({ layout: { ...next.layout } });
    },
});

export const separatorUpdate = defineCommand({
    name: "separator.update",
    description:
        "Changes what a separator's markup declares: whether it is disabled (it cannot resize its panels; they may still resize through another separator) and whether a double click resets its panel to its default size.",
    transient: false,
    payloadSchema: {
        type: "object",
        properties: {
            separatorId: idField(
                "the separator to change: `<beforePanelId>:<afterPanelId>`",
            ),
            disabled: {
                type: "boolean",
                description: "the separator cannot be used",
            },
            resetOnDoubleClick: {
                type: "boolean",
                description:
                    "a double click resets its panel to its default size (default true)",
            },
        },
        required: ["separatorId"],
        additionalProperties: false,
    },
    resultSchema: {
        type: "object",
        properties: { separatorId: idField("the separator changed") },
        required: ["separatorId"],
        additionalProperties: false,
    },
    reduce(payload, { draft }) {
        const separator = requireSeparator(draft, payload.separatorId);
        if (isFailure(separator)) {
            return separator;
        }
        const group = requireGroup(draft, separator.groupId);
        if (isFailure(group)) {
            return group;
        }
        const current = Object.hasOwn(group.separators, separator.id)
            ? group.separators[separator.id]
            : undefined;
        const options = {
            ...current,
            ...(payload.disabled === undefined
                ? {}
                : { disabled: payload.disabled }),
            ...(payload.resetOnDoubleClick === undefined
                ? {}
                : { resetOnDoubleClick: payload.resetOnDoubleClick }),
        };
        draft.setGroup({
            ...group,
            separators: { ...group.separators, [separator.id]: options },
        });
        return ok({ separatorId: separator.id });
    },
});
