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
import * as React from "react";
import { useGroupContext } from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import { panelStyle } from "../utils/panel-style";
import { shallowEqual } from "../utils/shallow-equal";
import { dataAttributes } from "../utils/use-render";
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
    /** its size changed (in percent, and in pixels once measured); `previous` is undefined the first time */
    onResize?:
        | ((size: PanelSize, previous: PanelSize | undefined) => void)
        | undefined;
    /** it collapsed */
    onCollapse?: (() => void) | undefined;
    /** it expanded */
    onExpand?: (() => void) | undefined;
}

/** What a panel shows: its `data-*` attributes and the state its `className`/`style`/`render` get. */
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

export interface UsePanelResult {
    /** what the panel shows as `data-*` */
    state: PanelPartState;
    /**
     * what goes on the panel's element: its DOM `id`, the ref that binds it, its structural style
     * (flex sizing, `overflow: hidden`) and `data-*`
     */
    props: {
        id: string;
        ref: React.RefCallback<HTMLElement>;
        style: React.CSSProperties;
    } & Record<`data-${string}`, string>;
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
 * changed props as `panel.update`, `panel.remove` on unmount; its order comes from its document
 * position) and returns its state and the props of its element.
 */
export function usePanel<T extends SplitterTypes = AnyTypes>(
    options: UsePanelOptions<T> = {},
): UsePanelResult {
    const group = useGroupContext("Splitter.Panel");
    const { model, engine, registry, groupId } = group;
    const generatedId = React.useId();
    const panelId: string = options.id ?? generatedId;
    const latest = React.useRef(options as UsePanelOptions);
    latest.current = options as UsePanelOptions;
    const sent = React.useRef<PanelConstraintFields | undefined>(undefined);

    // the callbacks, from the panel's first size on
    React.useLayoutEffect(() => {
        let size: PanelSize | undefined;
        let collapsed: boolean | undefined;
        const read = () => {
            if (model.get("panel-by", { id: panelId })?.groupId !== groupId) {
                return;
            }
            const next = model.get("panel-size-by", { panelId });
            if (
                next &&
                (next.percentage !== size?.percentage ||
                    next.pixels !== size?.pixels)
            ) {
                const previous = size;
                size = next;
                latest.current.onResize?.(next, previous);
            }
            const now = model.is("panel-collapsed", { panelId });
            if (collapsed !== undefined && now !== collapsed) {
                if (now) {
                    latest.current.onCollapse?.();
                } else {
                    latest.current.onExpand?.();
                }
            }
            collapsed = now;
        };
        return model.subscribe(read);
    }, [model, panelId, groupId]);

    React.useLayoutEffect(() => {
        const constraints = constraintsOf(latest.current);
        registry.addPanel({ id: panelId, groupId, ...constraints });
        sent.current = constraints;
        return () => {
            sent.current = undefined;
            registry.removePanel(panelId);
        };
    }, [registry, panelId, groupId]);

    // props that changed since they were sent
    React.useLayoutEffect(() => {
        const previous = sent.current;
        if (!previous) {
            return;
        }
        const constraints = constraintsOf(options as UsePanelOptions);
        const changes = changesOf(previous, constraints);
        if (!changes) {
            return;
        }
        sent.current = constraints;
        if (!registry.updateQueued({ id: panelId, groupId, ...constraints })) {
            model.run("panel.update", { panelId, ...changes }, ADAPTER_RUN);
        }
    });

    const ref = React.useCallback(
        (element: HTMLElement | null) =>
            element ? engine.adapter.bindPanel(panelId, element) : undefined,
        [engine, panelId],
    );

    const selected = useModelValue(
        model,
        () => {
            const registered =
                model.get("panel-by", { id: panelId })?.groupId === groupId;
            if (!registered) {
                return {
                    size: group.initialSizeOf(panelId),
                    collapsed: false,
                    collapsible: options.collapsible === true,
                    disabled: options.disabled === true,
                    path: undefined,
                };
            }
            return {
                size: model.get("layout-by", { groupId })?.[panelId],
                collapsed: model.is("panel-collapsed", { panelId }),
                collapsible: model.is("panel-collapsible", { panelId }),
                disabled: model.is("panel-disabled", { panelId }),
                path: model.get("panel-path-by", { panelId }),
            };
        },
        shallowEqual,
    );
    const state: PanelPartState = { id: panelId, ...selected };
    return {
        state,
        props: {
            id: panelId,
            ref,
            style: panelStyle(state.size, options.defaultSize),
            ...dataAttributes({
                "splitter-part": "panel",
                "splitter-path": state.path,
                collapsed: state.collapsed,
                collapsible: state.collapsible,
                disabled: state.disabled,
            }),
        },
    };
}
