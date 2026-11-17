import { createSplitterRef, type SplitterRef } from "@fragiola/splitter";
import { markRaw } from "vue";

/**
 * A handle on a splitter from outside its root group, for `<Splitter.Group :splitter-ref>`: call
 * it in `setup`, it is the same for the component's life. Then `useSplitter(splitterRef)` or
 * `splitterRef.current` anywhere. Outside a component, `createSplitterRef()` makes one.
 */
export function useSplitterRef(): SplitterRef {
    // kept out of Vue's reactivity: in `ref()` or `reactive()` state it stays the core's object
    return markRaw(createSplitterRef());
}
