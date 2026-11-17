import { COMMANDS } from "../commands/catalogue";
import type { CommandInfo } from "../commands/types";
import { isCollapsedIn } from "../layout/resize-panel";
import {
    type SeparatorValues,
    separatorValues,
} from "../layout/separator-values";
import type { Layout, ResolvedConstraints } from "../layout/types";
import { toSplitterJson } from "./document";
import { deepFreeze } from "./draft";
import {
    constraintsOf,
    type EntityReader,
    panelsOf,
    readerOf,
} from "./group-layout";
import { findSeparator, separatorsOf } from "./separators";
import type {
    AnyTypes,
    GroupIdOf,
    GroupState,
    PanelIdOf,
    PanelState,
    SeparatorState,
    SplitterJson,
    SplitterState,
    SplitterTypes,
} from "./types";

/** The payload of a query that takes none. */
export type NoPayload = Record<never, never>;

/**
 * The payload argument of a query: optional when the payload has no required field
 * (`model.get("groups")`), required otherwise (`model.get("layout-by", { groupId })`).
 */
export type QueryArgs<P> = NoPayload extends P ? [payload?: P] : [payload: P];

/** A panel's size: in percent, and in pixels once its group is measured. */
export interface PanelSize {
    readonly percentage: number;
    readonly pixels: number | undefined;
}

/**
 * What `model.get(key, payload)` reads: each key's payload and result. A key names what it returns;
 * one that takes an id ends in `-by`, and the payload's field completes it: `id` when it is the id of
 * what the key returns (`panel-by { id }`), `<entity>Id` otherwise (`layout-by { groupId }`).
 */
export interface ModelGetMap<T extends SplitterTypes = AnyTypes> {
    /** the whole state (immutable; a new object after every change) */
    state: { payload: NoPayload; result: SplitterState };
    /** every registered group, in registration order */
    groups: { payload: NoPayload; result: readonly GroupState[] };
    /** a group by its id */
    "group-by": {
        payload: { id: GroupIdOf<T> };
        result: GroupState | undefined;
    };
    /** a panel by its id */
    "panel-by": {
        payload: { id: PanelIdOf<T> };
        result: PanelState | undefined;
    };
    /** a group's panels, in order */
    "panels-by": {
        payload: { groupId: GroupIdOf<T> };
        result: readonly PanelState[];
    };
    /** a group's layout: each panel's size in percent, by panel id */
    "layout-by": {
        payload: { groupId: GroupIdOf<T> };
        result: Readonly<Layout> | undefined;
    };
    /** a panel's size in percent, and in pixels once its group is measured */
    "panel-size-by": {
        payload: { panelId: PanelIdOf<T> };
        result: PanelSize | undefined;
    };
    /** a panel's constraints resolved to percent with its group's measure: what the rules use */
    "panel-constraints-by": {
        payload: { panelId: PanelIdOf<T> };
        result: ResolvedConstraints | undefined;
    };
    /** a group's separators, in order: one between each pair of neighbouring panels */
    "separators-by": {
        payload: { groupId: GroupIdOf<T> };
        result: readonly SeparatorState[];
    };
    /** a separator by its id (`<beforePanelId>:<afterPanelId>`) */
    "separator-by": {
        payload: { id: string };
        result: SeparatorState | undefined;
    };
    /**
     * a separator's values for assistive technology: the size of the panel before it, and the
     * smallest and largest it can reach by moving this separator (`aria-valuenow`, `-min`, `-max`)
     */
    "separator-values-by": {
        payload: { separatorId: string };
        result: SeparatorValues | undefined;
    };
    /** the JSON document of the state: what `createSplitterModel(json)` restores */
    "splitter-json": { payload: NoPayload; result: SplitterJson };
    /** every command, with its description and JSON Schemas (ready for tool definitions) */
    commands: { payload: NoPayload; result: readonly CommandInfo[] };
}

/** A key of `model.get`. */
export type ModelGetKey = keyof ModelGetMap;

/** The payload of `model.get(K)`. */
export type ModelGetPayload<
    T extends SplitterTypes,
    K extends ModelGetKey,
> = ModelGetMap<T>[K]["payload"];

/** The result of `model.get(K)`. */
export type ModelGetResult<
    T extends SplitterTypes,
    K extends ModelGetKey,
> = ModelGetMap<T>[K]["result"];

/** What `model.is(key, payload)` asks: each question's payload. */
export interface ModelIsMap<T extends SplitterTypes = AnyTypes> {
    /** the panel is collapsible and at its collapsed size */
    "panel-collapsed": { panelId: PanelIdOf<T> };
    /** the panel can collapse */
    "panel-collapsible": { panelId: PanelIdOf<T> };
    /** the panel is disabled: no separator resizes it */
    "panel-disabled": { panelId: PanelIdOf<T> };
    /** the group is disabled: none of its separators can be used */
    "group-disabled": { groupId: GroupIdOf<T> };
    /** the engine reported the group's size (`group.measure`), so every unit resolves */
    "group-measured": { groupId: GroupIdOf<T> };
    /** the separator cannot be used: it, or its group, is disabled */
    "separator-disabled": { separatorId: string };
    /**
     * a double click on the separator resets a panel: it allows it, it is not disabled, and the
     * panel before it (else the one after) has a default size that resolves
     */
    "separator-resettable": { separatorId: string };
}

/** A key of `model.is`. */
export type ModelIsKey = keyof ModelIsMap;

/** The payload of `model.is(K)`. */
export type ModelIsPayload<
    T extends SplitterTypes,
    K extends ModelIsKey,
> = ModelIsMap<T>[K];

