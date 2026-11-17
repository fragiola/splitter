import type { SeparatorAria } from "@fragiola/splitter";
import {
    type ComputedRef,
    type CSSProperties,
    computed,
    type MaybeRefOrGetter,
    toValue,
    watch,
} from "vue";
import { useGroupContext } from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import {
    dataAttributes,
    type ElementRef,
    elementRef,
    useExternal,
} from "../utils/render";
import { shallowEqual } from "../utils/shallow-equal";
import { useEngineValue, useModelValue } from "./internal";

/** A separator's declaration. */
export interface UseSeparatorOptions {
    /** it cannot be used to resize its panels (they may still resize through other separators) */
    disabled?: boolean | undefined;
    /** a double click resets its panel to its default size (default true) */
    resetOnDoubleClick?: boolean | undefined;
}

/** What a separator shows: its `data-*` attributes and the state its `render` slot gets. */
export interface SeparatorPartState {
    /**
     * its id, `<beforePanelId>:<afterPanelId>`: the n-th separator element of a group, in document
     * order, is the separator after its n-th panel. Undefined until it mounts, or when the group has
     * fewer separators than separator elements
     */
    id: string | undefined;
    /** its own orientation, as its `aria-orientation`: `vertical` between side by side panels */
    orientation: "horizontal" | "vertical" | undefined;
    /** it cannot be used: it, or its group, is disabled */
    disabled: boolean;
    /** a pointer is dragging it */
    dragging: boolean;
    /** its path from the root group (`/g0/s0`); undefined while it has no id */
    path: string | undefined;
}

/** What goes on a separator's element. */
export type SeparatorElementProps = {
    /** the template ref that binds the element (the engine listens to its events) */
    ref: ElementRef;
    role: "separator";
    /** 0, none while disabled */
    tabindex: 0 | undefined;
    /** its structural style: no flex sizing, `touch-action: none` */
    style: CSSProperties;
} & Partial<Omit<SeparatorAria, "role">> &
    Record<`data-${string}`, string>;

export interface UseSeparatorResult {
    /** what the separator shows as `data-*` */
    state: ComputedRef<SeparatorPartState>;
    /**
     * what goes on the separator's element (`v-bind`): the ref that binds it (the engine listens to
     * its pointer, keyboard and double click events), `role="separator"` and its Window Splitter
     * ARIA values, `tabindex` (none while disabled), its structural style and `data-*`
     */
    props: ComputedRef<SeparatorElementProps>;
}

/**
 * The lower layer of `Splitter.Separator`: binds a separator element of the enclosing group (its
 * options become `separator.update`) and returns its state and the props of its element. Pass the
 * options as a getter (`() => props`) or a ref so that changes reach the model.
 */
export function useSeparator(
    options: MaybeRefOrGetter<UseSeparatorOptions> = {},
): UseSeparatorResult {
    const { model, engine, registry } = useGroupContext("Splitter.Separator");
    const token = {};
    const separatorId = useExternal(
        () => registry.subscribe,
        () => registry.separatorId(token),
    );
    const ref = elementRef((element) => {
        registry.setSeparator(token, element);
        return () => registry.setSeparator(token, null);
    });

    // what was sent for the current separator id: only the changes are sent, and an option going
    // back to undefined sends its default
    let sent: {
        separatorId: string | undefined;
        disabled?: boolean;
        resetOnDoubleClick?: boolean;
    } = { separatorId: undefined };
    watch(
        () =>
            [
                separatorId.value,
                toValue(options).disabled,
                toValue(options).resetOnDoubleClick,
            ] as const,
        ([id, disabled, resetOnDoubleClick]) => {
            if (sent.separatorId !== id) {
                sent = { separatorId: id };
            }
            if (id === undefined) {
                return;
            }
            const previous = sent;
            const nextDisabled =
                disabled ??
                (previous.disabled === undefined ? undefined : false);
            const nextReset =
                resetOnDoubleClick ??
                (previous.resetOnDoubleClick === undefined ? undefined : true);
            if (
                nextDisabled === previous.disabled &&
                nextReset === previous.resetOnDoubleClick
            ) {
                return;
            }
            sent = {
                separatorId: id,
                ...(disabled === undefined ? {} : { disabled }),
                ...(resetOnDoubleClick === undefined
                    ? {}
                    : { resetOnDoubleClick }),
            };
            model.run(
                "separator.update",
                {
                    separatorId: id,
                    ...(nextDisabled === previous.disabled
                        ? {}
                        : { disabled: nextDisabled }),
                    ...(nextReset === previous.resetOnDoubleClick
                        ? {}
                        : { resetOnDoubleClick: nextReset }),
                },
                ADAPTER_RUN,
            );
        },
        { flush: "post" },
    );

    const selected = useModelValue(
        model,
        (): {
            disabled: boolean;
            path?: string | undefined;
        } & Partial<SeparatorAria> => {
            const id = separatorId.value;
            const aria =
                id === undefined
                    ? undefined
                    : engine.get("separator-aria-by", { separatorId: id });
            if (!aria || id === undefined) {
                return { disabled: toValue(options).disabled === true };
            }
            return {
                ...aria,
                disabled: model.is("separator-disabled", { separatorId: id }),
                path: model.get("separator-path-by", { separatorId: id }),
            };
        },
        shallowEqual,
    );
    const dragging = useEngineValue(engine, () => {
        const id = separatorId.value;
        return (
            id !== undefined &&
            engine.is("separator-dragging", { separatorId: id })
        );
    });
    const state = computed<SeparatorPartState>(() => ({
        id: separatorId.value,
        orientation: selected.value["aria-orientation"],
        disabled: selected.value.disabled,
        dragging: dragging.value,
        path: selected.value.path,
    }));
    const props = computed<SeparatorElementProps>(() => {
        const { disabled: off, path, role: _role, ...aria } = selected.value;
        const current = state.value;
        return {
            ...aria,
            ref,
            role: "separator",
            tabindex: off ? undefined : 0,
            style: { flexGrow: 0, flexShrink: 0, touchAction: "none" },
            ...dataAttributes({
                "splitter-part": "separator",
                "splitter-path": path,
                orientation: current.orientation,
                disabled: current.disabled,
                dragging: current.dragging,
            }),
        };
    });
    return { state, props };
}
