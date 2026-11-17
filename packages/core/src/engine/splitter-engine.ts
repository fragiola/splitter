import { fail, invalid, ok } from "../commands/define";
import type { CommandResult, GroupMeasurePayload } from "../commands/types";
import { separatorKeyIntent } from "../keyboard/separator-keys";
import type { Layout } from "../layout/types";
import type { JsonSchema } from "../schema/types";
import { isObject, validate } from "../schema/validator";
import { readerOf } from "../state/group-layout";
import type { SplitterModel } from "../state/model";
import { type QueryArgs, resettablePanel } from "../state/queries";
import type {
    AnyTypes,
    GroupState,
    SeparatorState,
    SplitterTypes,
} from "../state/types";
import { clientAxisSize, directionOf, measureGroup, viewOf } from "./measure";
import type {
    EngineActionContext,
    EngineActionKey,
    EngineActionPayload,
    EngineActionResult,
    EngineEvent,
    EngineGetKey,
    EngineGetPayload,
    EngineGetResult,
    EngineIsKey,
    EngineIsPayload,
    EngineListener,
    EngineMiddleware,
    SeparatorAria,
} from "./verbs";

/** Options of {@link createSplitterEngine}. */
export interface SplitterEngineOptions {
    /** how far an arrow key moves a separator, in percent of its group (default 5) */
    keyboardStep?: number | undefined;
    /** a double click on a separator resets its panel to its default size (default true) */
    resetOnDoubleClick?: boolean | undefined;
}

/**
 * What only an adapter calls: binding the elements the framework rendered. Each `bind` returns
 * its unbinder. Apps and examples never touch it.
 */
export interface SplitterEngineAdapter {
    /**
     * binds a group to its element: the engine measures it (with the element's window's
     * `ResizeObserver`), reads its direction (again whenever a `dir` attribute changes on it or an
     * ancestor, with the window's `MutationObserver`), and reports both
     */
    bindGroup(groupId: string, element: HTMLElement): () => void;
    /** binds a panel to its element: its size is part of its group's measure */
    bindPanel(panelId: string, element: HTMLElement): () => void;
    /**
     * binds a separator to its element: pointer drags (with pointer capture), the keyboard and
     * double clicks on it resize its panels; rebinding the element under a new id (its panels
     * changed) keeps its listeners
     */
    bindSeparator(separatorId: string, element: HTMLElement): () => void;
    /**
     * sorts a group's panels by the document position of their bound elements and runs one
     * `batch` of `panel.update { order }` for those out of place (none when all are in place), so a
     * panel rendered conditionally lands where it is in the markup
     */
    syncOrder(groupId: string): CommandResult<unknown>;
    /**
     * binds a group's separator elements, given in any order: sorted by document position, the
     * n-th is the group's n-th separator (`model.get("separators-by")`); an element beyond the
     * group's separators, or no longer given, is unbound. Returns each element's separator id, in
     * the order given (undefined for an unbound one). Call it again whenever the elements or the
     * group's panels change; `syncSeparators(groupId, [])` unbinds them all
     */
    syncSeparators(
        groupId: string,
        elements: readonly HTMLElement[],
    ): (string | undefined)[];
    /** unbinds everything and stops observing */
    destroy(): void;
}

/**
 * The splitter engine: the groups of one model on screen. It measures them, runs pointer drags
 * and the keyboard on their separators, and answers what depends on the DOM (ARIA values with DOM
 * ids, direction, what is dragging). It reads the model and changes it only by running commands.
 * It never touches the global `document` or `window`: every element is reached through its own
 * `ownerDocument` / `defaultView`, so it works inside an iframe or a popup.
 */
