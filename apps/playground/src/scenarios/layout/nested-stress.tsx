import { type Orientation, Splitter } from "@fragiola/splitter-react";
import { Fragment } from "react";

// A deep tree under load: groups four levels down, alternating orientation, four panels each with
// tight minimums and one collapsible panel per group: for geometry, nested measuring, many
// separators at once, and hot reload with many panels mounted. Dev-only: styles inline.

const DEPTH = 3;
const PANELS = 4;

const SEPARATOR =
    "shrink-0 bg-palette-line hover:bg-palette-accent data-dragging:bg-palette-accent data-[orientation=vertical]:w-1.5 data-[orientation=vertical]:cursor-col-resize data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:cursor-row-resize";

function Level({ path, depth }: { path: string; depth: number }) {
    const orientation: Orientation =
        depth % 2 === 0 ? "horizontal" : "vertical";
    return (
        <Splitter.Group
            id={`group${path}`}
            orientation={orientation}
            className="h-full"
        >
            {Array.from({ length: PANELS }, (_, index) => {
                const id = `${path}-${index}`;
                const leaf = depth === DEPTH || index !== 1;
                return (
                    <Fragment key={id}>
                        {index > 0 && (
                            <Splitter.Separator
                                aria-label={`Resize ${id}`}
                                className={SEPARATOR}
                            />
                        )}
                        <Splitter.Panel
                            id={`panel${id}`}
                            minSize="8%"
                            collapsible={index === PANELS - 1}
                            collapsedSize="2%"
                            className="bg-palette-soft data-collapsed:bg-palette-line"
                        >
                            {leaf ? (
                                <span className="p-1 font-mono text-xs">
                                    {id}
                                </span>
                            ) : (
                                <Level path={id} depth={depth + 1} />
                            )}
                        </Splitter.Panel>
                    </Fragment>
                );
            })}
        </Splitter.Group>
    );
}

export default function NestedStress() {
    return (
        <div className="palette-surface h-full bg-palette-base p-2 text-palette-contrast">
            <Level path="" depth={0} />
        </div>
    );
}
