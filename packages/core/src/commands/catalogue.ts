import { batch } from "./batch";
import type { CommandDefinition } from "./define";
import {
    groupAdd,
    groupMeasure,
    groupRemove,
    groupReset,
    groupSetLayout,
    groupUpdate,
} from "./group";
import {
    panelAdd,
    panelCollapse,
    panelExpand,
    panelRemove,
    panelResize,
    panelUpdate,
} from "./panel";
import { separatorMove, separatorUpdate } from "./separator";
import type { CommandName } from "./types";

/**
 * Every built-in command, in the order `model.get("commands")` lists them. Each definition keeps its
 * schemas' literal types (the type tests read them); the list erases them to `CommandDefinition`.
 */
export const COMMANDS: readonly CommandDefinition[] = [
    groupAdd,
    groupUpdate,
    groupRemove,
    groupSetLayout,
    groupReset,
    groupMeasure,
    panelAdd,
    panelUpdate,
    panelRemove,
    panelResize,
    panelCollapse,
    panelExpand,
    separatorMove,
    separatorUpdate,
    batch,
] as const satisfies readonly {
    readonly name: CommandName;
    readonly transient: boolean;
    readonly reduce: (...args: never[]) => unknown;
}[] as readonly unknown[] as readonly CommandDefinition[];

/** The command definitions by name. */
export const COMMAND_DEFINITIONS: ReadonlyMap<string, CommandDefinition> =
    new Map(COMMANDS.map((definition) => [definition.name, definition]));
