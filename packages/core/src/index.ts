// @fragiola/splitter: the framework-free core. The model and its commands, the JSON document, the
// pure layout rules, units, and the engine that binds groups to the DOM.

export type { CommandDefinition } from "./commands/define";
export type {
    BatchEntry,
    BatchStep,
    CommandContext,
    CommandContextBase,
    CommandContextGetKey,
    CommandContextGetMap,
    CommandError,
    CommandErrorCode,
    CommandEvent,
    CommandInfo,
    CommandListener,
    CommandMap,
    CommandName,
    CommandResult,
    GroupAddPayload,
    GroupMeasurePayload,
    GroupUpdatePayload,
    Middleware,
    Nullable,
    PanelAddPayload,
    PanelConstraintFields,
    PanelUpdatePayload,
    PayloadOf,
    ResultOf,
    RunOptions,
    SeparatorMovePayload,
    SeparatorUpdatePayload,
} from "./commands/types";
export { veto } from "./commands/types";
export {
    createSplitterEngine,
    type SplitterEngine,
    type SplitterEngineAdapter,
    type SplitterEngineOptions,
} from "./engine/splitter-engine";
export {
    attachSplitterRef,
    createSplitterRef,
    type SplitterHandle,
    type SplitterRef,
} from "./engine/splitter-ref";
export type {
    EngineActionContext,
    EngineActionKey,
    EngineActionMap,
    EngineActionPayload,
    EngineActionResult,
    EngineEvent,
    EngineGetKey,
    EngineGetMap,
    EngineGetPayload,
    EngineGetResult,
    EngineIsKey,
    EngineIsMap,
    EngineIsPayload,
    EngineListener,
    EngineMiddleware,
    SeparatorAria,
} from "./engine/verbs";
export {
    type SeparatorKeyInput,
    type SeparatorKeyIntent,
    separatorKeyIntent,
} from "./keyboard/separator-keys";
export {
    type AdjustLayoutByDeltaInput,
    adjustLayoutByDelta,
} from "./layout/adjust-layout-by-delta";
export { defaultLayout } from "./layout/default-layout";
export { normalizeLayout } from "./layout/normalize-layout";
export {
    type PreservePixelSizesInput,
    preservePixelSizes,
} from "./layout/preserve-pixel-sizes";
export { type ResizePanelInput, resizePanel } from "./layout/resize-panel";
export { resolveConstraints } from "./layout/resolve-constraints";
export {
    type SeparatorValues,
    separatorValues,
} from "./layout/separator-values";
export type {
    GroupResizeBehavior,
    Layout,
    ResizeTrigger,
    ResolvedConstraints,
} from "./layout/types";
export { validateLayout } from "./layout/validate-layout";
export {
    type ValidatePanelSizeInput,
    validatePanelSize,
} from "./layout/validate-panel-size";
export { splitterJsonSchema } from "./schema/document";
export type { JsonSchema, JsonValue, ValidationIssue } from "./schema/types";
export { SplitterValidationError, validateSplitter } from "./state/document";
export type { CreateId, IdKind } from "./state/ids";
export {
    createSplitterModel,
    type DispatchOptions,
    type SplitterModel,
    type SplitterModelOptions,
} from "./state/model";
export type {
    ModelGetKey,
    ModelGetMap,
    ModelGetPayload,
    ModelGetResult,
    ModelIsKey,
    ModelIsMap,
    ModelIsPayload,
    NoPayload,
    PanelSize,
    QueryArgs,
} from "./state/queries";
export type {
    AnyTypes,
    GroupIdOf,
    GroupJson,
    GroupState,
    Orientation,
    PanelConstraints,
    PanelIdOf,
    PanelJson,
    PanelState,
    SeparatorOptions,
    SeparatorState,
    SplitterJson,
    SplitterState,
    SplitterTypes,
} from "./state/types";
export {
    type ParsedSize,
    parseSize,
    type SizeUnit,
    type SizeValue,
} from "./units/parse-size";
export {
    type GroupMeasure,
    sizeToPercentage,
    sizeToPixels,
} from "./units/resolve-size";
