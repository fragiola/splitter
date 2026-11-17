"use client";

import {
    type BatchEntry,
    Splitter,
    type SplitterRef,
    useSplitter,
    useSplitterRef,
    useSplitterState,
} from "@fragiola/splitter-react";
import { useId, useMemo, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";
import { Switch } from "#/components/ui/switch";
import { renderMarkdown } from "./render";
import { SAMPLE } from "./sample";
import * as styles from "./styles";

// An editor beside its live preview. The view buttons outside the group drive it through the
// external ref: Editor and Preview collapse the other pane, Split expands it back to the size it
// had, and the pressed button is read from the model (`useSplitterState`), so a drag that
// collapses a pane presses its button too. The switch changes the group's orientation; the
// layout is in percent, so the panes keep their sizes when they stack.
export default function MarkdownEditor() {
    const splitterRef = useSplitterRef();
    const [text, setText] = useState(SAMPLE);
    const [stacked, setStacked] = useState(false);
    const stackedLabel = useId();
    // escaped by construction (render.ts): the only tags in it are the renderer's own
    const html = useMemo(() => renderMarkdown(text), [text]);
    return (
        <div className={styles.frame}>
            <div role="toolbar" aria-label="View" className={styles.toolbar}>
                <ViewModes splitterRef={splitterRef} />
                <span className={styles.stack}>
                    <Switch.Root
                        aria-labelledby={stackedLabel}
                        checked={stacked}
                        onCheckedChange={setStacked}
                    >
                        <Switch.Thumb />
                    </Switch.Root>
                    <span id={stackedLabel}>Stacked</span>
                </span>
            </div>
            <Splitter.Group
                id="markdown"
                orientation={stacked ? "vertical" : "horizontal"}
                splitterRef={splitterRef}
                className={styles.group}
            >
                <Splitter.Panel
                    id="editor"
                    minSize="20%"
                    collapsible
                    className={styles.side}
                >
                    <section aria-label="Editor" className={styles.pane}>
                        <h2 className={styles.tab}>notes.md</h2>
                        <textarea
                            aria-label="Markdown"
                            spellCheck={false}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className={styles.source}
                        />
                    </section>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize editor"
                    className={styles.separator}
                />
                <Splitter.Panel id="preview" minSize="20%" collapsible>
                    <section aria-label="Preview" className={styles.page}>
                        <h2 className={styles.tab}>Preview</h2>
                        <div
                            data-testid="preview"
                            className={styles.preview}
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: render.ts escapes the source and adds only its own tags
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}

type ViewMode = "editor" | "split" | "preview";

/** The two panes, in the order the batch expands them. */
const PANES = ["editor", "preview"] as const;

type Pane = (typeof PANES)[number];

const MODES: { mode: ViewMode; label: string }[] = [
    { mode: "editor", label: "Editor" },
    { mode: "split", label: "Split" },
    { mode: "preview", label: "Preview" },
];

/** The segmented control: one pressed button, the mode the model is in. */
function ViewModes({ splitterRef }: { splitterRef: SplitterRef }) {
    const splitter = useSplitter(splitterRef);
    // re-renders when a pane collapses or expands, however it happens (a button, a drag, Enter)
    const current =
        useSplitterState(
            ({ model }): ViewMode =>
                model.is("panel-collapsed", { panelId: "editor" })
                    ? "preview"
                    : model.is("panel-collapsed", { panelId: "preview" })
                      ? "editor"
                      : "split",
            { splitterRef },
        ) ?? "split";
    function show(mode: ViewMode) {
        if (!splitter) return;
        const { model } = splitter;
        const shown = (panelId: Pane) => mode === "split" || mode === panelId;
        const collapsed = (panelId: Pane) =>
            model.is("panel-collapsed", { panelId });
        // one atomic step: expand what the mode shows, then collapse what it hides
        const commands: BatchEntry[] = [
            ...PANES.filter((p) => shown(p) && collapsed(p)).map((panelId) => ({
                command: "panel.expand" as const,
                payload: { panelId },
            })),
            ...PANES.filter((p) => !shown(p) && !collapsed(p)).map(
                (panelId) => ({
                    command: "panel.collapse" as const,
                    payload: { panelId },
                }),
            ),
        ];
        if (commands.length > 0) model.run("batch", { commands });
    }
    return (
        <fieldset aria-label="Mode" className={styles.modes}>
            {MODES.map(({ mode, label }) => (
                <Clickable.Button
                    key={mode}
                    size="sm"
                    variant="ghost"
                    aria-pressed={current === mode}
                    onClick={() => show(mode)}
                    className={styles.mode}
                >
                    {label}
                </Clickable.Button>
            ))}
        </fieldset>
    );
}
