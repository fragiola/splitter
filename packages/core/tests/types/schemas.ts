// Type fixtures (compiled by `pnpm typecheck`, never run): each command's hand-written JSON Schema,
// read back as a type with FromSchema, is the command's payload type (and result type), and the
// document's schema is the document's type. A schema that drifts from its type fails the
// typecheck.
import type {
    groupAdd,
    groupMeasure,
    groupRemove,
    groupReset,
    groupSetLayout,
    groupUpdate,
} from "../../src/commands/group";
import type {
    panelAdd,
    panelCollapse,
    panelExpand,
    panelRemove,
    panelResize,
    panelUpdate,
} from "../../src/commands/panel";
import type {
    separatorMove,
    separatorUpdate,
} from "../../src/commands/separator";
import type {
    CommandName,
    PayloadOf,
    ResultOf,
} from "../../src/commands/types";
import type { splitterJsonSchema } from "../../src/schema/document";
import type { FromSchema } from "../../src/schema/from-schema";
import type { AnyTypes, SplitterJson } from "../../src/state/types";

/** Mutually assignable, with the same keys. */
type Same<A, B> = [A] extends [B]
    ? [B] extends [A]
        ? [keyof A] extends [keyof B]
            ? [keyof B] extends [keyof A]
                ? true
                : false
            : false
        : false
    : false;

type Check<
    C extends CommandName,
    D extends { payloadSchema: unknown; resultSchema: unknown },
> = [
    Same<FromSchema<D["payloadSchema"]>, PayloadOf<AnyTypes, C>>,
    Same<FromSchema<D["resultSchema"]>, ResultOf<AnyTypes, C>>,
];

/** Compiles only when every entry is `[true, true]`. */
export type SchemasMatchTypes = [
    Check<"group.add", typeof groupAdd>,
    Check<"group.update", typeof groupUpdate>,
    Check<"group.remove", typeof groupRemove>,
    Check<"group.set-layout", typeof groupSetLayout>,
    Check<"group.reset", typeof groupReset>,
    Check<"group.measure", typeof groupMeasure>,
    Check<"panel.add", typeof panelAdd>,
    Check<"panel.update", typeof panelUpdate>,
    Check<"panel.remove", typeof panelRemove>,
    Check<"panel.resize", typeof panelResize>,
    Check<"panel.collapse", typeof panelCollapse>,
    Check<"panel.expand", typeof panelExpand>,
    Check<"separator.move", typeof separatorMove>,
    Check<"separator.update", typeof separatorUpdate>,
] extends [true, true][]
    ? true
    : never;

export const schemasMatchTypes: SchemasMatchTypes = true;

/** The document's schema is the document's type. */
export const documentMatchesType: Same<
    FromSchema<typeof splitterJsonSchema>,
    SplitterJson
> = true;
