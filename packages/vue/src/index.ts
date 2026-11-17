// @fragiola/splitter-vue: the Splitter primitives and composables over the core. The whole core
// is re-exported, so a Vue app installs this one package. A local export would silently shadow a
// core name of the same spelling: tests/exports.test.ts fails on one.
export * from "@fragiola/splitter";
export type { GroupProps, GroupSlots } from "./components/group";
export type { PanelProps, PanelSlots } from "./components/panel";
export type { SeparatorProps, SeparatorSlots } from "./components/separator";
export {
    type GroupElementProps,
    type GroupPartState,
    type UseGroupResult,
    useGroup,
} from "./composables/use-group";
export {
    type PanelElementProps,
    type PanelPartState,
    type UsePanelOptions,
    type UsePanelResult,
    usePanel,
} from "./composables/use-panel";
export {
    type SeparatorElementProps,
    type SeparatorPartState,
    type UseSeparatorOptions,
    type UseSeparatorResult,
    useSeparator,
} from "./composables/use-separator";
export {
    type SplitterContextValue,
    useSplitter,
} from "./composables/use-splitter";
export { useSplitterRef } from "./composables/use-splitter-ref";
export {
    type UseSplitterStateOptions,
    useSplitterState,
} from "./composables/use-splitter-state";
export * as Splitter from "./parts";
export { type TypedSplitter, typedSplitter } from "./typed";
export type {
    PrimitiveProps,
    SlotFunction,
    SplitterComponent,
} from "./utils/primitive";
export type {
    AsProp,
    ElementRef,
    RenderSlot,
    RenderSlotProps,
} from "./utils/render";
