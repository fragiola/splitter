import {
    afterNextRender,
    computed,
    Directive,
    effect,
    Injector,
    inject,
    input,
    model as modelInput,
    type OnInit,
    output,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import {
    type AnyTypes,
    attachSplitterRef,
    type BatchEntry,
    type CommandEvent,
    createSplitterEngine,
    createSplitterModel,
    type GroupIdOf,
    type GroupState,
    type Layout,
    type Orientation,
    type SplitterHandle,
    type SplitterModel,
    type SplitterRef,
    type SplitterTypes,
} from "@fragiola/splitter";
import {
    eraseModel,
    type GroupContext,
    type GroupRuntime,
    SPLITTER_GROUP,
    SPLITTER_PANEL,
} from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import { GroupRegistry } from "../utils/group-registry";
import {
    bindStructuralStyle,
    dataAttr,
    injectHost,
    onDestroy,
    optionalBoolean,
} from "../utils/helpers";
import { shallowEqual } from "../utils/shallow-equal";
import { fromStore } from "../utils/signals";

/** What a group shows: its `data-*` attributes, and the state a template reads (`g.state()`). */
export interface GroupPartState {
    /** the group's id */
    id: string;
    orientation: Orientation;
    /** none of its separators can be used */
    disabled: boolean;
    /** a pointer is dragging one of its separators */
    dragging: boolean;
    /** its path from the root group (`/g0`, `/g0/p1/g0`); undefined until it registers */
    path: string | undefined;
}

let nextGroup = 0;

/** A layout the app owns, as a plain copy: the model never keeps the app's object. */
function plainLayout(layout: Readonly<Layout> | undefined): Layout | undefined {
    return layout === undefined ? undefined : { ...layout };
}

/**
 * Whether a commit is about this group: it changed the group's layout, or it names the group, one
 * of its panels or one of its separators (a drag's release may land on the layout its last step
 * already reached).
 */
function commitsGroup(event: CommandEvent, group: GroupState): boolean {
    const before = Object.hasOwn(event.before.groups, group.id)
        ? event.before.groups[group.id]
        : undefined;
    if (!before || !shallowEqual(before.layout, group.layout)) {
        return true;
    }
    const separatorIds = group.panelIds
        .slice(1)
        .map((panelId, i) => `${group.panelIds[i]}:${panelId}`);
    const payloads = event.commands
        ? event.commands.map(({ payload }) => payload)
        : [event.payload];
    return payloads.some((payload) => {
        if (typeof payload !== "object" || payload === null) {
            return false;
        }
        const { groupId, panelId, separatorId } = payload as Record<
            string,
            unknown
        >;
        return (
            groupId === group.id ||
            (typeof panelId === "string" && group.panelIds.includes(panelId)) ||
            (typeof separatorId === "string" &&
                separatorIds.includes(separatorId))
        );
    });
}

function hasPending(model: SplitterModel, groupId: string): boolean {
    return Object.hasOwn(model.get("state").pending, groupId);
}

/**
 * A group of panels laid out along one orientation, with a `[splitterSeparator]` between
 * neighbouring panels: `<div splitterGroup id="main">`. The outermost group creates the model
 * (unless one is given) and the engine; a group inside a `[splitterPanel]` joins them and nests in
 * that panel. Its element is a flex container. Its `id` and `model` are read once, when its inputs
 * are first set: give a group another one by creating it again (`@for (id of [id]; track id)`).
 *
 * The group and the panels initialized with it register in one `batch` after the first render
 * (React and Vue register after their panels mount); props that change later become
 * `group.update` and `group.set-layout`. Everything is undone when the group is destroyed.
 */
@Directive({
    selector: "[splitterGroup]",
    exportAs: "splitterGroup",
    providers: [
        {
            provide: SPLITTER_GROUP,
            useFactory: (): GroupContext => inject(SplitterGroup).context,
        },
    ],
    host: {
        "[attr.data-splitter-part]": '"group"',
        "[attr.data-splitter-path]": "state().path ?? null",
        "[attr.data-orientation]": "state().orientation",
        "[attr.data-disabled]": "data(state().disabled)",
        "[attr.data-dragging]": "data(state().dragging)",
    },
})
export class SplitterGroup<T extends SplitterTypes = AnyTypes>
    implements OnInit
{
    /**
     * the group's id, as the saved layout names it; default: a generated one. Read once (create
     * the group again for another one)
     */
    readonly id = input<GroupIdOf<T> | undefined>(undefined);
    /** panels side by side (`horizontal`, the default) or stacked (`vertical`) */
    readonly orientation = input<Orientation | undefined>(undefined);
    /** none of its separators can be used (code can still resize its panels) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /**
     * the model to register in (a root group only): default, a new one for the outermost group,
     * and the enclosing panel's for a group nested in one. Read once
     */
    readonly model = input<SplitterModel<T> | undefined>(undefined);
    /**
     * the layout (each panel's size in percent, by panel id), applied when the group registers and
     * whenever it changes to another one than the model's (`group.set-layout`); `[(layout)]` keeps
     * it in sync: `layoutChange` emits on every commit that changes the layout, drag steps included
     */
    readonly layout = modelInput<Readonly<Layout> | undefined>(undefined);
    /** the layout it starts with, unless the model has a saved one for it */
    readonly defaultLayout = input<Readonly<Layout> | undefined>(undefined);
    /** a handle that gives code outside the group its model and engine (a root group only) */
    readonly splitterRef = input<SplitterRef | undefined>(undefined);
    /** how far an arrow key moves a separator, in percent (a root group only, read once; default 5) */
    readonly keyboardStep = input<number | undefined>(undefined);
    /** a double click on a separator resets its panel (a root group only, read once; default true) */
    readonly resetOnDoubleClick = input(undefined, {
        transform: optionalBoolean,
    });

    /**
     * a layout was committed: a drag released, a key pressed, a command run (never a drag step,
     * nor the markup's own commands)
     */
    readonly layoutCommit = output<Readonly<Layout>>();

    private readonly host = injectHost();
    private readonly injector = inject(Injector);
    private readonly parent = inject(SPLITTER_PANEL, { optional: true });
    private readonly generatedId = `splitter-group-${nextGroup++}`;
    private readonly runtime = signal<GroupRuntime | null>(null);
    /** the group joined the enclosing panel's model (it nests in that panel) */
    private joins = false;
    /** the id and model it was created with */
    private created: { id: string; model: SplitterModel | undefined } | null =
        null;
    private mounted = false;
    private readonly stops: (() => void)[] = [];
    /** what the group last sent to the model: later changes send only what changed */
    private sent:
        | { orientation: Orientation; disabled: boolean; layout?: Layout }
        | undefined;
    /** the panel the group sits in, as last sent */
    private parentPanelId: string | undefined;
    private heldRef: SplitterRef | undefined;
    private releaseRef: (() => void) | undefined;

    /** @internal what the group's parts inject */
    readonly context: GroupContext = {
        runtime: this.runtime.asReadonly(),
        orientation: computed(() => this.orientation() ?? "horizontal"),
        disabled: computed(() => this.disabled() ?? false),
        initialSizeOf: (panelId) => {
            const layout = this.layout();
            const defaultLayout = this.defaultLayout();
            const runtime = this.runtime();
            const pending = runtime?.model.get("state").pending;
            const groupId = runtime?.groupId;
            const saved =
                pending &&
                groupId !== undefined &&
                Object.hasOwn(pending, groupId)
                    ? pending[groupId]?.panels.find(({ id }) => id === panelId)
                          ?.size
                    : undefined;
            return layout?.[panelId] ?? saved ?? defaultLayout?.[panelId];
        },
    };

    /** the model's state, followed */
    private readonly modelState = fromStore(
        () => {
            const model = this.runtime()?.model;
            return model
                ? (listener) => model.subscribe(() => listener())
                : undefined;
        },
        () => this.runtime()?.model.get("state"),
    );
    private readonly dragging = fromStore(
        () => {
            const engine = this.runtime()?.engine;
            return engine
                ? (listener) => engine.subscribe(() => listener())
                : undefined;
        },
        () => {
            const runtime = this.runtime();
            return runtime
                ? runtime.engine.is("group-dragging", {
                      groupId: runtime.groupId,
                  })
                : false;
        },
    );

    /** what the group shows as `data-*` (`#g="splitterGroup"`, `g.state()`) */
    readonly state: Signal<GroupPartState> = computed(
        () => {
            const runtime = this.runtime();
            const orientation = this.context.orientation();
            const disabled = this.context.disabled();
            if (!runtime) {
                return {
                    id: this.id() ?? this.generatedId,
                    orientation,
                    disabled,
                    dragging: false,
                    path: undefined,
                };
            }
            this.modelState();
            const { model, groupId } = runtime;
            const group = model.get("group-by", { id: groupId });
            return {
                id: groupId,
                orientation: group?.orientation ?? orientation,
                disabled: group?.disabled ?? disabled,
                dragging: this.dragging(),
                path: model.get("group-path-by", { groupId }),
            };
        },
        { equal: shallowEqual },
    );

    protected readonly data = dataAttr;

    constructor() {
        bindStructuralStyle(this.host, () => ({
            display: "flex",
            flexDirection:
                this.state().orientation === "horizontal" ? "row" : "column",
            flexWrap: "nowrap",
        }));

        // the id and the model are read once
        effect(() => {
            const id = this.id();
            const model = this.model();
            untracked(() => {
                const created = this.created;
                if (
                    created &&
                    ((id ?? this.generatedId) !== created.id ||
                        (model === undefined
                            ? undefined
                            : eraseModel(model)) !== created.model)
                ) {
                    console.error(
                        `[splitterGroup] "${created.id}": its id and model are read once; create the group again to change them`,
                    );
                }
            });
        });

        // outside the root, the splitter is reachable once the group is registered
        effect(() => {
            this.splitterRef();
            untracked(() => {
                if (this.mounted) {
                    this.holdRef();
                }
            });
        });

        // a new parent panel id (the panel the group sits in got another id) moves the group in
        // place, with its panels, its layout and its layout memory: nothing is created again
        effect(() => {
            const panelId = this.parent?.panelId();
            untracked(() => {
                const next = this.joins ? panelId : undefined;
                const runtime = this.runtime();
                if (
                    !runtime ||
                    !this.sent ||
                    !runtime.registry.registered() ||
                    next === this.parentPanelId
                ) {
                    return;
                }
                this.parentPanelId = next;
                runtime.model.run(
                    "group.update",
                    { groupId: runtime.groupId, parentPanelId: next ?? null },
                    ADAPTER_RUN,
                );
            });
        });

        // props that changed since they were sent
        effect(() => {
            const orientation = this.context.orientation();
            const disabled = this.context.disabled();
            untracked(() => {
                const runtime = this.runtime();
                const sent = this.sent;
                if (!runtime || !sent || !runtime.registry.registered()) {
                    return;
                }
                if (
                    orientation !== sent.orientation ||
                    disabled !== sent.disabled
                ) {
                    runtime.model.run(
                        "group.update",
                        { groupId: runtime.groupId, orientation, disabled },
                        ADAPTER_RUN,
                    );
                    sent.orientation = orientation;
                    sent.disabled = disabled;
                }
            });
        });
        effect(() => {
            const layout = plainLayout(this.layout());
            untracked(() => {
                const runtime = this.runtime();
                const sent = this.sent;
                if (
                    !runtime ||
                    !sent ||
                    !runtime.registry.registered() ||
                    !layout
                ) {
                    return;
                }
                if (!shallowEqual(layout, sent.layout)) {
                    const { model, groupId } = runtime;
                    // a layout that comes back from layoutChange is the model's layout already:
                    // setting it again would turn each transient drag step into a commit
                    if (
                        !shallowEqual(
                            layout,
                            model.get("layout-by", { groupId }),
                        )
                    ) {
                        model.run(
                            "group.set-layout",
                            { groupId, layout },
                            ADAPTER_RUN,
                        );
                    }
                    sent.layout = layout;
                }
            });
        });

        onDestroy(() => this.unregister());
    }

    ngOnInit(): void {
        const id = this.id() ?? this.generatedId;
        const given = this.model();
        const erased = given === undefined ? undefined : eraseModel(given);
        this.created = { id, model: erased };
        const around = this.parent ? this.parent.group.runtime() : null;
        const joins =
            around !== null &&
            (erased === undefined || erased === around.model);
        const model = joins ? around.model : (erased ?? createSplitterModel());
        // the engine's options are read once; creating an engine has no side effect: it listens
        // to the model once a group binds
        const engine = joins
            ? around.engine
            : createSplitterEngine(model, {
                  keyboardStep: this.keyboardStep(),
                  resetOnDoubleClick: this.resetOnDoubleClick(),
              });
        this.joins = joins;
        const registry = new GroupRegistry(model, engine, id);
        this.stops.push(engine.adapter.bindGroup(id, this.host));
        this.runtime.set({ model, engine, groupId: id, registry });
        // after the first render, once the panels inside it (an `@for`, a child component) are
        // initialized and wait in the registry
        afterNextRender(() => this.register(), { injector: this.injector });
    }

    private holdRef(): void {
        const runtime = this.runtime();
        const splitterRef = this.splitterRef();
        const next = !this.joins && runtime ? splitterRef : undefined;
        if (next === this.heldRef) {
            return;
        }
        this.releaseRef?.();
        this.heldRef = next;
        if (next && runtime) {
            const handle: SplitterHandle = {
                model: runtime.model,
                engine: runtime.engine,
                groupId: runtime.groupId,
            };
            this.releaseRef = attachSplitterRef(next, handle);
        } else {
            this.releaseRef = undefined;
        }
    }

    private register(): void {
        const runtime = this.runtime();
        if (!runtime || this.mounted) {
            return;
        }
        const { model, engine, groupId, registry } = runtime;
        this.mounted = true;
        this.holdRef();

        // layoutChange on every commit that changes the layout (drag steps included),
        // layoutCommit on every non-transient commit of the user or the app that settles this
        // group's layout on another one than the last committed (the markup's commands,
        // registration included, only move that baseline)
        let changed: Readonly<Layout> | undefined;
        let committed: Readonly<Layout> | undefined;
        this.stops.push(
            model.subscribe((event) => {
                const { after, transient } = event;
                const group = Object.hasOwn(after.groups, groupId)
                    ? after.groups[groupId]
                    : undefined;
                if (!group) {
                    committed = undefined;
                    return;
                }
                const { layout } = group;
                if (!shallowEqual(layout, changed)) {
                    changed = layout;
                    this.layout.set(layout);
                }
                if (transient) {
                    return;
                }
                if (event.meta?.source === "adapter") {
                    committed = layout;
                    return;
                }
                if (
                    !shallowEqual(layout, committed) &&
                    commitsGroup(event, group)
                ) {
                    committed = layout;
                    this.layoutCommit.emit(layout);
                }
            }),
        );

        const orientation = this.context.orientation();
        const disabled = this.context.disabled();
        const parentPanelId = this.joins ? this.parent?.panelId() : undefined;
        this.parentPanelId = parentPanelId;
        const layout = plainLayout(this.layout());
        const commands: BatchEntry[] = [
            {
                command: "group.add",
                payload: {
                    id: groupId,
                    orientation,
                    disabled,
                    ...(parentPanelId === undefined ? {} : { parentPanelId }),
                },
            },
            ...registry.takeQueue().map(
                (payload): BatchEntry => ({
                    command: "panel.add",
                    payload,
                }),
            ),
        ];
        // a saved layout of the group wins over defaultLayout, a controlled layout over both
        const initial =
            layout ??
            (hasPending(model, groupId)
                ? undefined
                : plainLayout(this.defaultLayout()));
        const withLayout: BatchEntry[] = initial
            ? [
                  ...commands,
                  {
                      command: "group.set-layout",
                      payload: { groupId, layout: initial },
                  },
              ]
            : commands;
        const result = model.run(
            "batch",
            {
                commands: model.can("batch", { commands: withLayout })
                    ? withLayout
                    : commands,
            },
            ADAPTER_RUN,
        );
        registry.setRegistered(result.ok);
        if (!result.ok) {
            console.error(
                `[splitterGroup] "${groupId}" did not register: ${result.error.message}`,
            );
        }
        this.sent = { orientation, disabled, ...(layout ? { layout } : {}) };
        engine.adapter.syncOrder(groupId);
        registry.sync();
        // a panel added, removed or moved changes the separators
        this.stops.push(
            model.subscribe(({ before, after }) => {
                const prev = Object.hasOwn(before.groups, groupId)
                    ? before.groups[groupId]?.panelIds
                    : undefined;
                const next = Object.hasOwn(after.groups, groupId)
                    ? after.groups[groupId]?.panelIds
                    : undefined;
                if (prev !== next) {
                    registry.sync();
                }
            }),
        );
    }

    private unregister(): void {
        this.mounted = false;
        for (const stop of this.stops.splice(0)) {
            stop();
        }
        this.releaseRef?.();
        this.releaseRef = undefined;
        this.heldRef = undefined;
        this.sent = undefined;
        const runtime = this.runtime();
        if (!runtime) {
            return;
        }
        const { model, groupId, registry } = runtime;
        if (registry.registered()) {
            // its panels go with it: a layout the user changed comes back when it is created again
            registry.cancelRemovals();
            model.run(
                "group.remove",
                { groupId, keepLayout: true },
                ADAPTER_RUN,
            );
        }
        registry.setRegistered(false);
        registry.sync();
    }
}
