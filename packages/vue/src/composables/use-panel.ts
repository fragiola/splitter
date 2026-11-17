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
    type ComputedRef,
    type CSSProperties,
    computed,
    type MaybeRefOrGetter,
    onBeforeUnmount,
    onMounted,
    toValue,
    useId,
    watch,
} from "vue";
import { useGroupContext } from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import { panelStyle } from "../utils/panel-style";
import { dataAttributes, type ElementRef, elementRef } from "../utils/render";
import { shallowEqual } from "../utils/shallow-equal";
import { useModelValue } from "./internal";

/** A panel's declaration: its id, its constraints and its callbacks. */
export interface UsePanelOptions<T extends SplitterTypes = AnyTypes> {
    /**
     * the panel's id, as the saved layout names it, and its element's DOM `id` (the separators'
     * `aria-controls`); default: a generated one, stable across server and client
     */
    id?: PanelIdOf<T> | undefined;
    /** the smallest size the panel takes when expanded (a number is pixels, `"30"` is percent) */
    minSize?: SizeValue | undefined;
    /** the largest size the panel takes */
    maxSize?: SizeValue | undefined;
    /** the size it starts with when no saved or given layout has one */
    defaultSize?: SizeValue | undefined;
    /** it can collapse below its minimum to its collapsed size */
    collapsible?: boolean | undefined;
    /** its size collapsed (default 0) */
    collapsedSize?: SizeValue | undefined;
    /** how far past its minimum a drag goes before it collapses (default: halfway) */
    collapsedThreshold?: SizeValue | undefined;
    /** no separator resizes it (code still can) */
    disabled?: boolean | undefined;
    /** how it behaves when its group resizes (default `preserve-relative-size`) */
    groupResizeBehavior?: GroupResizeBehavior | undefined;
    /**
     * its size changed (in percent, and in pixels once measured); `previous` is undefined the
     * first time (`@resize`)
     */
    onResize?:
        | ((size: PanelSize, previous: PanelSize | undefined) => void)
        | undefined;
    /** it collapsed (`@collapse`) */
    onCollapse?: (() => void) | undefined;
    /** it expanded (`@expand`) */
    onExpand?: (() => void) | undefined;
}

/** What a panel shows: its `data-*` attributes and the state its `render` slot gets. */
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

/** What goes on a panel's element. */
export type PanelElementProps = {
    /** its DOM `id`: the panel id */
    id: string;
    /** the template ref that binds the element */
    ref: ElementRef;
    /** its structural style: flex sizing, `overflow: hidden` */
    style: CSSProperties;
} & Record<`data-${string}`, string>;

export interface UsePanelResult {
    /** what the panel shows as `data-*` */
    state: ComputedRef<PanelPartState>;
    /**
     * what goes on the panel's element (`v-bind`): its DOM `id`, the ref that binds it, its
     * structural style (flex sizing, `overflow: hidden`) and `data-*`
     */
    props: ComputedRef<PanelElementProps>;
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

/** The constraints a panel declares (only those given). */
function constraintsOf(options: UsePanelOptions): PanelConstraintFields {
    const fields: Record<string, unknown> = {};
    for (const key of CONSTRAINTS) {
        if (options[key] !== undefined) {
            fields[key] = options[key];
        }
    }
    return fields as PanelConstraintFields;
}

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

/**
 * The lower layer of `Splitter.Panel`: registers a panel in the enclosing group (`panel.add`, its
 * changed options as `panel.update`, `panel.remove` before unmount; its order comes from its
 * document position) and returns its state and the props of its element. Pass the options as a
 * getter (`() => props`) or a ref so that changes reach the model.
 */
export function usePanel<T extends SplitterTypes = AnyTypes>(
    options: MaybeRefOrGetter<UsePanelOptions<T>> = {},
): UsePanelResult {
    const group = useGroupContext("Splitter.Panel");
    const { model, engine, registry, groupId } = group;
    const generatedId = useId();
    const read = (): UsePanelOptions =>
        toValue(options) as unknown as UsePanelOptions;
    const panelId = (): string => read().id ?? generatedId;

    // the id the panel is registered with, and the constraints last sent for it
    let registered: string | undefined;
    let sent: PanelConstraintFields | undefined;
    let stop: (() => void) | undefined;

    const register = (id: string) => {
        const constraints = constraintsOf(read());
        registry.addPanel({ id, groupId, ...constraints });
        registered = id;
        sent = constraints;
    };
    const unregister = () => {
        if (registered !== undefined) {
            registry.removePanel(registered);
        }
        registered = undefined;
        sent = undefined;
    };

    onMounted(() => {
        // the callbacks, from the panel's first size on
        let size: PanelSize | undefined;
        let collapsed: boolean | undefined;
        let of: string | undefined;
        stop = model.subscribe(() => {
            const id = panelId();
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
                read().onResize?.(next, previous);
            }
            const now = model.is("panel-collapsed", { panelId: id });
            if (collapsed !== undefined && now !== collapsed) {
                if (now) {
                    read().onCollapse?.();
                } else {
                    read().onExpand?.();
                }
            }
            collapsed = now;
        });
        register(panelId());
    });

    onBeforeUnmount(() => {
        stop?.();
        stop = undefined;
        unregister();
    });

    // a new id registers the panel again
    watch(
        panelId,
        (id) => {
            if (registered !== undefined && id !== registered) {
                unregister();
                register(id);
            }
        },
        { flush: "post" },
    );

    // constraints that changed since they were sent
    watch(
        () => constraintsOf(read()),
        (constraints) => {
            if (!sent || registered === undefined) {
                return;
            }
            const changes = changesOf(sent, constraints);
            if (!changes) {
                return;
            }
            sent = constraints;
            if (
                !registry.updateQueued({
                    id: registered,
                    groupId,
                    ...constraints,
                })
            ) {
                model.run(
                    "panel.update",
                    { panelId: registered, ...changes },
                    ADAPTER_RUN,
                );
            }
        },
        { flush: "post" },
    );

    const ref = elementRef(
        (element) => engine.adapter.bindPanel(panelId(), element),
        () => [panelId()],
    );

    const selected = useModelValue(
        model,
        () => {
            const id = panelId();
            const isRegistered =
                model.get("panel-by", { id })?.groupId === groupId;
            if (!isRegistered) {
                return {
                    size: group.initialSizeOf(id),
                    collapsed: false,
                    collapsible: read().collapsible === true,
                    disabled: read().disabled === true,
                    path: undefined,
                };
            }
            return {
                size: model.get("layout-by", { groupId })?.[id],
                collapsed: model.is("panel-collapsed", { panelId: id }),
                collapsible: model.is("panel-collapsible", { panelId: id }),
                disabled: model.is("panel-disabled", { panelId: id }),
                path: model.get("panel-path-by", { panelId: id }),
            };
        },
        shallowEqual,
    );
    const state = computed<PanelPartState>(() => ({
        id: panelId(),
        ...selected.value,
    }));
    const props = computed<PanelElementProps>(() => {
        const current = state.value;
        return {
            id: current.id,
            ref,
            style: panelStyle(current.size, read().defaultSize),
            ...dataAttributes({
                "splitter-part": "panel",
                "splitter-path": current.path,
                collapsed: current.collapsed,
                collapsible: current.collapsible,
                disabled: current.disabled,
            }),
        };
    });
    return { state, props };
}
