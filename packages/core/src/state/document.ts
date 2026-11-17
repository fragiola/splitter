import { isCollapsedIn } from "../layout/resize-panel";
import { splitterJsonSchema } from "../schema/document";
import type { ValidationIssue } from "../schema/types";
import { validate } from "../schema/validator";
import { deepFreeze } from "./draft";
import { constraintsOf, type EntityReader, readerOf } from "./group-layout";
import type {
    GroupJson,
    GroupState,
    PanelJson,
    SplitterJson,
    SplitterState,
} from "./types";

/** Thrown by `createSplitterModel` when its document is invalid: every problem, with its JSON path. */
export class SplitterValidationError extends Error {
    readonly issues: readonly ValidationIssue[];

    constructor(issues: readonly ValidationIssue[]) {
        const [first] = issues;
        super(
            first
                ? `invalid splitter document: ${first.message} at "${first.path}"${issues.length > 1 ? ` (and ${issues.length - 1} more)` : ""}`
                : "invalid splitter document",
        );
        this.name = "SplitterValidationError";
        this.issues = issues;
    }
}

/**
 * Every problem of a document (empty when it is valid): its JSON Schema, then ids used twice (a
 * group's, or a panel's across the whole document).
 */
export function validateSplitter(json: unknown): ValidationIssue[] {
    const issues = validate(splitterJsonSchema, json);
    if (issues.length > 0) {
        return issues;
    }
    const saved = json as SplitterJson;
    const groupIds = new Set<string>();
    const panelIds = new Set<string>();
    saved.groups.forEach((group, g) => {
        if (groupIds.has(group.id)) {
            issues.push({
                path: `/groups/${g}/id`,
                message: `group "${group.id}" is saved twice`,
            });
        }
        groupIds.add(group.id);
        group.panels.forEach((panel, p) => {
            if (panelIds.has(panel.id)) {
                issues.push({
                    path: `/groups/${g}/panels/${p}/id`,
                    message: `panel "${panel.id}" is saved twice`,
                });
            }
            panelIds.add(panel.id);
        });
    });
    return issues;
}

/** The state of a loaded document: no group registered yet, every saved group pending. */
export function loadState(json: unknown): SplitterState {
    const issues = validateSplitter(json);
    if (issues.length > 0) {
        throw new SplitterValidationError(issues);
    }
    const pending: Record<string, GroupJson> = {};
    for (const group of (json as SplitterJson).groups) {
        Object.defineProperty(pending, group.id, {
            value: structuredCopy(group),
            enumerable: true,
            writable: true,
            configurable: true,
        });
    }
    return deepFreeze({ groups: {}, panels: {}, pending });
}

function structuredCopy(group: GroupJson): GroupJson {
    return {
        id: group.id,
        panels: group.panels.map((panel) => ({ ...panel })),
    };
}

/** A registered group as the document saves it: its layout, collapsed panels and restore sizes. */
export function groupJsonOf(
    reader: EntityReader,
    group: GroupState,
): GroupJson {
    const constraints = constraintsOf(reader, group);
    return {
        id: group.id,
        panels: constraints.map((item): PanelJson => {
            const restoreSize = reader.panel(item.panelId)?.restoreSize;
            return {
                id: item.panelId,
                size: group.layout[item.panelId] ?? 0,
                ...(isCollapsedIn(item, group.layout)
                    ? { collapsed: true }
                    : {}),
                ...(restoreSize === undefined ? {} : { restoreSize }),
            };
        }),
    };
}

/**
 * The document of a state: each registered group's layout, which of its panels are collapsed and
 * their restore sizes, then the saved groups not registered yet, as loaded.
 */
export function toSplitterJson(state: SplitterState): SplitterJson {
    const reader = readerOf(state);
    const groups: GroupJson[] = Object.values(state.groups).map((group) =>
        groupJsonOf(reader, group),
    );
    for (const [id, saved] of Object.entries(state.pending)) {
        if (!Object.hasOwn(state.groups, id)) {
            groups.push(structuredCopy(saved));
        }
    }
    return { version: 1, groups };
}
