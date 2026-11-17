// @fragiola/splitter-react: the Splitter primitives and hooks over the core. The whole core is
// re-exported, so a React app installs this one package.
export * from "@fragiola/splitter";
export type { GroupProps } from "./components/group";
export type { PanelProps } from "./components/panel";
export type { SeparatorProps } from "./components/separator";
export {
    type GroupPartState,
    type UseGroupResult,
    useGroup,
} from "./hooks/use-group";
export {
    type PanelPartState,
    type UsePanelOptions,
    type UsePanelResult,
    usePanel,
} from "./hooks/use-panel";
export {
    type SeparatorPartState,
    type UseSeparatorOptions,
    type UseSeparatorResult,
    useSeparator,
} from "./hooks/use-separator";
export {
    type SplitterContextValue,
    useSplitter,
} from "./hooks/use-splitter";
export { useSplitterRef } from "./hooks/use-splitter-ref";
export * as Splitter from "./parts";
export type {
    PrimitiveProps,
    RenderedProps,
    RenderProp,
} from "./utils/use-render";