export interface SplitterEngine {
    /** performs a screen action (never a command) */
    run<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): CommandResult<EngineActionResult<K>>;
    /** whether `run` would succeed now */
    can<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): boolean;
    /** what `run` would return, without doing it */
    check<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): CommandResult<EngineActionResult<K>>;
    /** reads a fact of the groups on screen */
    get<K extends EngineGetKey>(
        key: K,
        ...payload: QueryArgs<EngineGetPayload<K>>
    ): EngineGetResult<K>;
    /** asks a yes/no question about the groups on screen */
    is<K extends EngineIsKey>(key: K, payload: EngineIsPayload<K>): boolean;
    /** adds a middleware around every action; returns its remover */
    use(middleware: EngineMiddleware): () => void;
    /** listens to what the engine shows changing (a drag, a direction, an action); returns its remover */
    subscribe(listener: EngineListener): () => void;
    /** `run` for an action given as untrusted JSON `{ action, payload }`, validated */
    dispatch(input: unknown): CommandResult<unknown>;
    /** what only adapters call */
    readonly adapter: SplitterEngineAdapter;
}

const ACTION_SCHEMAS: Record<EngineActionKey, JsonSchema> = {
    measure: {
        type: "object",
        properties: { groupId: { type: "string", minLength: 1 } },
        additionalProperties: false,
    },
    "focus-separator": {
        type: "object",
        properties: { separatorId: { type: "string", minLength: 1 } },
        required: ["separatorId"],
        additionalProperties: false,
    },
};

/** A pointer drag of a separator. */
interface Drag {
    readonly pointerId: number;
    readonly separatorId: string;
    readonly groupId: string;
    readonly element: HTMLElement;
    readonly startX: number;
    readonly startY: number;
    readonly axisSize: number;
    readonly horizontal: boolean;
    readonly rtl: boolean;
    readonly origin: Layout;
    /** the last delta sent, in percent; undefined before the pointer moved */
    delta: number | undefined;
}

/** The size observer of an element's own window (never the global one). */
interface SizeObserver {
    observe(element: Element): void;
    unobserve(element: Element): void;
    disconnect(): void;
}

/** The attribute observer of an element's own window: what `dir` changes. */
interface AttributeObserver {
    observe(
        target: Node,
        options: { attributeFilter: string[]; subtree: boolean },
    ): void;
    disconnect(): void;
}

/** A window, as far as its observers go (each absent in jsdom or old browsers). */
interface ObservingView {
    readonly ResizeObserver?: new (callback: () => void) => SizeObserver;
    readonly MutationObserver?: new (
        callback: (records: readonly { readonly target: Node }[]) => void,
    ) => AttributeObserver;
}

interface BoundGroup {
    readonly element: HTMLElement;
    readonly observer: SizeObserver | undefined;
    /** watches `dir` on the group and its ancestors: a flip mirrors it without resizing it */
    readonly dirObserver: AttributeObserver | undefined;
    direction: "ltr" | "rtl";
}

class Engine<T extends SplitterTypes> implements SplitterEngine {
    private readonly model: SplitterModel<T>;
    private readonly step: number;
    private readonly resetOnDoubleClick: boolean;
    private readonly groups = new Map<string, BoundGroup>();
    private readonly panels = new Map<string, HTMLElement>();
    private readonly separators = new Map<string, HTMLElement>();
    /** each bound separator element's id and listener remover */
    private readonly separatorElements = new Map<
        HTMLElement,
        { id: string; remove: () => void }
    >();
    private readonly middleware: EngineMiddleware[] = [];
    private readonly listeners = new Set<EngineListener>();
    /** the separator elements `syncSeparators` bound, by group, with their unbinders */
    private readonly groupSeparators = new Map<
        string,
        Map<HTMLElement, () => void>
    >();
    private drag: Drag | undefined;
    /**
     * the engine's own listener on the model, while a group is bound: creating an engine has no
     * side effect, so a framework may create one during render and drop it
     */
    private modelListener: (() => void) | undefined;
    readonly adapter: SplitterEngineAdapter;

