import type { GroupResizeBehavior, Layout } from "../layout/types";
import type { JsonSchema, ValidationIssue } from "../schema/types";
import type {
    AnyTypes,
    GroupIdOf,
    GroupState,
    Orientation,
    PanelIdOf,
    PanelState,
    SplitterState,
    SplitterTypes,
} from "../state/types";
import type { SizeValue } from "../units/parse-size";

/** Each field may be `null`: the panel's own value is removed so the default applies. */
export type Nullable<P> = { [K in keyof P]?: P[K] | null };

/** A panel's declared constraints, as a payload. */
export interface PanelConstraintFields {
    minSize?: SizeValue;
    maxSize?: SizeValue;
    defaultSize?: SizeValue;
    collapsible?: boolean;
    collapsedSize?: SizeValue;
    collapsedThreshold?: SizeValue;
    disabled?: boolean;
    groupResizeBehavior?: GroupResizeBehavior;
}

/** The payload of `group.add`. */
export type GroupAddPayload<T extends SplitterTypes = AnyTypes> = {
    id?: GroupIdOf<T>;
    orientation?: Orientation;
    parentPanelId?: PanelIdOf<T>;
    disabled?: boolean;
};

/** The payload of `group.update`. */
export type GroupUpdatePayload<T extends SplitterTypes = AnyTypes> = {
    groupId: GroupIdOf<T>;
    orientation?: Orientation;
    parentPanelId?: PanelIdOf<T> | null;
    disabled?: boolean;
};

/** The payload of `group.measure`: what the engine measured of a group on screen. */
export type GroupMeasurePayload<T extends SplitterTypes = AnyTypes> = {
    groupId: GroupIdOf<T>;
    axisSize: number;
    fontSize?: number;
    rootFontSize?: number;
    viewportWidth?: number;
    viewportHeight?: number;
};

/** The payload of `panel.add`. */
export type PanelAddPayload<T extends SplitterTypes = AnyTypes> = {
    id?: PanelIdOf<T>;
    groupId: GroupIdOf<T>;
    order?: number;
} & PanelConstraintFields;

/** The payload of `panel.update`. */
export type PanelUpdatePayload<T extends SplitterTypes = AnyTypes> = {
    panelId: PanelIdOf<T>;
    order?: number;
} & Nullable<PanelConstraintFields>;

/** The payload of `separator.move`. */
export type SeparatorMovePayload = {
    separatorId: string;
    delta: number;
    origin?: Layout;
    source?: "pointer" | "keyboard";
};

/** The payload of `separator.update`. */
export type SeparatorUpdatePayload = {
    separatorId: string;
    disabled?: boolean;
    resetOnDoubleClick?: boolean;
};

/** One command of a batch. */
export type BatchEntry<T extends SplitterTypes = AnyTypes> = {
    [C in CommandName]: { command: C; payload: PayloadOf<T, C> };
}[CommandName];

/** Every built-in command: its payload and its result, typed by the registry `T`. */
export interface CommandMap<T extends SplitterTypes = AnyTypes> {
    "group.add": { payload: GroupAddPayload<T>; result: { groupId: string } };
    "group.update": {
        payload: GroupUpdatePayload<T>;
        result: { groupId: string };
    };
    "group.remove": {
        payload: { groupId: GroupIdOf<T> };
        result: { groupId: string; panelIds: string[] };
    };
    "group.set-layout": {
        payload: { groupId: GroupIdOf<T>; layout: Layout };
        result: { layout: Layout };
    };
    "group.reset": {
        payload: { groupId: GroupIdOf<T> };
        result: { layout: Layout };
    };
    "group.measure": {
        payload: GroupMeasurePayload<T>;
        result: { layout: Layout };
    };
    "panel.add": { payload: PanelAddPayload<T>; result: { panelId: string } };
    "panel.update": {
        payload: PanelUpdatePayload<T>;
        result: { panelId: string };
    };
    "panel.remove": {
        payload: { panelId: PanelIdOf<T> };
        result: { panelId: string };
    };
    "panel.resize": {
        payload: { panelId: PanelIdOf<T>; size: SizeValue };
        result: { size: number };
    };
    "panel.collapse": {
        payload: { panelId: PanelIdOf<T> };
        result: { size: number };
    };
    "panel.expand": {
        payload: { panelId: PanelIdOf<T> };
        result: { size: number };
    };
    "separator.move": {
        payload: SeparatorMovePayload;
        result: { layout: Layout };
    };
    "separator.update": {
        payload: SeparatorUpdatePayload;
        result: { separatorId: string };
    };
    batch: {
        payload: { commands: BatchEntry<T>[] };
        result: { results: unknown[] };
    };
}

/** The name of a built-in command. */
export type CommandName = keyof CommandMap;

/** The payload of command `C`. */
export type PayloadOf<
    T extends SplitterTypes,
    C extends CommandName,
> = CommandMap<T>[C]["payload"];

