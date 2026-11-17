// Type fixtures (checked by `pnpm typecheck`, never run): what must compile, and what must not
// (`@ts-expect-error`).
import {
    createSplitterModel,
    type GroupProps,
    Splitter,
    type SplitterRef,
    useSplitter,
} from "../../src";

interface Types {
    readonly groupId: "main" | "sidebar";
    readonly panelId: "nav" | "editor";
}

export function Typed(props: { splitterRef: SplitterRef }) {
    const model = createSplitterModel<Types>();
    return (
        <Splitter.Group<Types>
            id="main"
            model={model}
            splitterRef={props.splitterRef}
        >
            <Splitter.Panel<Types>
                id="nav"
                minSize={200}
                maxSize="40%"
                collapsible
            />
            <Splitter.Separator
                aria-label="Resize"
                resetOnDoubleClick={false}
            />
            <Splitter.Panel<Types>
                id="editor"
                groupResizeBehavior="preserve-pixel-size"
            />
        </Splitter.Group>
    );
}

export function Wrong() {
    return (
        // @ts-expect-error: not a group id of the registry
        <Splitter.Group<Types> id="other">
            {/* @ts-expect-error: not a panel id of the registry */}
            <Splitter.Panel<Types> id="other" />
            {/* @ts-expect-error: no asChild, render instead */}
            <Splitter.Separator asChild />
        </Splitter.Group>
    );
}

export function RenderAndState() {
    return (
        <Splitter.Group
            render={(props, state) => (
                <section {...props} data-x={state.orientation} />
            )}
            className={(state) => (state.dragging ? "dragging" : undefined)}
            style={(state) => ({ gap: state.disabled ? 0 : 4 })}
        >
            <Splitter.Panel
                render={<article />}
                className={(state) => (state.collapsed ? "c" : "e")}
            />
            <Splitter.Separator
                render={(props, state) => <hr {...props} data-id={state.id} />}
                onKeyDown={(event) => event.preventDefault()}
            />
            {/* @ts-expect-error: a size is a number or a string */}
            <Splitter.Panel minSize={true} />
        </Splitter.Group>
    );
}

export function Hooks() {
    const { model, groupId } = useSplitter<Types>();
    model.run("group.reset", { groupId });
    // @ts-expect-error: not a panel id of the registry
    model.run("panel.collapse", { panelId: "other" });
    return null;
}

export const props: GroupProps<Types> = {
    id: "sidebar",
    orientation: "vertical",
};
