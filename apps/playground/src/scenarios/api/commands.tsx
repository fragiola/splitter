import {
    type CommandEvent,
    Splitter,
    useSplitter,
    useSplitterRef,
} from "@fragiola/splitter-react";
import { useEffect, useState } from "react";
import { Clickable } from "#/components/atoms/clickable";

// The model's command bus, watched: buttons run commands, and every committed command shows in the
// log with its transient flag, next to the model's JSON document. A drag shows its transient
// steps and its one commit; a refused command shows nothing. Dev-only: styles inline.

const SEPARATOR =
    "w-2 shrink-0 cursor-col-resize bg-palette-line hover:bg-palette-accent data-dragging:bg-palette-accent";

interface Logged {
    id: number;
    command: string;
    transient: boolean;
}

export default function Commands() {
    const splitterRef = useSplitterRef();
    const splitter = useSplitter(splitterRef);
    const [log, setLog] = useState<Logged[]>([]);
    const [json, setJson] = useState("");
    const model = splitter?.model;

    useEffect(() => {
        if (!model) return undefined;
        let next = 0;
        setJson(JSON.stringify(model.get("splitter-json"), null, 2));
        return model.subscribe((event: CommandEvent) => {
            next += 1;
            const entry = {
                id: next,
                command: event.command,
                transient: event.transient,
            };
            setLog((current) => [entry, ...current].slice(0, 40));
            setJson(JSON.stringify(model.get("splitter-json"), null, 2));
        });
    }, [model]);

    return (
        <div className="palette-surface flex h-full flex-col gap-2 bg-palette-base p-2 text-palette-contrast text-sm">
            <div className="flex flex-wrap gap-2">
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        model?.run("panel.resize", {
                            panelId: "left",
                            size: "40%",
                        })
                    }
                >
                    panel.resize left 40%
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        model?.run("panel.collapse", { panelId: "right" })
                    }
                >
                    panel.collapse right
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        model?.run("panel.expand", { panelId: "right" })
                    }
                >
                    panel.expand right
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                        splitter &&
                        model?.run("group.reset", { groupId: splitter.groupId })
                    }
                >
                    group.reset
                </Clickable.Button>
            </div>
            <Splitter.Group
                id="commands"
                splitterRef={splitterRef}
                className="h-40 shrink-0 border border-palette-line"
            >
                <Splitter.Panel id="left" minSize="10%" className="p-2">
                    left
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize left"
                    className={SEPARATOR}
                />
                <Splitter.Panel id="middle" className="p-2">
                    middle
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize middle"
                    className={SEPARATOR}
                />
                <Splitter.Panel
                    id="right"
                    defaultSize="25%"
                    minSize="15%"
                    collapsible
                    className="p-2"
                >
                    right
                </Splitter.Panel>
            </Splitter.Group>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                <ol
                    aria-label="Commands"
                    className="overflow-auto font-mono text-xs"
                >
                    {log.map((entry) => (
                        <li key={entry.id} data-testid="command-name">
                            {entry.command}
                            {entry.transient ? " (transient)" : ""}
                        </li>
                    ))}
                </ol>
                <pre
                    data-testid="splitter-json"
                    className="overflow-auto font-mono text-xs"
                >
                    {json}
                </pre>
            </div>
        </div>
    );
}