    constructor(model: SplitterModel<T>, options: SplitterEngineOptions) {
        this.model = model;
        this.step = options.keyboardStep ?? 5;
        this.resetOnDoubleClick = options.resetOnDoubleClick ?? true;
        this.run = this.run.bind(this);
        this.can = this.can.bind(this);
        this.check = this.check.bind(this);
        this.get = this.get.bind(this);
        this.is = this.is.bind(this);
        this.use = this.use.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.adapter = {
            bindGroup: (groupId, element) => this.bindGroup(groupId, element),
            bindPanel: (panelId, element) => this.bindPanel(panelId, element),
            bindSeparator: (separatorId, element) =>
                this.bindSeparator(separatorId, element),
            syncOrder: (groupId) => this.syncOrder(groupId),
            syncSeparators: (groupId, elements) =>
                this.syncSeparators(groupId, elements),
            destroy: () => this.destroy(),
        };
    }

    // ---------------------------------------------------------------------------------------------
    // the verbs
    // ---------------------------------------------------------------------------------------------

    run<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): CommandResult<EngineActionResult<K>> {
        return this.execute(action, payload, false) as CommandResult<
            EngineActionResult<K>
        >;
    }

    can<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): boolean {
        return this.check(action, payload).ok;
    }

    check<K extends EngineActionKey>(
        action: K,
        payload: EngineActionPayload<K>,
    ): CommandResult<EngineActionResult<K>> {
        return this.execute(action, payload, true) as CommandResult<
            EngineActionResult<K>
        >;
    }

    dispatch(input: unknown): CommandResult<unknown> {
        if (!isObject(input)) {
            return fail(
                "invalid_payload",
                "must be an object { action, payload }",
                "",
            );
        }
        const { action, payload } = input;
        if (typeof action !== "string") {
            return fail("invalid_payload", "must be a string", "/action");
        }
        if (!Object.hasOwn(ACTION_SCHEMAS, action)) {
            return fail(
                "unknown_command",
                `unknown action "${action}"`,
                "/action",
            );
        }
        for (const key of Object.keys(input)) {
            if (key !== "action" && key !== "payload") {
                return fail("invalid_payload", "is not allowed", `/${key}`);
            }
        }
        return this.execute(
            action as EngineActionKey,
            payload,
            false,
            "/payload",
        );
    }

    get<K extends EngineGetKey>(
        key: K,
        ...payload: QueryArgs<EngineGetPayload<K>>
    ): EngineGetResult<K> {
        const query = payload[0] as Record<string, unknown> | undefined;
        switch (key) {
            case "separator-aria-by":
                return this.separatorAria(
                    String(query?.separatorId ?? ""),
                ) as EngineGetResult<K>;
            case "direction-by":
                return (this.groups.get(String(query?.groupId ?? ""))
                    ?.direction ?? "ltr") as EngineGetResult<K>;
            case "dragging-separator-id":
                return this.drag?.separatorId as EngineGetResult<K>;
            default:
                return undefined as EngineGetResult<K>;
        }
    }

    is<K extends EngineIsKey>(key: K, payload: EngineIsPayload<K>): boolean {
        const query = payload as Record<string, unknown>;
        switch (key) {
            case "separator-dragging":
                return (
                    this.drag !== undefined &&
                    this.drag.separatorId === query.separatorId
                );
            case "group-dragging":
                return (
                    this.drag !== undefined &&
                    this.drag.groupId === query.groupId
                );
            case "group-bound":
                return this.groups.has(String(query.groupId));
            default:
                return false;
        }
    }

    use(middleware: EngineMiddleware): () => void {
        this.middleware.push(middleware);
        return () => {
            const at = this.middleware.indexOf(middleware);
            if (at >= 0) {
                this.middleware.splice(at, 1);
            }
        };
    }

    subscribe(listener: EngineListener): () => void {
        const wrapper: EngineListener = (event) => listener(event);
        this.listeners.add(wrapper);
        return () => {
            this.listeners.delete(wrapper);
        };
    }

    private emit(event: EngineEvent): void {
        let failure: { error: unknown } | undefined;
        for (const listener of [...this.listeners]) {
            try {
                listener(event);
            } catch (thrown) {
                failure ??= { error: thrown };
            }
        }
        if (failure) {
            throw failure.error;
        }
    }

    private execute(
        action: EngineActionKey,
        payload: unknown,
        dryRun: boolean,
        prefix = "",
    ): CommandResult<unknown> {
        const schema = ACTION_SCHEMAS[action];
        if (!schema) {
            return fail("unknown_command", `unknown action "${action}"`);
        }
        const failed = invalid(validate(schema, payload, prefix));
        if (failed) {
            return failed;
        }
        const context = { action, payload, dryRun } as EngineActionContext;
        const core = () => this.perform(context);
        const list = [...this.middleware];
        const at = (i: number): CommandResult<unknown> => {
            const middleware = list[i];
            if (!middleware) {
                return core();
            }
            let nextResult: CommandResult<unknown> = fail(
                "vetoed",
                "a middleware returned no result",
            );
            let called = false;
            const next = () => {
                if (!called) {
                    called = true;
                    nextResult = at(i + 1);
                }
                return nextResult;
            };
            try {
                return middleware(context, next) ?? nextResult;
            } catch (thrown) {
                return fail(
                    "middleware_error",
                    thrown instanceof Error ? thrown.message : String(thrown),
                );
            }
        };
        const result = at(0);
        if (!dryRun) {
            this.emit({ type: "action", action, payload, result });
        }
        return result;
    }

    private perform(context: EngineActionContext): CommandResult<unknown> {
        switch (context.action) {
            case "measure": {
                const { groupId } = context.payload;
                if (groupId !== undefined && !this.groups.has(groupId)) {
                    return fail(
                        "not_found",
                        `group "${groupId}" is not bound`,
                        "/groupId",
                    );
                }
                const groupIds =
                    groupId === undefined ? [...this.groups.keys()] : [groupId];
                if (!context.dryRun) {
                    for (const id of groupIds) {
                        this.measure(id, true);
                    }
                }
                return ok({ groupIds });
            }
            case "focus-separator": {
                const { separatorId } = context.payload;
                const element = this.separators.get(separatorId);
                if (!element) {
                    return fail(
                        "not_found",
                        `separator "${separatorId}" is not bound`,
                        "/separatorId",
                    );
                }
                if (!context.dryRun) {
                    element.focus({ preventScroll: true });
                }
                return ok({ separatorId });
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // reads
    // ---------------------------------------------------------------------------------------------

    private groupOf(groupId: string): GroupState | undefined {
        return this.model.get("group-by", { id: groupId });
    }

    private separatorOf(separatorId: string): SeparatorState | undefined {
        return this.model.get("separator-by", { id: separatorId });
    }

    private panelElementsOf(group: GroupState): HTMLElement[] {
        return group.panelIds.flatMap((panelId) => {
            const element = this.panels.get(panelId);
            return element ? [element] : [];
        });
    }

    private separatorAria(separatorId: string): SeparatorAria | undefined {
        const separator = this.separatorOf(separatorId);
        const values = this.model.get("separator-values-by", { separatorId });
        const group = separator && this.groupOf(separator.groupId);
        if (!separator || !values || !group) {
            return undefined;
        }
        const controls = this.panels.get(values.panelId)?.id;
        return {
            role: "separator",
            "aria-orientation":
                group.orientation === "horizontal" ? "vertical" : "horizontal",
            "aria-valuenow": values.valueNow,
            "aria-valuemin": values.valueMin,
            "aria-valuemax": values.valueMax,
            ...(controls ? { "aria-controls": controls } : {}),
            ...(separator.disabled ? { "aria-disabled": true } : {}),
        };
    }

    // ---------------------------------------------------------------------------------------------
    // binding and measuring
    // ---------------------------------------------------------------------------------------------

    /** listens to the model while a group is bound */
    private listenModel(): void {
        if (this.modelListener) {
            return;
        }
        // a bound group whose panels changed is measured again (a panel bound before it registered)
        this.modelListener = this.model.subscribe(({ before, after }) => {
            for (const groupId of this.groups.keys()) {
                const prev = Object.hasOwn(before.groups, groupId)
                    ? before.groups[groupId]?.panelIds
                    : undefined;
                const next = Object.hasOwn(after.groups, groupId)
                    ? after.groups[groupId]?.panelIds
                    : undefined;
                if (next !== undefined && prev !== next) {
                    this.measure(groupId, false);
                }
            }
        });
    }

    private bindGroup(groupId: string, element: HTMLElement): () => void {
        this.unbindGroup(groupId);
        this.listenModel();
        const view = viewOf(element);
        const Observer = (view as ObservingView | undefined)?.ResizeObserver;
        const observer = Observer
            ? new Observer(() => {
                  this.measure(groupId, false);
              })
            : undefined;
        observer?.observe(element);
        // a `dir` set on the group or above it changes its direction without resizing it, so the
        // size observer misses it (a `dir` inside a panel's content is not the group's)
        const DirObserver = (view as ObservingView | undefined)
            ?.MutationObserver;
        const dirObserver = DirObserver
            ? new DirObserver((records) => {
                  if (records.some(({ target }) => target.contains(element))) {
                      this.measure(groupId, false);
                  }
              })
            : undefined;
        dirObserver?.observe(element.ownerDocument, {
            attributeFilter: ["dir"],
            subtree: true,
        });
        const bound: BoundGroup = {
            element,
            observer,
            dirObserver,
            direction: directionOf(element),
        };
        this.groups.set(groupId, bound);
        const group = this.groupOf(groupId);
        if (group) {
            for (const panel of this.panelElementsOf(group)) {
                observer?.observe(panel);
            }
        }
        this.measure(groupId, false);
        return () => {
            if (this.groups.get(groupId) === bound) {
                this.unbindGroup(groupId);
            }
        };
    }

    private unbindGroup(groupId: string): void {
        const bound = this.groups.get(groupId);
        if (bound) {
            bound.observer?.disconnect();
            bound.dirObserver?.disconnect();
            this.groups.delete(groupId);
        }
        if (this.groups.size === 0) {
            this.modelListener?.();
            this.modelListener = undefined;
        }
    }

    private bindPanel(panelId: string, element: HTMLElement): () => void {
        this.panels.set(panelId, element);
        const groupId = this.model.get("panel-by", { id: panelId })?.groupId;
        const bound =
            groupId === undefined ? undefined : this.groups.get(groupId);
        bound?.observer?.observe(element);
        if (groupId !== undefined) {
            this.measure(groupId, false);
        }
        return () => {
            if (this.panels.get(panelId) === element) {
                this.panels.delete(panelId);
                bound?.observer?.unobserve(element);
            }
        };
    }

    /**
     * Measures a bound group and runs `group.measure` (transient) when the measure changed (or
     * always, when `force`). A group with no size yet is not reported.
     */
    private measure(groupId: string, force: boolean): void {
        const bound = this.groups.get(groupId);
        const group = this.groupOf(groupId);
        if (!bound || !group) {
            return;
        }
        const direction = directionOf(bound.element);
        if (direction !== bound.direction) {
            bound.direction = direction;
            this.emit({ type: "direction", groupId, direction });
        }
        const panels = this.panelElementsOf(group);
        for (const panel of panels) {
            bound.observer?.observe(panel);
        }
        const measure = measureGroup(
            groupId,
            bound.element,
            panels,
            group.orientation,
        );
        if (measure.axisSize <= 0 && group.measure === undefined) {
            return;
        }
        if (!force && sameMeasure(group, measure)) {
            return;
        }
        this.model.run("group.measure", measure, { transient: true });
    }

    private syncOrder(groupId: string): CommandResult<unknown> {
        const group = this.groupOf(groupId);
        if (!group) {
            return fail("not_found", `no group "${groupId}"`, "/groupId");
        }
        const placed = group.panelIds
            .map((panelId) => ({ panelId, element: this.panels.get(panelId) }))
            .filter(
                (entry): entry is { panelId: string; element: HTMLElement } =>
                    entry.element !== undefined,
            )
            .sort((a, b) => {
                const position = a.element.compareDocumentPosition(b.element);
                // DOCUMENT_POSITION_FOLLOWING (4): b comes after a
                return position & 4 ? -1 : position & 2 ? 1 : 0;
            });
        const updates = placed.flatMap(({ panelId }, order) =>
            this.model.get("panel-by", { id: panelId })?.order === order
                ? []
                : [
                      {
                          command: "panel.update" as const,
                          payload: { panelId, order },
                      },
                  ],
        );
        if (updates.length === 0) {
            return ok({ results: [] });
        }
        // what the markup's order says, as the adapter's registration: `meta.source` tells it
        return this.model.run(
            "batch",
            { commands: updates },
            { meta: { source: "adapter" } },
        );
    }

    private syncSeparators(
        groupId: string,
        elements: readonly HTMLElement[],
    ): (string | undefined)[] {
        const separators = this.groupOf(groupId)
            ? this.model.get("separators-by", { groupId })
            : [];
        const ids = new Map<HTMLElement, string | undefined>();
        [...elements]
            .sort((a, b) => {
                const position = a.compareDocumentPosition(b);
                // DOCUMENT_POSITION_FOLLOWING (4): b comes after a
                return position & 4 ? -1 : position & 2 ? 1 : 0;
            })
            .forEach((element, index) => {
                ids.set(element, separators[index]?.id);
            });
        const previous = this.groupSeparators.get(groupId) ?? new Map();
        for (const [element, unbind] of previous) {
            if (ids.get(element) === undefined) {
                unbind();
            }
        }
        const next = new Map<HTMLElement, () => void>();
        for (const [element, id] of ids) {
            if (id !== undefined) {
                next.set(element, this.bindSeparator(id, element));
            }
        }
        if (next.size > 0) {
            this.groupSeparators.set(groupId, next);
        } else {
            this.groupSeparators.delete(groupId);
        }
        return elements.map((element) => ids.get(element));
    }

    private destroy(): void {
        for (const groupId of [...this.groups.keys()]) {
            this.unbindGroup(groupId);
        }
        for (const { remove } of this.separatorElements.values()) {
            remove();
        }
        this.separatorElements.clear();
        this.groupSeparators.clear();
        this.separators.clear();
        this.panels.clear();
        this.drag = undefined;
    }

    // ---------------------------------------------------------------------------------------------
    // separators: pointer, keyboard, double click
    // ---------------------------------------------------------------------------------------------

    private bindSeparator(
        separatorId: string,
        element: HTMLElement,
    ): () => void {
        const existing = this.separatorElements.get(element);
        if (existing) {
            if (this.separators.get(existing.id) === element) {
                this.separators.delete(existing.id);
            }
            existing.id = separatorId;
        } else {
            const idOf = () => this.separatorElements.get(element)?.id;
            const onPointerDown = (event: PointerEvent) => {
                const id = idOf();
                if (id !== undefined) {
                    this.startDrag(id, element, event);
                }
            };
            const onPointerMove = (event: PointerEvent) =>
                this.moveDrag(element, event);
            const onPointerUp = (event: PointerEvent) =>
                this.endDrag(element, event);
            const onPointerCancel = (event: PointerEvent) =>
                this.endDrag(element, event, false);
            const onKeyDown = (event: KeyboardEvent) => {
                const id = idOf();
                if (id !== undefined) {
                    this.onKeyDown(id, event);
                }
            };
            const onDoubleClick = (event: MouseEvent) => {
                const id = idOf();
                if (id !== undefined) {
                    this.onDoubleClick(id, event);
                }
            };
            element.addEventListener("pointerdown", onPointerDown);
            element.addEventListener("pointermove", onPointerMove);
            element.addEventListener("pointerup", onPointerUp);
            element.addEventListener("pointercancel", onPointerCancel);
            element.addEventListener("lostpointercapture", onPointerCancel);
            element.addEventListener("keydown", onKeyDown);
            element.addEventListener("dblclick", onDoubleClick);
            this.separatorElements.set(element, {
                id: separatorId,
                remove: () => {
                    element.removeEventListener("pointerdown", onPointerDown);
                    element.removeEventListener("pointermove", onPointerMove);
                    element.removeEventListener("pointerup", onPointerUp);
                    element.removeEventListener(
                        "pointercancel",
                        onPointerCancel,
                    );
                    element.removeEventListener(
                        "lostpointercapture",
                        onPointerCancel,
                    );
                    element.removeEventListener("keydown", onKeyDown);
                    element.removeEventListener("dblclick", onDoubleClick);
                },
            });
        }
        this.separators.set(separatorId, element);
        return () => {
            const entry = this.separatorElements.get(element);
            if (!entry || entry.id !== separatorId) {
                return;
            }
            if (this.drag?.element === element) {
                this.endDrag(element, undefined, false);
            }
            entry.remove();
            this.separatorElements.delete(element);
            if (this.separators.get(separatorId) === element) {
                this.separators.delete(separatorId);
            }
        };
    }

    private startDrag(
        separatorId: string,
        element: HTMLElement,
        event: PointerEvent,
    ): void {
        if (
            this.drag ||
            event.defaultPrevented ||
            event.isPrimary === false ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }
        const separator = this.separatorOf(separatorId);
        const group = separator && this.groupOf(separator.groupId);
        const bound = group && this.groups.get(group.id);
        if (!separator || separator.disabled || !group || !bound) {
            return;
        }
        this.measure(group.id, false);
        const current = this.groupOf(group.id) ?? group;
        const axisSize =
            clientAxisSize(
                bound.element,
                this.panelElementsOf(current),
                current.orientation,
            ) ||
            (current.measure?.axisSize ?? 0);
        if (axisSize <= 0) {
            return;
        }
        event.preventDefault();
        element.setPointerCapture?.(event.pointerId);
        this.drag = {
            pointerId: event.pointerId,
            separatorId,
            groupId: current.id,
            element,
            startX: event.clientX,
            startY: event.clientY,
            axisSize,
            horizontal: current.orientation === "horizontal",
            rtl: bound.direction === "rtl",
            origin: { ...current.layout },
            delta: undefined,
        };
        this.emit({ type: "dragging", separatorId });
    }

    private deltaOf(drag: Drag, event: PointerEvent): number {
        const pixels = drag.horizontal
            ? event.clientX - drag.startX
            : event.clientY - drag.startY;
        const sign = drag.horizontal && drag.rtl ? -1 : 1;
        return (sign * pixels * 100) / drag.axisSize;
    }

    private moveDrag(element: HTMLElement, event: PointerEvent): void {
        const drag = this.drag;
        if (
            !drag ||
            drag.element !== element ||
            drag.pointerId !== event.pointerId
        ) {
            return;
        }
        const delta = this.deltaOf(drag, event);
        if (delta === drag.delta) {
            return;
        }
        drag.delta = delta;
        this.model.run(
            "separator.move",
            {
                separatorId: drag.separatorId,
                delta,
                origin: drag.origin,
                source: "pointer",
            },
            { transient: true },
        );
    }

    /**
     * Ends a drag with one non-transient `separator.move` from where it started (the drag's last
     * position; with `useEvent`, the release point). When that commit is refused (a middleware
     * vetoed it), the layout goes back to where the drag started.
     */
    private endDrag(
        element: HTMLElement,
        event: PointerEvent | undefined,
        useEvent = true,
    ): void {
        const drag = this.drag;
        if (
            !drag ||
            drag.element !== element ||
            (event !== undefined && drag.pointerId !== event.pointerId)
        ) {
            return;
        }
        this.drag = undefined;
        if (element.hasPointerCapture?.(drag.pointerId)) {
            element.releasePointerCapture?.(drag.pointerId);
        }
        const delta =
            useEvent && event !== undefined
                ? this.deltaOf(drag, event)
                : drag.delta;
        if (delta !== undefined && (drag.delta !== undefined || delta !== 0)) {
            const result = this.model.run("separator.move", {
                separatorId: drag.separatorId,
                delta,
                origin: drag.origin,
                source: "pointer",
            });
            if (!result.ok && this.groupOf(drag.groupId)) {
                this.model.run(
                    "group.set-layout",
                    { groupId: drag.groupId, layout: drag.origin },
                    { transient: true, meta: { restore: true } },
                );
            }
        }
        this.emit({ type: "dragging", separatorId: undefined });
    }

    private onKeyDown(separatorId: string, event: KeyboardEvent): void {
        if (event.defaultPrevented) {
            return;
        }
        const separator = this.separatorOf(separatorId);
        const group = separator && this.groupOf(separator.groupId);
        if (!separator || !group || separator.disabled) {
            return;
        }
        const intent = separatorKeyIntent({
            key: event.key,
            shiftKey: event.shiftKey,
            orientation: group.orientation,
            direction: this.groups.get(group.id)?.direction ?? "ltr",
            step: this.step,
        });
        if (!intent) {
            return;
        }
        event.preventDefault();
        switch (intent.type) {
            case "move":
                this.model.run("separator.move", {
                    separatorId,
                    delta: intent.delta,
                    source: "keyboard",
                });
                return;
            case "toggle": {
                const [panelId] = separator.panelIds;
                if (!this.model.is("panel-collapsible", { panelId })) {
                    return;
                }
                this.model.run(
                    this.model.is("panel-collapsed", { panelId })
                        ? "panel.expand"
                        : "panel.collapse",
                    { panelId },
                );
                return;
            }
            case "cycle": {
                const enabled = this.model
                    .get("separators-by", { groupId: group.id })
                    .filter(
                        ({ id, disabled }) =>
                            !disabled && this.separators.has(id),
                    );
                const index = enabled.findIndex(({ id }) => id === separatorId);
                if (enabled.length === 0 || index < 0) {
                    return;
                }
                const next =
                    enabled[
                        (index + (intent.backwards ? -1 : 1) + enabled.length) %
                            enabled.length
                    ];
                if (next) {
                    this.run("focus-separator", { separatorId: next.id });
                }
                return;
            }
        }
    }

    private onDoubleClick(separatorId: string, event: MouseEvent): void {
        if (event.defaultPrevented || !this.resetOnDoubleClick) {
            return;
        }
        const separator = this.separatorOf(separatorId);
        const target =
            separator &&
            resettablePanel(readerOf(this.model.get("state")), separator);
        const declared =
            target &&
            this.model.get("panel-by", { id: target.panelId })?.defaultSize;
        if (!target || declared === undefined) {
            return;
        }
        event.preventDefault();
        this.model.run("panel.resize", {
            panelId: target.panelId,
            size: declared,
        });
    }
}

function sameMeasure(group: GroupState, next: GroupMeasurePayload): boolean {
    const current = group.measure;
    return (
        current !== undefined &&
        current.axisSize === next.axisSize &&
        current.fontSize === next.fontSize &&
        current.rootFontSize === next.rootFontSize &&
        current.viewportWidth === next.viewportWidth &&
        current.viewportHeight === next.viewportHeight
    );
}

/** Creates the engine of a model's groups on screen; bind elements through `engine.adapter`. */
export function createSplitterEngine<T extends SplitterTypes = AnyTypes>(
    model: SplitterModel<T>,
    options: SplitterEngineOptions = {},
): SplitterEngine {
    return new Engine(model, options);
}
