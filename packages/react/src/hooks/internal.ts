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
import * as React from "react";
import { type GroupContextValue, PanelContext } from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import { GroupRegistry } from "../utils/group-registry";
import { shallowEqual } from "../utils/shallow-equal";

/**
 * @internal a value selected from the model, re-rendering the component only when the selection
 * changes (`isEqual`, `Object.is` by default). The selector runs again on every state and every
 * render (it may close over props); a selection equal to the last one keeps the last object.
 */
export function useModelValue<S>(
    model: SplitterModel,
    select: () => S,
    isEqual: (a: S, b: S) => boolean = Object.is,
): S {
    const latest = React.useRef({ select, isEqual });
    latest.current = { select, isEqual };
    const cache = React.useRef<
        | {
              state: unknown;
              select: () => S;
              value: S;
          }
        | undefined
    >(undefined);
    const subscribe = React.useCallback(
        (onChange: () => void) => model.subscribe(() => onChange()),
        [model],
    );
    const getSnapshot = (): S => {
        const state = model.get("state");
        const previous = cache.current;
        if (
            previous?.state === state &&
            previous.select === latest.current.select
        ) {
            return previous.value;
        }
        const value = latest.current.select();
        const kept =
            previous !== undefined &&
            latest.current.isEqual(previous.value, value)
                ? previous.value
                : value;
        cache.current = { state, select: latest.current.select, value: kept };
        return kept;
    };
    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** @internal a yes/no answer of the engine, re-rendering when a drag starts or ends */
export function useEngineValue(
    engine: SplitterEngine,
    read: () => boolean,
): boolean {
    const subscribe = React.useCallback(
        (onChange: () => void) => engine.subscribe(() => onChange()),
        [engine],
    );
    return React.useSyncExternalStore(subscribe, read, () => false);
}

/** @internal what a `Splitter.Group` is given, besides its element's props */
export interface GroupRootOptions {
    id?: string | undefined;
    orientation: Orientation;
    disabled: boolean;
    model?: SplitterModel | undefined;
    layout?: Layout | undefined;
    defaultLayout?: Layout | undefined;
    onLayoutChange?: ((layout: Readonly<Layout>) => void) | undefined;
    onLayoutCommit?: ((layout: Readonly<Layout>) => void) | undefined;
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
 * (React runs the panels' effects first, so they wait in the registry); props that change later
 * become `group.update` and `group.set-layout`. Every step is undone on unmount, so a StrictMode
 * double mount registers once in the end.
 */
export function useGroupRoot(options: GroupRootOptions): GroupContextValue {
    const parent = React.useContext(PanelContext);
    const generatedId = React.useId();
    const groupId = options.id ?? generatedId;
    const joins =
        parent !== null &&
        (options.model === undefined || options.model === parent.model);
    // creating a model has no side effect: a group that joins its parent's leaves its own unused
    const [ownModel] = React.useState(createSplitterModel);
    const model: SplitterModel = joins
        ? parent.model
        : (options.model ?? ownModel);
    // the engine's options are read once, when the root group mounts
    const [engineOptions] = React.useState(() => ({
        keyboardStep: options.keyboardStep,
        resetOnDoubleClick: options.resetOnDoubleClick,
    }));
    // creating an engine has no side effect either: it listens to the model once a group binds
    const ownEngine = React.useMemo(
        () => (joins ? undefined : createSplitterEngine(model, engineOptions)),
        [joins, model, engineOptions],
    );
    const engine = joins ? parent.engine : (ownEngine as SplitterEngine);
    const parentPanelId = joins ? parent.panelId : undefined;
    const registry = React.useMemo(
        () => new GroupRegistry(model, engine, groupId),
        [model, engine, groupId],
    );
    const latest = React.useRef(options);
    latest.current = options;

    // outside the root, the splitter is reachable once it is mounted, first: the callbacks the
    // effects below may call find it
    const handle = React.useMemo<SplitterHandle>(
        () => ({ model, engine, groupId }),
        [model, engine, groupId],
    );
    const { splitterRef } = options;
    React.useLayoutEffect(
        () =>
            splitterRef && !joins
                ? attachSplitterRef(splitterRef, handle)
                : undefined,
        [splitterRef, handle, joins],
    );

    // onLayoutChange on every commit that changes the layout (drag steps included), onLayoutCommit
    // on every non-transient commit of the user or the app that settles this group's layout on
    // another one than the last committed (the markup's commands, registration included, only
    // move that baseline)
    React.useLayoutEffect(() => {
        let changed: Readonly<Layout> | undefined;
        let committed: Readonly<Layout> | undefined;
        return model.subscribe((event) => {
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
                latest.current.onLayoutChange?.(layout);
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
                latest.current.onLayoutCommit?.(layout);
            }
        });
    }, [model, groupId]);

    // what the group last sent to the model: later renders send only what changed
    const sent = React.useRef<
        | { orientation: Orientation; disabled: boolean; layout?: Layout }
        | undefined
    >(undefined);

    React.useLayoutEffect(() => {
        const { orientation, disabled, layout, defaultLayout } = latest.current;
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
            layout ?? (hasPending(model, groupId) ? undefined : defaultLayout);
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
        sent.current = { orientation, disabled, ...(layout ? { layout } : {}) };
        engine.adapter.syncOrder(groupId);
        registry.sync();
        // a panel added, removed or moved changes the separators
        const stop = model.subscribe(({ before, after }) => {
            const prev = Object.hasOwn(before.groups, groupId)
                ? before.groups[groupId]?.panelIds
                : undefined;
            const next = Object.hasOwn(after.groups, groupId)
                ? after.groups[groupId]?.panelIds
                : undefined;
            if (prev !== next) {
                registry.sync();
            }
        });
        return () => {
            stop();
            sent.current = undefined;
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
        };
    }, [model, engine, registry, groupId, parentPanelId]);

    // props that changed since they were sent
    React.useLayoutEffect(() => {
        const previous = sent.current;
        if (!previous || !registry.registered()) {
            return;
        }
        const { orientation, disabled, layout } = options;
        if (
            orientation !== previous.orientation ||
            disabled !== previous.disabled
        ) {
            model.run(
                "group.update",
                { groupId, orientation, disabled },
                ADAPTER_RUN,
            );
            previous.orientation = orientation;
            previous.disabled = disabled;
        }
        if (layout && !shallowEqual(layout, previous.layout)) {
            // a prop that comes back from onLayoutChange is the model's layout already: setting
            // it again would turn each transient drag step into a commit
            if (!shallowEqual(layout, model.get("layout-by", { groupId }))) {
                model.run("group.set-layout", { groupId, layout }, ADAPTER_RUN);
            }
            previous.layout = layout;
        }
    });

    const initialSizeOf = React.useCallback(
        (panelId: string): number | undefined => {
            const { layout, defaultLayout } = latest.current;
            const pending = model.get("state").pending;
            const saved = Object.hasOwn(pending, groupId)
                ? pending[groupId]?.panels.find(({ id }) => id === panelId)
                      ?.size
                : undefined;
            return layout?.[panelId] ?? saved ?? defaultLayout?.[panelId];
        },
        [model, groupId],
    );

    const { orientation, disabled } = options;
    return React.useMemo(
        () => ({
            model,
            engine,
            groupId,
            registry,
            orientation,
            disabled,
            initialSizeOf,
        }),
        [
            model,
            engine,
            groupId,
            registry,
            orientation,
            disabled,
            initialSizeOf,
        ],
    );
}
