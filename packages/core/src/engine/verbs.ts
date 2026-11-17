import type { CommandResult } from "../commands/types";
import type { NoPayload } from "../state/queries";

/**
 * What `engine.run(action, payload)` does: each screen action's payload and result. An action's
 * key has no dot, so it never reads as a command: commands change the model through `model.run`;
 * actions are what only the screen can do (measuring, focus). The ones that change the model do it
 * by running commands, so middleware sees them.
 */
export interface EngineActionMap {
    /**
     * measures the bound groups (or one) again and reports each through `group.measure` (a
     * transient step); call it after a change the engine cannot observe
     */
    measure: {
        payload: { groupId?: string };
        result: { groupIds: string[] };
    };
    /** moves focus to a bound separator */
    "focus-separator": {
        payload: { separatorId: string };
        result: { separatorId: string };
    };
}

/** A key of `engine.run`. */
export type EngineActionKey = keyof EngineActionMap;

/** The payload of `engine.run(K)`. */
export type EngineActionPayload<K extends EngineActionKey> =
    EngineActionMap[K]["payload"];

/** The result of `engine.run(K)`. */
export type EngineActionResult<K extends EngineActionKey> =
    EngineActionMap[K]["result"];

/** The ARIA attributes of a separator, ready to spread on its element. */
export interface SeparatorAria {
    readonly role: "separator";
    /** the separator's own orientation: across its group's (`vertical` in a horizontal group) */
    readonly "aria-orientation": "horizontal" | "vertical";
    /** the size of the panel before it, in percent */
    readonly "aria-valuenow": number;
    /** the smallest size that panel can reach by moving this separator */
    readonly "aria-valuemin": number;
    /** the largest size that panel can reach by moving this separator */
    readonly "aria-valuemax": number;
    /** the DOM id of that panel's element, when it has one */
    readonly "aria-controls"?: string;
    /** present when the separator cannot be used */
    readonly "aria-disabled"?: true;
}

/** What `engine.get(key, payload)` reads: facts of the groups on screen. */
export interface EngineGetMap {
    /** a separator's ARIA attributes (Window Splitter), from the model's values and the DOM */
    "separator-aria-by": {
        payload: { separatorId: string };
        result: SeparatorAria | undefined;
    };
    /**
     * a bound group's computed inline direction, read when it binds and on `measure`: in `rtl` a
     * horizontal group's first panel is on the right
     */
    "direction-by": {
        payload: { groupId: string };
        result: "ltr" | "rtl";
    };
    /** the separator a pointer is dragging, if any */
    "dragging-separator-id": {
        payload: NoPayload;
        result: string | undefined;
    };
}

/** A key of `engine.get`. */
export type EngineGetKey = keyof EngineGetMap;

/** The payload of `engine.get(K)`. */
export type EngineGetPayload<K extends EngineGetKey> =
    EngineGetMap[K]["payload"];

/** The result of `engine.get(K)`. */
export type EngineGetResult<K extends EngineGetKey> = EngineGetMap[K]["result"];

/** What `engine.is(key, payload)` asks: each question's payload. */
export interface EngineIsMap {
    /** a pointer is dragging this separator */
    "separator-dragging": { separatorId: string };
    /** a pointer is dragging one of this group's separators */
    "group-dragging": { groupId: string };
    /** the group is bound to an element */
    "group-bound": { groupId: string };
}

/** A key of `engine.is`. */
export type EngineIsKey = keyof EngineIsMap;

/** The payload of `engine.is(K)`. */
export type EngineIsPayload<K extends EngineIsKey> = EngineIsMap[K];

/** What an engine middleware sees of an action. */
export type EngineActionContext = {
    [K in EngineActionKey]: {
        readonly action: K;
        /** `engine.can` / `engine.check`: nothing will happen; do not cause side effects */
        readonly dryRun: boolean;
        /** the validated payload */
        readonly payload: EngineActionPayload<K>;
    };
}[EngineActionKey];

/**
 * Runs around every engine action: veto (return an error without calling `next`) or observe
 * (call `next` and look at its result). Returning `undefined` passes on `next`'s result.
 */
export type EngineMiddleware = (
    ctx: EngineActionContext,
    next: () => CommandResult<unknown>,
) => CommandResult<unknown> | undefined;

/** What an engine listener receives: a change of what the engine shows. */
export type EngineEvent =
    /** a drag started (`separatorId`) or ended (undefined) */
    | { readonly type: "dragging"; readonly separatorId: string | undefined }
    /** a group's inline direction changed */
    | {
          readonly type: "direction";
          readonly groupId: string;
          readonly direction: "ltr" | "rtl";
      }
    /** an action ran */
    | {
          readonly type: "action";
          readonly action: EngineActionKey;
          readonly payload: unknown;
          readonly result: CommandResult<unknown>;
      };

export type EngineListener = (event: EngineEvent) => void;
