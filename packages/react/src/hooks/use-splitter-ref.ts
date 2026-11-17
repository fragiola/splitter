import { createSplitterRef, type SplitterRef } from "@fragiola/splitter";
import * as React from "react";

/**
 * A handle on a splitter from outside its root group, the same for the component's life:
 * `<Splitter.Group splitterRef={splitterRef}>`, then `useSplitter(splitterRef)` or
 * `splitterRef.current` anywhere. Outside a component, `createSplitterRef()` makes one.
 */
export function useSplitterRef(): SplitterRef {
    const [splitterRef] = React.useState(createSplitterRef);
    return splitterRef;
}
