import {
    attachSplitterRef,
    type BatchEntry,
    type CommandEvent,
    createSplitterEngine,
    createSplitterModel,
    type GroupState,
    type Layout,
    type Orientation,
    type SplitterEngine,
    type SplitterHandle,
    type SplitterModel,
    type SplitterRef,
} from "@fragiola/splitter";
import {
    type ComputedRef,
    computed,
    inject,
    onBeforeUnmount,
    onMounted,
    toRaw,
    watch,
} from "vue";
import { type GroupContextValue, PanelKey } from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import { GroupRegistry } from "../utils/group-registry";
import { useExternal } from "../utils/render";
import { shallowEqual } from "../utils/shallow-equal";

/**
 * @internal a value selected from the model, as a computed ref that triggers its readers only when
 * the selection changes (`isEqual`, `Object.is` by default). The selector runs again on every state
 * and whenever a reactive value it reads changes; a selection equal to the last one keeps the last
 * object.
 */
export function useModelValue<S>(
    model: SplitterModel,
    select: () => S,
    isEqual: (a: S, b: S) => boolean = Object.is,
): ComputedRef<S> {
    // the model's state: a new object on every commit
    const state = useExternal(
        () => (listener) => model.subscribe(() => listener()),
        () => model.get("state"),
    );
    let last: { value: S } | undefined;
    return computed(() => {
        state.value;
        const value = select();
        if (last !== undefined && isEqual(last.value, value)) {
            return last.value;
        }
        last = { value };
        return value;
    });
}

/** @internal a yes/no answer of the engine, triggering its readers when a drag starts or ends */
export function useEngineValue(
    engine: SplitterEngine,
    read: () => boolean,
): ComputedRef<boolean> {
    return useExternal(
        () => (listener) => engine.subscribe(() => listener()),
        read,
    );
}

/** @internal a layout the app owns, as a plain object: a reactive proxy never reaches the model */
export function plainLayout(
    layout: Readonly<Layout> | undefined,
): Layout | undefined {
    return layout === undefined ? undefined : { ...toRaw(layout) };
}

