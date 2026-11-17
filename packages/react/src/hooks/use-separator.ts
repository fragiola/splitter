import type { SeparatorAria } from "@fragiola/splitter";
import * as React from "react";
import { useGroupContext } from "../context";
import { shallowEqual } from "../utils/shallow-equal";
import { dataAttributes } from "../utils/use-render";
import { useEngineValue, useModelValue } from "./internal";

/** A separator's declaration. */
export interface UseSeparatorOptions {
    /** it cannot be used to resize its panels (they may still resize through other separators) */
    disabled?: boolean | undefined;
    /** a double click resets its panel to its default size (default true) */
    resetOnDoubleClick?: boolean | undefined;
}

/** What a separator shows: its `data-*` attributes and the state its `className`/`style`/`render` get. */
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

export interface UseSeparatorResult {
    /** what the separator shows as `data-*` */
    state: SeparatorPartState;
    /**
     * what goes on the separator's element: the ref that binds it (the engine listens to its
     * pointer, keyboard and double click events), `role="separator"` and its Window Splitter ARIA
     * values, `tabIndex` (none while disabled), its structural style and `data-*`
     */
    props: {
        ref: React.RefCallback<HTMLElement>;
        role: "separator";
        tabIndex: 0 | undefined;
        style: React.CSSProperties;
    } & Partial<Omit<SeparatorAria, "role">> &
        Record<`data-${string}`, string>;
}

/**
 * The lower layer of `Splitter.Separator`: binds a separator element of the enclosing group (its
 * props become `separator.update`) and returns its state and the props of its element.
 */
export function useSeparator(
    options: UseSeparatorOptions = {},
): UseSeparatorResult {
    const { model, engine, registry } = useGroupContext("Splitter.Separator");
    const [token] = React.useState(() => ({}));
    const separatorId = React.useSyncExternalStore(
        registry.subscribe,
        () => registry.separatorId(token),
        () => undefined,
    );
    const ref = React.useCallback(
        (element: HTMLElement | null) => {
            registry.setSeparator(token, element);
            return () => registry.setSeparator(token, null);
        },
        [registry, token],
    );

    const { disabled, resetOnDoubleClick } = options;
    React.useLayoutEffect(() => {
        if (
            separatorId === undefined ||
            (disabled === undefined && resetOnDoubleClick === undefined)
        ) {
            return;
        }
        model.run("separator.update", {
            separatorId,
            ...(disabled === undefined ? {} : { disabled }),
            ...(resetOnDoubleClick === undefined ? {} : { resetOnDoubleClick }),
        });
    }, [model, separatorId, disabled, resetOnDoubleClick]);

    const selected = useModelValue(
        model,
        () => {
            const aria =
                separatorId === undefined
                    ? undefined
                    : engine.get("separator-aria-by", { separatorId });
            if (!aria || separatorId === undefined) {
                return { disabled: disabled === true };
            }
            return {
                ...aria,
                disabled: model.is("separator-disabled", { separatorId }),
                path: model.get("separator-path-by", { separatorId }),
            };
        },
        shallowEqual,
    );
    const dragging = useEngineValue(
        engine,
        () =>
            separatorId !== undefined &&
            engine.is("separator-dragging", { separatorId }),
    );
    const {
        disabled: off,
        path,
        ...aria
    } = selected as typeof selected &
        Partial<SeparatorAria> & { path?: string | undefined };
    const state: SeparatorPartState = {
        id: separatorId,
        orientation: aria["aria-orientation"],
        disabled: off,
        dragging,
        path,
    };
    return {
        state,
        props: {
            ...aria,
            ref,
            role: "separator",
            tabIndex: off ? undefined : 0,
            style: { flexGrow: 0, flexShrink: 0, touchAction: "none" },
            ...dataAttributes({
                "splitter-part": "separator",
                "splitter-path": state.path,
                orientation: state.orientation,
                disabled: state.disabled,
                dragging: state.dragging,
            }),
        },
    };
}