const COMMAND_INFO: readonly CommandInfo[] = deepFreeze(
    COMMANDS.map(
        ({ name, description, payloadSchema, resultSchema, transient }) => ({
            name,
            description,
            payloadSchema,
            resultSchema,
            transient,
        }),
    ),
);

function stringField(payload: unknown, key: string): string | undefined {
    if (typeof payload !== "object" || payload === null) {
        return undefined;
    }
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
}

function constraintsFor(
    reader: EntityReader,
    panelId: string | undefined,
): { group: GroupState; item: ResolvedConstraints } | undefined {
    const panel = panelId === undefined ? undefined : reader.panel(panelId);
    const group = panel && reader.group(panel.groupId);
    const item =
        group &&
        constraintsOf(reader, group).find(({ panelId: id }) => id === panel.id);
    return group && item ? { group, item } : undefined;
}

/** The separator a double click resets a panel of: that panel, with its default size. */
export function resettablePanel(
    reader: EntityReader,
    separator: SeparatorState,
): { panelId: string; defaultSize: number } | undefined {
    if (separator.disabled || !separator.resetOnDoubleClick) {
        return undefined;
    }
    for (const panelId of separator.panelIds) {
        const defaultSize = constraintsFor(reader, panelId)?.item.defaultSize;
        if (defaultSize !== undefined) {
            return { panelId, defaultSize };
        }
    }
    return undefined;
}

// memoized per state: the JSON is the same object until the state changes
const jsonCache = new WeakMap<SplitterState, SplitterJson>();

/** Answers `model.get` on a state. */
export function queryGet(
    state: SplitterState,
    key: string,
    payload: unknown,
): unknown {
    const reader = readerOf(state);
    switch (key) {
        case "state":
            return state;
        case "groups":
            return Object.values(state.groups);
        case "group-by": {
            const id = stringField(payload, "id");
            return id === undefined ? undefined : reader.group(id);
        }
        case "panel-by": {
            const id = stringField(payload, "id");
            return id === undefined ? undefined : reader.panel(id);
        }
        case "panels-by": {
            const groupId = stringField(payload, "groupId");
            const group =
                groupId === undefined ? undefined : reader.group(groupId);
            return group ? panelsOf(reader, group) : [];
        }
        case "layout-by": {
            const groupId = stringField(payload, "groupId");
            return groupId === undefined
                ? undefined
                : reader.group(groupId)?.layout;
        }
        case "panel-size-by": {
            const found = constraintsFor(
                reader,
                stringField(payload, "panelId"),
            );
            if (!found) {
                return undefined;
            }
            const percentage = found.group.layout[found.item.panelId] ?? 0;
            const axisSize = found.group.measure?.axisSize;
            return {
                percentage,
                pixels:
                    axisSize === undefined
                        ? undefined
                        : (percentage / 100) * axisSize,
            };
        }
        case "panel-constraints-by":
            return constraintsFor(reader, stringField(payload, "panelId"))
                ?.item;
        case "separators-by": {
            const groupId = stringField(payload, "groupId");
            const group =
                groupId === undefined ? undefined : reader.group(groupId);
            return group ? separatorsOf(group) : [];
        }
        case "separator-by": {
            const id = stringField(payload, "id");
            return id === undefined ? undefined : findSeparator(reader, id);
        }
        case "separator-values-by": {
            const separatorId = stringField(payload, "separatorId");
            const separator =
                separatorId === undefined
                    ? undefined
                    : findSeparator(reader, separatorId);
            const group = separator && reader.group(separator.groupId);
            return group && separator
                ? separatorValues(
                      group.layout,
                      constraintsOf(reader, group),
                      separator.index,
                  )
                : undefined;
        }
        case "splitter-json": {
            let json = jsonCache.get(state);
            if (!json) {
                json = deepFreeze(toSplitterJson(state));
                jsonCache.set(state, json);
            }
            return json;
        }
        case "commands":
            return COMMAND_INFO;
        default:
            return undefined;
    }
}

/** Answers `model.is` on a state. */
export function queryIs(
    state: SplitterState,
    key: string,
    payload: unknown,
): boolean {
    const reader = readerOf(state);
    switch (key) {
        case "panel-collapsed": {
            const found = constraintsFor(
                reader,
                stringField(payload, "panelId"),
            );
            return (
                found !== undefined &&
                isCollapsedIn(found.item, found.group.layout)
            );
        }
        case "panel-collapsible":
            return (
                constraintsFor(reader, stringField(payload, "panelId"))?.item
                    .collapsible === true
            );
        case "panel-disabled":
            return (
                constraintsFor(reader, stringField(payload, "panelId"))?.item
                    .disabled === true
            );
        case "group-disabled": {
            const groupId = stringField(payload, "groupId");
            return (
                groupId !== undefined &&
                reader.group(groupId)?.disabled === true
            );
        }
        case "group-measured": {
            const groupId = stringField(payload, "groupId");
            const measure =
                groupId === undefined
                    ? undefined
                    : reader.group(groupId)?.measure;
            return measure !== undefined && measure.axisSize > 0;
        }
        case "separator-disabled": {
            const separatorId = stringField(payload, "separatorId");
            return (
                separatorId !== undefined &&
                findSeparator(reader, separatorId)?.disabled === true
            );
        }
        case "separator-resettable": {
            const separatorId = stringField(payload, "separatorId");
            const separator =
                separatorId === undefined
                    ? undefined
                    : findSeparator(reader, separatorId);
            return (
                separator !== undefined &&
                resettablePanel(reader, separator) !== undefined
            );
        }
        default:
            return false;
    }
}
