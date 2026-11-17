import { describe, expect, it, vi } from "vitest";
import { createSplitterEngine } from "../../src/engine/splitter-engine";
import {
    attachSplitterRef,
    createSplitterRef,
    type SplitterRef,
} from "../../src/engine/splitter-ref";
import { createSplitterModel } from "../../src/state/model";

function handle() {
    const model = createSplitterModel();
    return { model, engine: createSplitterEngine(model), groupId: "g" };
}

describe("createSplitterRef", () => {
    it("holds a root's splitter while attached and tells its listeners", () => {
        const ref = createSplitterRef();
        const listener = vi.fn();
        const unsubscribe = ref.subscribe(listener);
        expect(ref.current).toBeNull();
        const splitter = handle();
        const release = attachSplitterRef(ref, splitter);
        expect(ref.current).toBe(splitter);
        expect(listener).toHaveBeenCalledTimes(1);
        release();
        expect(ref.current).toBeNull();
        expect(listener).toHaveBeenCalledTimes(2);
        unsubscribe();
        attachSplitterRef(ref, splitter);
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it("refuses a second root and a ref it did not make", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const ref = createSplitterRef();
        const first = handle();
        attachSplitterRef(ref, first);
        const release = attachSplitterRef(ref, handle());
        expect(ref.current).toBe(first);
        release();
        expect(ref.current).toBe(first);
        const fake: SplitterRef = { current: null, subscribe: () => () => {} };
        attachSplitterRef(fake, first);
        expect(fake.current).toBeNull();
        expect(error).toHaveBeenCalledTimes(2);
        error.mockRestore();
    });
});
