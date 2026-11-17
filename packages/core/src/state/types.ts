import type { GroupResizeBehavior, Layout } from "../layout/types";
import type { SizeValue } from "../units/parse-size";
import type { GroupMeasure } from "../units/resolve-size";

/** How a group lays out its panels: side by side (`horizontal`) or stacked (`vertical`). */
export type Orientation = "horizontal" | "vertical";

/**
 * The registry an app declares to type its ids: `createSplitterModel<Types>()` then checks every
 * `groupId` and `panelId` it is given (`{ groupId: "main" | "sidebar"; panelId: "nav" | "editor" }`).
 */
export interface SplitterTypes {
    readonly groupId: string;
    readonly panelId: string;
}

/** The registry of a model that does not declare one: any string id. */
export interface AnyTypes extends SplitterTypes {
    readonly groupId: string;
    readonly panelId: string;
}

/** A group id of the registry `T`. */
export type GroupIdOf<T extends SplitterTypes> = T["groupId"];

/** A panel id of the registry `T`. */
export type PanelIdOf<T extends SplitterTypes> = T["panelId"];

/**
 * A panel's constraints as declared (in the markup, or through `panel.add` / `panel.update`). They
 * are not saved in the JSON document: they come back with the markup.
 */
export interface PanelConstraints {
    /** the smallest size the panel takes when expanded (default 0) */
    readonly minSize?: SizeValue;
    /** the largest size the panel takes (default 100%) */
    readonly maxSize?: SizeValue;
    /** the size the panel starts with when no saved layout has one (default: an equal share) */
    readonly defaultSize?: SizeValue;
    /** whether the panel can collapse below its minimum to its collapsed size */
    readonly collapsible?: boolean;
    /** the size of the panel collapsed (default 0) */
    readonly collapsedSize?: SizeValue;
    /** how far past its minimum a drag goes before the panel collapses (default: halfway) */
    readonly collapsedThreshold?: SizeValue;
    /** the panel is resized neither directly nor by resizing its neighbours (code still can) */
    readonly disabled?: boolean;
    /** how the panel behaves when its group resizes (default `preserve-relative-size`) */
    readonly groupResizeBehavior?: GroupResizeBehavior;
}

/** A panel: one entry of a group's layout. */
export interface PanelState extends PanelConstraints {
    readonly type: "panel";
    readonly id: string;
    readonly groupId: string;
    /**
     * where the panel sits among its group's panels (its document position, given by the adapter):
     * panels sort by it, then by when they were added
     */
    readonly order: number;
    /** the size, in percent, the panel returns to when it expands (its size before collapsing) */
    readonly restoreSize?: number;
}

/** What a separator's markup declares (`separator.update`). */
export interface SeparatorOptions {
    /** the separator cannot be used to resize its panels (they may still resize indirectly) */
    readonly disabled?: boolean;
    /** a double click resets its panel to its default size (default true) */
    readonly resetOnDoubleClick?: boolean;
}

/** A group: panels laid out along one orientation. */
export interface GroupState {
    readonly type: "group";
    readonly id: string;
    readonly orientation: Orientation;
    /** the panel a nested group sits in */
    readonly parentPanelId?: string;
    /** no separator of the group can be used (code can still resize its panels) */
    readonly disabled: boolean;
    /** the group's panels, in order */
    readonly panelIds: readonly string[];
    /** each panel's size, in percent, summing to 100 */
    readonly layout: Readonly<Layout>;
    /** what the engine measured of the group on screen (not saved) */
    readonly measure?: GroupMeasure;
    /** the layout is the default one: it is derived again when a new measure resolves its units */
    readonly pristine: boolean;
    /** what the separators' markup declares, by `separatorId` */
    readonly separators: Readonly<Record<string, SeparatorOptions>>;
}

/**
 * A separator, derived from its group's panel order: one between each pair of neighbouring
 * panels, its id `` `${beforePanelId}:${afterPanelId}` ``.
 */
export interface SeparatorState {
    readonly type: "separator";
    readonly id: string;
    readonly groupId: string;
    /** its position among the group's separators */
    readonly index: number;
    /** the panels before and after it */
    readonly panelIds: readonly [string, string];
    /** the separator cannot be used: it, or its group, is disabled */
    readonly disabled: boolean;
    /** a double click resets its panel to its default size */
    readonly resetOnDoubleClick: boolean;
}

/** A saved panel of the JSON document. */
export interface PanelJson {
    /** the panel's id, as in the markup */
    id: string;
    /** its size, in percent */
    size: number;
    /** whether it is collapsed */
    collapsed?: boolean;
    /** the size, in percent, it returns to when it expands */
    restoreSize?: number;
}

/** A saved group of the JSON document: its layout, by panel id. */
export interface GroupJson {
    /** the group's id, as in the markup */
    id: string;
    /** its panels, in order */
    panels: PanelJson[];
}

/**
 * The JSON document, version 1: what the user changed (each group's layout by explicit ids, which
 * panels are collapsed, the size each returns to on expand). Constraints are not part of it.
 */
export interface SplitterJson {
    version: 1;
    groups: GroupJson[];
}

/**
 * The model's state: plain, frozen, JSON-shaped data. A change produces a new state that shares
 * every untouched entity (`before === after` means nothing changed).
 */
export interface SplitterState {
    /** the registered groups, by id */
    readonly groups: Readonly<Record<string, GroupState>>;
    /** the registered panels, by id */
    readonly panels: Readonly<Record<string, PanelState>>;
    /**
     * the saved groups of the loaded document whose panels have not all registered yet: each
     * applies once its group holds exactly its panels
     */
    readonly pending: Readonly<Record<string, Readonly<GroupJson>>>;
}
