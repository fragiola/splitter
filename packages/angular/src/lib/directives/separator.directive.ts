import {
    computed,
    Directive,
    effect,
    input,
    type OnInit,
    type Signal,
    signal,
    untracked,
} from "@angular/core";
import type { SeparatorAria } from "@fragiola/splitter";
import {
    type GroupRuntime,
    injectGroupContext,
    requireRuntime,
} from "../context";
import { ADAPTER_RUN } from "../utils/adapter-run";
import {
    bindStructuralStyle,
    dataAttr,
    injectHost,
    onDestroy,
    optionalBoolean,
} from "../utils/helpers";
import { shallowEqual } from "../utils/shallow-equal";
import { fromStore } from "../utils/signals";

/** What a separator shows: its `data-*` attributes, and the state a template reads (`s.state()`). */
export interface SeparatorPartState {
    /**
     * its id, `<beforePanelId>:<afterPanelId>`: the n-th separator element of a group, in document
     * order, is the separator after its n-th panel. Undefined until its group registers, or when
     * the group has fewer separators than separator elements
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

type Selected = { disabled: boolean; path?: string | undefined } & Partial<
    Omit<SeparatorAria, "role">
>;

/**
 * The separator between two neighbouring panels (`role="separator"`, Window Splitter):
 * `<div splitterSeparator aria-label="Resize"></div>`. Drag it with the pointer, or focus it and
 * use the arrows, Home, End and Enter; double click it to reset its panel. Place one between each
 * pair of panels: the n-th separator of a group, in document order, is the one after its n-th
 * panel. It has no name of its own: give it an `aria-label`. The engine listens to its element in
 * the capture phase, so the element's own `(keydown)`, `(pointerdown)`, … run after the engine's.
 */
@Directive({
    selector: "[splitterSeparator]",
    exportAs: "splitterSeparator",
    host: {
        role: "separator",
        "[attr.tabindex]": "selected().disabled ? null : 0",
        "[attr.aria-orientation]": 'selected()["aria-orientation"] ?? null',
        "[attr.aria-valuenow]": 'selected()["aria-valuenow"] ?? null',
        "[attr.aria-valuemin]": 'selected()["aria-valuemin"] ?? null',
        "[attr.aria-valuemax]": 'selected()["aria-valuemax"] ?? null',
        "[attr.aria-controls]": 'selected()["aria-controls"] ?? null',
        "[attr.aria-disabled]": 'selected()["aria-disabled"] ?? null',
        "[attr.data-splitter-part]": '"separator"',
        "[attr.data-splitter-path]": "state().path ?? null",
        "[attr.data-orientation]": "state().orientation ?? null",
        "[attr.data-disabled]": "data(state().disabled)",
        "[attr.data-dragging]": "data(state().dragging)",
    },
})
export class SplitterSeparator implements OnInit {
    /** it cannot be used to resize its panels (they may still resize through other separators) */
    readonly disabled = input(undefined, { transform: optionalBoolean });
    /** a double click resets its panel to its default size (default true) */
    readonly resetOnDoubleClick = input(undefined, {
        transform: optionalBoolean,
    });

    private readonly group = injectGroupContext("[splitterSeparator]");
    private readonly host = injectHost();
    private readonly runtime = signal<GroupRuntime | null>(null);
    /** what the registry knows this separator by */
    private readonly token = {};

    private readonly separatorId: Signal<string | undefined> = fromStore(
        () => this.runtime()?.registry.subscribe,
        () => this.runtime()?.registry.separatorId(this.token),
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
    private readonly dragging = fromStore(
        () => {
            const engine = this.runtime()?.engine;
            return engine
                ? (listener) => engine.subscribe(() => listener())
                : undefined;
        },
        () => {
            const engine = this.runtime()?.engine;
            const id = this.separatorId();
            return (
                engine !== undefined &&
                id !== undefined &&
                engine.is("separator-dragging", { separatorId: id })
            );
        },
    );

    /** its ARIA values from the engine, its disabled state and its path */
    protected readonly selected: Signal<Selected> = computed(
        () => {
            const runtime = this.runtime();
            const id = this.separatorId();
            this.modelState();
            const aria =
                runtime && id !== undefined
                    ? runtime.engine.get("separator-aria-by", {
                          separatorId: id,
                      })
                    : undefined;
            if (!runtime || !aria || id === undefined) {
                return { disabled: this.disabled() === true };
            }
            const { role: _role, ...values } = aria;
            return {
                ...values,
                disabled: runtime.model.is("separator-disabled", {
                    separatorId: id,
                }),
                path: runtime.model.get("separator-path-by", {
                    separatorId: id,
                }),
            };
        },
        { equal: shallowEqual },
    );

    /** what the separator shows as `data-*` (`#s="splitterSeparator"`, `s.state()`) */
    readonly state: Signal<SeparatorPartState> = computed(
        () => {
            const selected = this.selected();
            return {
                id: this.separatorId(),
                orientation: selected["aria-orientation"],
                disabled: selected.disabled,
                dragging: this.dragging(),
                path: selected.path,
            };
        },
        { equal: shallowEqual },
    );

    protected readonly data = dataAttr;

    /**
     * what was sent for the current separator id: only the changes are sent, and an input going
     * back to undefined sends its default
     */
    private sent: {
        separatorId: string | undefined;
        disabled?: boolean;
        resetOnDoubleClick?: boolean;
    } = { separatorId: undefined };

    constructor() {
        bindStructuralStyle(this.host, () => ({
            flexGrow: 0,
            flexShrink: 0,
            touchAction: "none",
        }));

        effect(() => {
            const id = this.separatorId();
            const disabled = this.disabled();
            const resetOnDoubleClick = this.resetOnDoubleClick();
            untracked(() => this.send(id, disabled, resetOnDoubleClick));
        });

        onDestroy(() => {
            this.runtime()?.registry.setSeparator(this.token, null);
        });
    }

    ngOnInit(): void {
        const runtime = requireRuntime(this.group, "[splitterSeparator]");
        this.runtime.set(runtime);
        runtime.registry.setSeparator(this.token, this.host);
    }

    private send(
        id: string | undefined,
        disabled: boolean | undefined,
        resetOnDoubleClick: boolean | undefined,
    ): void {
        const runtime = this.runtime();
        if (this.sent.separatorId !== id) {
            this.sent = { separatorId: id };
        }
        if (id === undefined || !runtime) {
            return;
        }
        const previous = this.sent;
        const nextDisabled =
            disabled ?? (previous.disabled === undefined ? undefined : false);
        const nextReset =
            resetOnDoubleClick ??
            (previous.resetOnDoubleClick === undefined ? undefined : true);
        if (
            nextDisabled === previous.disabled &&
            nextReset === previous.resetOnDoubleClick
        ) {
            return;
        }
        this.sent = {
            separatorId: id,
            ...(disabled === undefined ? {} : { disabled }),
            ...(resetOnDoubleClick === undefined ? {} : { resetOnDoubleClick }),
        };
        runtime.model.run(
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
    }
}
