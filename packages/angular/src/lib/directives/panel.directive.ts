import {
    computed,
    Directive,
    effect,
    inject,
    input,
    type OnInit,
    output,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import type {
    AnyTypes,
    GroupResizeBehavior,
    Nullable,
    PanelConstraintFields,
    PanelIdOf,
    PanelSize,
    SizeValue,
    SplitterTypes,
} from "@fragiola/splitter";
import {
    type GroupRuntime,
    injectGroupContext,
    type PanelContext,
    requireRuntime,
    SPLITTER_PANEL,
} from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import {
    bindStructuralStyle,
    dataAttr,
    injectHost,
    onDestroy,
    optionalBoolean,
} from "../utils/helpers";
import { panelStyle } from "../utils/panel-style";
import { shallowEqual } from "../utils/shallow-equal";
import { fromStore } from "../utils/signals";

/** What a panel shows: its `data-*` attributes, and the state a template reads (`p.state()`). */
export interface PanelPartState {
    /** the panel's id */
    id: string;
    /** its size in percent; undefined until known */
    size: number | undefined;
    collapsed: boolean;
    collapsible: boolean;
    disabled: boolean;
    /** its path from the root group (`/g0/p1`); undefined until it registers */
    path: string | undefined;
}

/** What `(resize)` emits: the panel's size, and the one before (none the first time). */
export interface PanelResizeEvent {
    /** in percent, and in pixels once its group is measured */
    size: PanelSize;
    previous: PanelSize | undefined;
}

const CONSTRAINTS = [
    "minSize",
    "maxSize",
    "defaultSize",
    "collapsible",
    "collapsedSize",
    "collapsedThreshold",
    "disabled",
    "groupResizeBehavior",
] as const satisfies readonly (keyof PanelConstraintFields)[];

/** What changed between two declarations: new values, and `null` for a constraint removed. */
function changesOf(
    before: PanelConstraintFields,
    after: PanelConstraintFields,
): Nullable<PanelConstraintFields> | undefined {
    const changes: Record<string, unknown> = {};
    for (const key of CONSTRAINTS) {
        if (!Object.is(before[key], after[key])) {
            changes[key] = after[key] ?? null;
        }
    }
    return Object.keys(changes).length > 0
        ? (changes as Nullable<PanelConstraintFields>)
        : undefined;
}

let nextPanel = 0;

/**
 * A panel of the enclosing `[splitterGroup]`: a flex item whose size comes from the group's
 * layout (`<div splitterPanel id="nav" minSize="20%">`). It registers in the group (`panel.add`,
 * its changed inputs as `panel.update`, `panel.remove` when it is destroyed); its order is its
 * position in the document, so a panel rendered conditionally lands where it is in the markup. A
 * `[splitterGroup]` inside it nests in it. Its element's DOM `id` is its panel id.
 */
@Directive({
    selector: "[splitterPanel]",
    exportAs: "splitterPanel",
    providers: [
        {
            provide: SPLITTER_PANEL,
            useFactory: (): PanelContext => inject(SplitterPanel).context,
        },
    ],
    host: {
        "[attr.id]": "state().id",
        "[attr.data-splitter-part]": '"panel"',
        "[attr.data-splitter-path]": "state().path ?? null",
        "[attr.data-collapsed]": "data(state().collapsed)",
        "[attr.data-collapsible]": "data(state().collapsible)",
        "[attr.data-disabled]": "data(state().disabled)",
    },
})
export class SplitterPanel<T extends SplitterTypes = AnyTypes>
    implements OnInit
{
    /**
     * the panel's id, as the saved layout names it, and its element's DOM `id` (the separators'
     * `aria-controls`); default: a generated one
     */
    readonly id = input<PanelIdOf<T> | undefined>(undefined);
    /** the smallest size the panel takes when expanded (a number is pixels, `"30"` is percent) */
    readonly minSize = input<SizeValue | undefined>(undefined);
    /** the largest size the panel takes */
    readonly maxSize = input<SizeValue | undefined>(undefined);
    /** the size it starts with when no saved or given layout has one */
    readonly defaultSize = input<SizeValue | undefined>(undefined);
    /** it can collapse below its minimum to its collapsed size */
    readonly collapsible = input(undefined, { transform: optionalBoolean });
    /** its size collapsed (default 0) */
    readonly collapsedSize = input<SizeValue | undefined>(undefined);
    /** how far past its minimum a drag goes before it collapses (default: halfway) */
    readonly collapsedThreshold = input<SizeValue | undefined>(undefined);
    /** no separator resizes it (code still can) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** how it behaves when its group resizes (default `preserve-relative-size`) */
    readonly groupResizeBehavior = input<GroupResizeBehavior | undefined>(
        undefined,
    );

    /** its size changed (in percent, and in pixels once measured) */
    readonly resize = output<PanelResizeEvent>();
    /** it collapsed */
    readonly collapse = output<void>();
    /** it expanded */
    readonly expand = output<void>();

    private readonly group = injectGroupContext("[splitterPanel]");
    private readonly host = injectHost();
    private readonly generatedId = `splitter-panel-${nextPanel++}`;
    private readonly runtime = signal<GroupRuntime | null>(null);

    /** the id the panel is registered with, and the constraints last sent for it */
    private registered: string | undefined;
    private sent: PanelConstraintFields | undefined;
    private unbind: (() => void) | undefined;
    private stop: (() => void) | undefined;

    private readonly panelId: Signal<string> = computed(
        () => this.id() ?? this.generatedId,
    );

    /** @internal what a group nested in the panel injects */
    readonly context: PanelContext = {
        group: this.group,
        panelId: this.panelId,
    };

    /** the constraints the panel declares (only those given) */
    private readonly constraints: Signal<PanelConstraintFields> =
        computed<PanelConstraintFields>(
            () => {
                const declared: Record<string, unknown> = {
                    minSize: this.minSize(),
                    maxSize: this.maxSize(),
                    defaultSize: this.defaultSize(),
                    collapsible: this.collapsible(),
                    collapsedSize: this.collapsedSize(),
                    collapsedThreshold: this.collapsedThreshold(),
                    disabled: this.disabled(),
                    groupResizeBehavior: this.groupResizeBehavior(),
                };
                const fields: Record<string, unknown> = {};
                for (const key of CONSTRAINTS) {
                    if (declared[key] !== undefined) {
                        fields[key] = declared[key];
                    }
                }
                return fields as PanelConstraintFields;
            },
            {
                equal: (a, b) =>
                    shallowEqual(
                        a as Readonly<Record<string, unknown>>,
                        b as Readonly<Record<string, unknown>>,
                    ),
            },
        );

    private readonly modelState = fromStore(
        () => {
            const model = this.runtime()?.model;
            return model
                ? (listener) => model.subscribe(() => listener())
                : undefined;
        },
        () => this.runtime()?.model.get("state"),
    );

    /** what the panel shows as `data-*` (`#p="splitterPanel"`, `p.state()`) */
    readonly state: Signal<PanelPartState> = computed(
        () => {
            const id = this.panelId();
            const runtime = this.runtime();
            this.modelState();
            const model = runtime?.model;
            if (
                !model ||
                model.get("panel-by", { id })?.groupId !== runtime.groupId
            ) {
                return {
                    id,
                    size: this.group.initialSizeOf(id),
                    collapsed: false,
                    collapsible: this.collapsible() === true,
                    disabled: this.disabled() === true,
                    path: undefined,
                };
            }
            return {
                id,
                size: model.get("layout-by", { groupId: runtime.groupId })?.[
                    id
                ],
                collapsed: model.is("panel-collapsed", { panelId: id }),
                collapsible: model.is("panel-collapsible", { panelId: id }),
                disabled: model.is("panel-disabled", { panelId: id }),
                path: model.get("panel-path-by", { panelId: id }),
            };
        },
        { equal: shallowEqual },
    );

    protected readonly data = dataAttr;

    constructor() {
        bindStructuralStyle(this.host, () =>
            panelStyle(this.state().size, this.defaultSize()),
        );

        // a new id registers the panel again
        effect(() => {
            const id = this.panelId();
            untracked(() => {
                if (this.registered !== undefined && id !== this.registered) {
                    this.unregister(false);
                    this.register(id);
                }
            });
        });

        // constraints that changed since they were sent
        effect(() => {
            const constraints = this.constraints();
            untracked(() => {
                const runtime = this.runtime();
                if (!runtime || !this.sent || this.registered === undefined) {
                    return;
                }
                const changes = changesOf(this.sent, constraints);
                if (!changes) {
                    return;
                }
                this.sent = constraints;
                if (
                    !runtime.registry.updateQueued({
                        id: this.registered,
                        groupId: runtime.groupId,
                        ...constraints,
                    })
                ) {
                    runtime.model.run(
                        "panel.update",
                        { panelId: this.registered, ...changes },
                        ADAPTER_RUN,
                    );
                }
            });
        });

        onDestroy(() => {
            this.stop?.();
            this.stop = undefined;
            this.unregister(true);
        });
    }

    ngOnInit(): void {
        const runtime = requireRuntime(this.group, "[splitterPanel]");
        this.runtime.set(runtime);
        const { model, groupId } = runtime;
        // the outputs, from the panel's first size on
        let size: PanelSize | undefined;
        let collapsed: boolean | undefined;
        let of: string | undefined;
        this.stop = model.subscribe(() => {
            const id = untracked(this.panelId);
            if (id !== of) {
                of = id;
                size = undefined;
                collapsed = undefined;
            }
            if (model.get("panel-by", { id })?.groupId !== groupId) {
                return;
            }
            const next = model.get("panel-size-by", { panelId: id });
            if (
                next &&
                (next.percentage !== size?.percentage ||
                    next.pixels !== size?.pixels)
            ) {
                const previous = size;
                size = next;
                this.resize.emit({ size: next, previous });
            }
            const now = model.is("panel-collapsed", { panelId: id });
            if (collapsed !== undefined && now !== collapsed) {
                if (now) {
                    this.collapse.emit();
                } else {
                    this.expand.emit();
                }
            }
            collapsed = now;
        });
        this.register(untracked(this.panelId));
    }

    private register(id: string): void {
        const runtime = this.runtime();
        if (!runtime) {
            return;
        }
        const constraints = untracked(this.constraints);
        // bound before it registers: its group sorts its panels by their elements
        this.unbind = runtime.engine.adapter.bindPanel(id, this.host);
        runtime.registry.addPanel({
            id,
            groupId: runtime.groupId,
            ...constraints,
        });
        this.registered = id;
        this.sent = constraints;
    }

    /** `destroyed`: the removal waits for a microtask, so a group destroyed with it goes first */
    private unregister(destroyed: boolean): void {
        const runtime = this.runtime();
        this.unbind?.();
        this.unbind = undefined;
        if (runtime && this.registered !== undefined) {
            if (destroyed) {
                runtime.registry.removePanelLater(this.registered);
            } else {
                runtime.registry.removePanel(this.registered);
            }
        }
        this.registered = undefined;
        this.sent = undefined;
    }
}