/** @internal what a `Splitter.Group` is given, besides its element's props */
export interface GroupRootOptions {
    /** the group's id (a new one remounts the group) */
    id: string;
    orientation: Orientation;
    disabled: boolean;
    /** the model (read once: a new one remounts the group) */
    model?: SplitterModel | undefined;
    layout?: Readonly<Layout> | undefined;
    defaultLayout?: Readonly<Layout> | undefined;
    /** every layout change, drag steps included (`update:layout` and `layout-change`) */
    onLayoutChange: (layout: Readonly<Layout>) => void;
    /** every commit of the user or the app that settles another layout (`layout-commit`) */
    onLayoutCommit: (layout: Readonly<Layout>) => void;
    splitterRef?: SplitterRef | undefined;
    keyboardStep?: number | undefined;
    resetOnDoubleClick?: boolean | undefined;
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
 * @internal a group's model, engine and registration. The outermost group creates the model (unless
 * one is given) and the engine; a group inside a `Splitter.Panel` joins that panel's model and
 * engine and nests in it. The group and the panels that mounted with it register in one `batch`
 * (Vue runs the panels' mounted hooks first, so they wait in the registry); props that change
 * later become `group.update` and `group.set-layout`. Every step is undone before unmount.
 */
export function useGroupRoot(read: () => GroupRootOptions): GroupContextValue {
    const parent = inject(PanelKey, null);
    const first = read();
    const groupId = first.id;
    const given = first.model && toRaw(first.model);
    const joins =
        parent !== null && (given === undefined || given === parent.model);
    const model: SplitterModel = joins
        ? parent.model
        : (given ?? createSplitterModel());
    // the engine's options are read once; creating an engine has no side effect: it listens to
    // the model once a group binds
    const engine = joins
        ? parent.engine
        : createSplitterEngine(model, {
              keyboardStep: first.keyboardStep,
              resetOnDoubleClick: first.resetOnDoubleClick,
          });
    // the panel the group sits in: a new id moves the group in place (`group.update`)
    const parentPanelIdOf = (): string | undefined =>
        joins ? parent.panelId() : undefined;
    let parentPanelId = parentPanelIdOf();
    const registry = new GroupRegistry(model, engine, groupId);
    const handle: SplitterHandle = { model, engine, groupId };

    let mounted = false;
    const stops: (() => void)[] = [];

    // outside the root, the splitter is reachable once it is mounted
    let heldRef: SplitterRef | undefined;
    let releaseRef: (() => void) | undefined;
    const holdRef = () => {
        const splitterRef = read().splitterRef;
        // the ref itself, not a reactive proxy of it: the core knows the ref it made
        const next = !joins && splitterRef ? toRaw(splitterRef) : undefined;
        if (next === heldRef) {
            return;
        }
        releaseRef?.();
        heldRef = next;
        releaseRef = next ? attachSplitterRef(next, handle) : undefined;
    };
    watch(
        () => read().splitterRef,
        () => {
            if (mounted) {
                holdRef();
            }
        },
        { flush: "post" },
    );

    // what the group last sent to the model: later changes send only what changed
    let sent:
        | { orientation: Orientation; disabled: boolean; layout?: Layout }
        | undefined;

    onMounted(() => {
        mounted = true;
        holdRef();

        // layout-change on every commit that changes the layout (drag steps included),
        // layout-commit on every non-transient commit of the user or the app that settles this
        // group's layout on another one than the last committed (the markup's commands,
        // registration included, only move that baseline)
        let changed: Readonly<Layout> | undefined;
        let committed: Readonly<Layout> | undefined;
        stops.push(
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
                    read().onLayoutChange(layout);
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
                    read().onLayoutCommit(layout);
                }
            }),
        );

        const options = read();
        const { orientation, disabled } = options;
        parentPanelId = parentPanelIdOf();
        const layout = plainLayout(options.layout);
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
                : plainLayout(options.defaultLayout));
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
                `Splitter.Group "${groupId}" did not register: ${result.error.message}`,
            );
        }
        sent = { orientation, disabled, ...(layout ? { layout } : {}) };
        engine.adapter.syncOrder(groupId);
        registry.sync();
        // a panel added, removed or moved changes the separators
        stops.push(
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
    });

    onBeforeUnmount(() => {
        mounted = false;
        for (const stop of stops.splice(0)) {
            stop();
        }
        releaseRef?.();
        releaseRef = undefined;
        heldRef = undefined;
        sent = undefined;
        if (registry.registered()) {
            // a layout the user changed comes back when the group mounts again
            model.run(
                "group.remove",
                { groupId, keepLayout: true },
                ADAPTER_RUN,
            );
        }
        registry.setRegistered(false);
        registry.sync();
    });

    // a new parent panel id (the panel the group sits in got another id) moves the group in place,
    // with its panels, its layout and its layout memory: nothing remounts
    watch(
        parentPanelIdOf,
        (next) => {
            if (!sent || !registry.registered() || next === parentPanelId) {
                return;
            }
            parentPanelId = next;
            model.run(
                "group.update",
                { groupId, parentPanelId: next ?? null },
                ADAPTER_RUN,
            );
        },
        { flush: "post" },
    );

    // props that changed since they were sent
    watch(
        () => [read().orientation, read().disabled] as const,
        ([orientation, disabled]) => {
            if (!sent || !registry.registered()) {
                return;
            }
            if (
                orientation !== sent.orientation ||
                disabled !== sent.disabled
            ) {
                model.run(
                    "group.update",
                    { groupId, orientation, disabled },
                    ADAPTER_RUN,
                );
                sent.orientation = orientation;
                sent.disabled = disabled;
            }
        },
        { flush: "post" },
    );
    watch(
        () => read().layout,
        () => {
            const layout = plainLayout(read().layout);
            if (!sent || !registry.registered() || !layout) {
                return;
            }
            if (!shallowEqual(layout, sent.layout)) {
                // a prop that comes back from update:layout is the model's layout already:
                // setting it again would turn each transient drag step into a commit
                if (
                    !shallowEqual(layout, model.get("layout-by", { groupId }))
                ) {
                    model.run(
                        "group.set-layout",
                        { groupId, layout },
                        ADAPTER_RUN,
                    );
                }
                sent.layout = layout;
            }
        },
        { deep: true, flush: "post" },
    );

    const initialSizeOf = (panelId: string): number | undefined => {
        const { layout, defaultLayout } = read();
        const pending = model.get("state").pending;
        const saved = Object.hasOwn(pending, groupId)
            ? pending[groupId]?.panels.find(({ id }) => id === panelId)?.size
            : undefined;
        return layout?.[panelId] ?? saved ?? defaultLayout?.[panelId];
    };

    return {
        model,
        engine,
        groupId,
        registry,
        orientation: () => read().orientation,
        disabled: () => read().disabled,
        initialSizeOf,
    };
}
