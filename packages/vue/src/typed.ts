import type { SplitterTypes } from "@fragiola/splitter";
import type { GroupProps, GroupSlots } from "./components/group";
import type { PanelProps, PanelSlots } from "./components/panel";
import type { SeparatorProps, SeparatorSlots } from "./components/separator";
import * as parts from "./parts";
import type { SplitterComponent } from "./utils/primitive";

/** The `Splitter` primitives typed by the registry `T`: group and panel ids in their props. */
export interface TypedSplitter<T extends SplitterTypes> {
    Group: SplitterComponent<GroupProps<T>, GroupSlots>;
    Panel: SplitterComponent<PanelProps<T>, PanelSlots>;
    Separator: SplitterComponent<SeparatorProps, SeparatorSlots>;
}

/**
 * The `Splitter` primitives typed by your registry: what React writes as a type argument
 * (`<Splitter.Panel<Types> id="nav">`), which a Vue template cannot pass. The same components,
 * typed:
 *
 * ```ts
 * const Splitter = typedSplitter<Types>();
 * // <Splitter.Panel id="nav">: the id is one of the registry's panel ids
 * ```
 */
export function typedSplitter<T extends SplitterTypes>(): TypedSplitter<T> {
    return parts as unknown as TypedSplitter<T>;
}