/** The result of command `C`. */
export type ResultOf<
    T extends SplitterTypes,
    C extends CommandName,
> = CommandMap<T>[C]["result"];

/** Why a command did not apply. */
export type CommandErrorCode =
    /** no command has this name */
    | "unknown_command"
    /** the payload does not match the command's schema */
    | "invalid_payload"
    /** a group, panel or separator the payload names does not exist */
    | "not_found"
    /** a rule of the splitter forbids it (a disabled separator, a panel that cannot collapse, …) */
    | "refused"
    /** a middleware vetoed it */
    | "vetoed"
    /** it was issued from a middleware and will run after the current command */
    | "queued"
    /** a middleware threw */
    | "middleware_error";

export interface CommandError {
    readonly code: CommandErrorCode;
    readonly message: string;
    /** a JSON pointer into the payload (or the dispatched input) */
    readonly path?: string;
    /** every schema problem, for `invalid_payload` */
    readonly issues?: readonly ValidationIssue[];
}

/** What a command returns: its value, or why it did not apply. It never throws on bad input. */
export type CommandResult<R> =
    | { readonly ok: true; readonly value: R }
    | { readonly ok: false; readonly error: CommandError };

/** Options of `run`. */
export interface RunOptions {
    /** a step of a continuous gesture (a separator drag): the event is marked so undo can merge it */
    transient?: boolean;
    /** free-form information for middleware and listeners */
    meta?: Readonly<Record<string, unknown>>;
}

/** What a middleware's `ctx.get` reads: each key's payload and result, as on `model.get`. */
export interface CommandContextGetMap {
    /** a group by its id */
    "group-by": { payload: { id: string }; result: GroupState | undefined };
    /** a panel by its id */
    "panel-by": { payload: { id: string }; result: PanelState | undefined };
    /** a group's layout */
    "layout-by": {
        payload: { groupId: string };
        result: Readonly<Layout> | undefined;
    };
}

/** What a middleware's `ctx.get` reads. */
export type CommandContextGetKey = keyof CommandContextGetMap;

/** What a middleware sees of any command. */
export interface CommandContextBase {
    /** `model.can` / `model.check`: nothing will be committed; do not cause side effects */
    readonly dryRun: boolean;
    readonly transient: boolean;
    /** true for a command running inside a batch (the batch itself also passes the chain) */
    readonly inBatch: boolean;
    readonly meta: Readonly<Record<string, unknown>> | undefined;
    /** the committed state the command applies to */
    readonly state: SplitterState;
    /** reads a group, a panel or a layout as the command sees it (inside a batch: after its earlier commands) */
    get<K extends CommandContextGetKey>(
        key: K,
        payload: CommandContextGetMap[K]["payload"],
    ): CommandContextGetMap[K]["result"];
}

/**
 * What a middleware sees: a union discriminated by `command`, so checking the command narrows the
 * payload (`if (ctx.command === "panel.collapse") ctx.payload.panelId`).
 */
export type CommandContext<T extends SplitterTypes = AnyTypes> = {
    [C in CommandName]: CommandContextBase & {
        readonly command: C;
        /** the validated payload; assign a new object to rewrite it (it is validated again) */
        payload: PayloadOf<T, C>;
    };
}[CommandName];

/**
 * Runs around every command, engine-issued or not: veto (return an error without calling
 * `next`), rewrite (assign `ctx.payload`, then call `next`) or observe (call `next` and look at its
 * result). Returning `undefined` passes on `next`'s result when it was called.
 */
export type Middleware<T extends SplitterTypes = AnyTypes> = (
    ctx: CommandContext<T>,
    next: () => CommandResult<unknown>,
) => CommandResult<unknown> | undefined;

/** One command of a batch, as its event reports it. */
export interface BatchStep {
    readonly command: CommandName;
    readonly payload: unknown;
    readonly result: unknown;
}

/** What a listener receives: one event per commit. */
export interface CommandEvent {
    readonly command: CommandName;
    readonly payload: unknown;
    /** the command's value */
    readonly result: unknown;
    readonly before: SplitterState;
    readonly after: SplitterState;
    readonly transient: boolean;
    readonly meta: Readonly<Record<string, unknown>> | undefined;
    /** for a batch: the commands it ran, flattened */
    readonly commands?: readonly BatchStep[];
}

export type CommandListener = (event: CommandEvent) => void;

/** A command as `model.get("commands")` describes it: ready to become an AI tool definition. */
export interface CommandInfo {
    readonly name: CommandName;
    readonly description: string;
    readonly payloadSchema: JsonSchema;
    readonly resultSchema: JsonSchema;
    /** whether it may run as a step of a continuous gesture */
    readonly transient: boolean;
}

/** The vetoed result a middleware returns to stop a command. */
export function veto(message = "vetoed by a middleware"): {
    readonly ok: false;
    readonly error: CommandError;
} {
    return { ok: false, error: { code: "vetoed", message } };
}
