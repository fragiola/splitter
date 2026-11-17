"use client";

import {
    Splitter,
    type SplitterContextValue,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
} from "@fragiola/splitter-react";
import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Clickable } from "#/components/atoms/clickable";
import {
    createUndoHistory,
    type UndoHistory,
    type UndoSnapshot,
    undoKey,
} from "../_kit/undo";
import * as styles from "./styles";

const VERBS: Record<string, string> = {
    "separator.move": "Move a separator",
    "panel.resize": "Resize a panel",
    "panel.collapse": "Collapse a panel",
    "panel.expand": "Expand a panel",
    "group.set-layout": "Set a layout",
    "group.reset": "Reset a layout",
};

// Undo and redo are the app's, in `_kit/undo.ts`: it listens to the model (`model.subscribe`) and
// keeps every group's layout before and after each committed change; undo and redo put them back
// in one `batch`. A whole drag is one step, so is a key press or a collapse. Ctrl/Cmd+Z undoes,
// Shift+Ctrl/Cmd+Z redoes.
export default function UndoRedo() {
    const splitterRef = useSplitterRef();
    return (
        <div className={styles.frame}>
            <Toolbar splitterRef={splitterRef} />
            <Splitter.Group splitterRef={splitterRef} className={styles.group}>
                <Splitter.Panel
                    id="outline"
                    defaultSize="25%"
                    minSize="15%"
                    collapsible
                >
                    <section aria-label="Outline" className={styles.panel}>
                        <h2 className={styles.title}>Outline</h2>
                        <p className={styles.text}>Collapsible.</p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize outline"
                    className={styles.separator}
                />
                <Splitter.Panel id="draft" minSize="30%">
                    <section aria-label="Draft" className={styles.panel}>
                        <h2 className={styles.title}>Draft</h2>
                        <p className={styles.text}>
                            Drag, press keys on a separator, then undo.
                        </p>
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize draft"
                    className={styles.separator}
                />
                <Splitter.Panel id="notes" defaultSize="25%" minSize="10%">
                    <section aria-label="Notes" className={styles.panel}>
                        <h2 className={styles.title}>Notes</h2>
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

const EMPTY: UndoSnapshot = {
    canUndo: false,
    canRedo: false,
    undoSteps: [],
    redoSteps: [],
};
const noSubscription = () => () => {};
const emptySnapshot = () => EMPTY;

/** The splitter's history: made once its group holds the ref, dropped with it. */
function useUndoHistory(splitter: SplitterContextValue | null) {
    const [history, setHistory] = useState<UndoHistory>();
    const model = splitter?.model;
    useEffect(() => {
        if (!model) return undefined;
        const made = createUndoHistory(model);
        setHistory(made);
        return () => {
            made.dispose();
            setHistory(undefined);
        };
    }, [model]);
    const snapshot = useSyncExternalStore(
        history?.subscribe ?? noSubscription,
        history?.getSnapshot ?? emptySnapshot,
        emptySnapshot,
    );
    return { history, snapshot };
}

/** Undo, redo, and the steps they go through. */
function Toolbar({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    const { history, snapshot } = useUndoHistory(splitter);

    // the shortcuts, page-wide; never in the middle of a drag (its steps are not committed)
    useEffect(() => {
        if (!history || !splitter) return undefined;
        const { engine } = splitter;
        const onKeyDown = (event: KeyboardEvent) => {
            const action = undoKey(event);
            if (!action || engine.get("dragging-separator-id")) return;
            event.preventDefault();
            history[action]();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [history, splitter]);

    const steps = [
        ...snapshot.undoSteps.map((command) => ({ command, undone: false })),
        // undone steps after the done ones, the next to redo first
        ...[...snapshot.redoSteps]
            .reverse()
            .map((command) => ({ command, undone: true })),
    ];
    return (
        <div className={styles.toolbar}>
            <div className={styles.buttons}>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    disabled={!snapshot.canUndo}
                    aria-keyshortcuts="Control+Z Meta+Z"
                    onClick={() => history?.undo()}
                >
                    <Undo2 aria-hidden="true" />
                    Undo
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    disabled={!snapshot.canRedo}
                    aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                    onClick={() => history?.redo()}
                >
                    <Redo2 aria-hidden="true" />
                    Redo
                </Clickable.Button>
            </div>
            <ol aria-label="History" className={styles.history}>
                {steps.length === 0 && (
                    <li className={styles.hint}>
                        Each drag, key press or collapse is a step.
                    </li>
                )}
                {steps.map(({ command, undone }, index) => (
                    <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: steps in order, never reordered
                        key={index}
                        data-undone={undone ? "" : undefined}
                        className={styles.step}
                    >
                        {VERBS[command] ?? command}
                    </li>
                ))}
            </ol>
        </div>
    );
}
