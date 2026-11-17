import {
    createSplitterModel,
    type Layout,
    type Orientation,
    Splitter,
    veto,
} from "@fragiola/splitter-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// The unstyled splitter Playwright drives: the same page left-to-right (`fixtures/basic`) and
// right-to-left (`fixtures/rtl`), configured by the query string, so one spec runs against both.
//
//   ?orientation=vertical   a vertical group (default horizontal)
//   &veto=1                 a middleware vetoes every committed `separator.move`
//
// The group's panels share 600px on its axis (the separators are 10px each, outside that):
//   a  default 30%, min 20%, collapsible to 5%     (`/g0/p0`)
//   x  default 10%, only while `toggle-x` shows it (between a and b, in the markup)
//   b  min 10%                                     (`/g0/p1`, or `/g0/p2` with x)
//   c  default 20%, max 40%
// Beside the group: the layout as JSON (`layout`), the commits (`commits`), the model's JSON
// document (`json`), and the toggle of x (`toggle-x`).

const params = new URLSearchParams(location.search);
const orientation: Orientation =
    params.get("orientation") === "vertical" ? "vertical" : "horizontal";

function Fixture() {
    const [model] = useState(() => {
        const made = createSplitterModel();
        if (params.get("veto") === "1") {
            made.use((ctx, next) =>
                ctx.command === "separator.move" && !ctx.transient
                    ? veto()
                    : next(),
            );
        }
        return made;
    });
    const [layout, setLayout] = useState<Readonly<Layout>>({});
    const [commits, setCommits] = useState(0);
    const [extra, setExtra] = useState(false);
    return (
        <>
            <Splitter.Group
                id="fixture"
                model={model}
                orientation={orientation}
                data-testid="group"
                onLayoutChange={setLayout}
                onLayoutCommit={() => setCommits((n) => n + 1)}
            >
                <Splitter.Panel
                    id="a"
                    defaultSize="30%"
                    minSize="20%"
                    collapsible
                    collapsedSize="5%"
                >
                    a
                </Splitter.Panel>
                <Splitter.Separator aria-label="Resize a" />
                {extra && (
                    <>
                        <Splitter.Panel id="x" defaultSize="10%">
                            x
                        </Splitter.Panel>
                        <Splitter.Separator aria-label="Resize x" />
                    </>
                )}
                <Splitter.Panel id="b" minSize="10%">
                    b
                </Splitter.Panel>
                <Splitter.Separator aria-label="Resize b" />
                <Splitter.Panel id="c" defaultSize="20%" maxSize="40%">
                    c
                </Splitter.Panel>
            </Splitter.Group>
            <button
                type="button"
                data-testid="toggle-x"
                onClick={() => setExtra(!extra)}
            >
                toggle x
            </button>
            <pre data-testid="layout">{JSON.stringify(layout)}</pre>
            <output data-testid="commits">{commits}</output>
            <pre data-testid="json">
                {JSON.stringify(model.get("splitter-json"))}
            </pre>
        </>
    );
}

export function mountSplitterFixture() {
    const root = document.getElementById("root");
    if (!root) throw new Error("#root is missing");
    createRoot(root).render(
        <StrictMode>
            <Fixture />
        </StrictMode>,
    );
}
