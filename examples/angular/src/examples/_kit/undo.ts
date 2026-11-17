// Undo and redo for a splitter's model, as app code: the package ships none, so what counts as a
// step is the app's to decide. Copy this file and change it freely.
//
// It is built on two verbs only: `model.subscribe` tells every committed command with the state
// `before` and `after` it, and `model.run("batch")` of `group.set-layout` puts every group's layout
// back in one step. States are immutable, so keeping one costs nothing. The kit never imports the
// package: the model is described by the few members this file reads, and the real one fits.

/** A group's layout: each panel's size in percent, by panel id. */
export type LayoutLike = Readonly<Record<string, number>>;

/** The part of the model's state the history keeps: every group's layout. */
export interface StateLike {
    readonly groups: Readonly<Record<string, { readonly layout: LayoutLike }>>;
}

/**
 * What `model.subscribe` tells: the command, the state around it, whether it was a step of a
 * gesture, and its `meta` (`source: "adapter"` on what the adapter runs for the markup).
 */
export interface CommandEventLike {
    readonly command: string;
    readonly before: StateLike;
    readonly after: StateLike;
    readonly transient: boolean;
    readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

/** The members of a splitter model the history uses (`useSplitter().model` fits). */
export interface HistoryModel {
    subscribe(listener: (event: CommandEventLike) => void): () => void;
    get(key: "state"): StateLike;
    run(
        command: "batch",
        payload: {
            commands: {
                command: "group.set-layout";
                payload: { groupId: string; layout: LayoutLike };
            }[];
        },
    ): { readonly ok: boolean };
}

/** The history's state for a render: the same object until it changes. */
export interface UndoSnapshot {
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** the commands undo goes back through, oldest first: the last one is undone next */
    readonly undoSteps: readonly string[];
    /** the commands redo goes forward through, the next one last */
    readonly redoSteps: readonly string[];
}

/** Options for {@link createUndoHistory}. */
export interface UndoOptions {
    /** the steps kept, oldest dropped first (default 100) */
    readonly limit?: number;
}

/** A history over one model: undo, redo, and a snapshot to render. */
export interface UndoHistory {
    /** puts back every layout as it was before the last step; says whether it could */
    undo(): boolean;
    /** applies again the last step undone; says whether it could */
    redo(): boolean;
    /** the current snapshot (bound: `useSyncExternalStore(history.subscribe, history.getSnapshot)`) */
    getSnapshot(): UndoSnapshot;
    /** calls `listener` when the snapshot changes; returns the remover (bound) */
    subscribe(listener: () => void): () => void;
    /** stops listening to the model */
    dispose(): void;
}

type Layouts = Readonly<Record<string, LayoutLike>>;

interface Entry {
    readonly command: string;
    readonly before: Layouts;
    readonly after: Layouts;
}

function layoutsOf(state: StateLike): Layouts {
    return Object.fromEntries(
        Object.entries(state.groups).map(([id, group]) => [id, group.layout]),
    );
}

function sameLayout(a: LayoutLike | undefined, b: LayoutLike | undefined) {
    if (a === b) return true;
    if (!a || !b) return false;
    const keys = Object.keys(a);
    return (
        keys.length === Object.keys(b).length &&
        keys.every((key) => a[key] === b[key])
    );
}

function sameLayouts(a: Layouts, b: Layouts) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => sameLayout(a[key], b[key]));
}

/**
 * Undo and redo for a splitter's model. Every committed command that changes a layout is one
 * step: a whole drag (its steps are transient, and only its release is committed), a key press, a
 * collapse, a button's command. What the adapter runs for the markup (a group or a panel
 * mounting, a prop that changed) carries `meta.source: "adapter"` and is not a step. Undo puts back the layouts from before the step, redo those after it, each in
 * one `batch` of `group.set-layout`; the history does not record its own restores.
 *
 * ```ts
 * const history = createUndoHistory(model);
 * history.undo();
 * history.dispose();
 * ```
 */
export function createUndoHistory(
    model: HistoryModel,
    options: UndoOptions = {},
): UndoHistory {
    const limit = options.limit ?? 100;
    let done: Entry[] = [];
    let undone: Entry[] = [];
    /** the layouts as last committed: what a drag started from */
    let settled = layoutsOf(model.get("state"));
    /** an undo or a redo is running: what it commits is not a step */
    let restoring = false;
    const listeners = new Set<() => void>();
    let snapshot = snapshotOf();

    function snapshotOf(): UndoSnapshot {
        return {
            canUndo: done.length > 0,
            canRedo: undone.length > 0,
            undoSteps: done.map((entry) => entry.command),
            redoSteps: undone.map((entry) => entry.command),
        };
    }

    function changed() {
        snapshot = snapshotOf();
        for (const listener of [...listeners]) listener();
    }

    const stop = model.subscribe((event) => {
        const after = layoutsOf(event.after);
        // a drag's steps are previews: the step is its release, measured from where it started
        if (
            restoring ||
            (event.transient && event.command === "separator.move")
        )
            return;
        const before = settled;
        settled = after;
        // a panel mounting or a prop changing is the markup's, not the user's
        if (event.transient || event.meta?.source === "adapter") return;
        if (sameLayouts(before, after)) return;
        done = [...done, { command: event.command, before, after }].slice(
            limit > 0 ? -limit : Number.POSITIVE_INFINITY,
        );
        undone = [];
        changed();
    });

    /** Puts `layouts` back, for the groups still registered whose layout differs. */
    function restore(layouts: Layouts): boolean {
        const current = layoutsOf(model.get("state"));
        const commands = Object.entries(layouts)
            .filter(
                ([groupId, layout]) =>
                    current[groupId] !== undefined &&
                    !sameLayout(current[groupId], layout),
            )
            .map(([groupId, layout]) => ({
                command: "group.set-layout" as const,
                payload: { groupId, layout },
            }));
        restoring = true;
        try {
            const ok = model.run("batch", { commands }).ok;
            settled = layoutsOf(model.get("state"));
            return ok;
        } finally {
            restoring = false;
        }
    }

    return {
        undo() {
            const entry = done.at(-1);
            // refused (a middleware vetoed it): the step stays
            if (!entry || !restore(entry.before)) return false;
            done = done.slice(0, -1);
            undone = [...undone, entry];
            changed();
            return true;
        },
        redo() {
            const entry = undone.at(-1);
            if (!entry || !restore(entry.after)) return false;
            undone = undone.slice(0, -1);
            done = [...done, entry];
            changed();
            return true;
        },
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispose: stop,
    };
}

/** What {@link undoKey} reads of a key event: a DOM `KeyboardEvent`, or React's. */
type UndoKeyEvent = Pick<
    KeyboardEvent,
    "key" | "ctrlKey" | "metaKey" | "shiftKey" | "target"
>;

/**
 * The history shortcut a key event means: Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z and Ctrl/Cmd+Y
 * redo. `undefined` for any other key, and inside a text field, which keeps its own undo.
 */
export function undoKey(event: UndoKeyEvent): "undo" | "redo" | undefined {
    if (!(event.ctrlKey || event.metaKey)) return undefined;
    const target = event.target;
    if (
        target !== null &&
        "closest" in target &&
        typeof target.closest === "function" &&
        target.closest("input, textarea, select, [contenteditable]") !== null
    ) {
        return undefined;
    }
    const key = event.key.toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y") return "redo";
    return undefined;
}
