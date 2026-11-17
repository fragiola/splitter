// @fragiola/splitter-angular: composable, unstyled Angular directives over @fragiola/splitter. The
// whole core is re-exported, so an Angular app installs and imports one package. A local export
// would silently shadow a core name of the same spelling: tests/exports.test.ts fails on one.

export * from "@fragiola/splitter";
export {
    type GroupPartState,
    SplitterGroup,
} from "./lib/directives/group.directive";
export {
    type PanelPartState,
    type PanelResizeEvent,
    SplitterPanel,
} from "./lib/directives/panel.directive";
export {
    type SeparatorPartState,
    SplitterSeparator,
} from "./lib/directives/separator.directive";
export {
    type InjectPartResult,
    injectGroup,
    injectPanel,
    injectSeparator,
} from "./lib/inject/inject-part";
export {
    injectSplitter,
    type SplitterContextValue,
} from "./lib/inject/inject-splitter";
export {
    type InjectSplitterStateOptions,
    injectSplitterState,
} from "./lib/inject/inject-splitter-state";
export { SPLITTER } from "./lib/splitter";
