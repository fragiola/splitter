// From Dockable (fragiola/dockable, examples/shared/tests/e2e-available.test.ts), same author and licence.
import { describe, expect, it } from "vitest";
import {
    COMPLETE_FRAMEWORKS,
    embedBase,
    frameworkOf,
    skipOrFail,
    skipReason,
} from "../e2e/available.ts";
import { FRAMEWORKS } from "../src/framework.ts";

// The shared e2e suite runs against every framework's embed; a spec that opens an example the
// framework does not have is skipped with this reason, unless the framework ships every example
// (e2e/helpers.ts).
describe("the e2e suite's framework", () => {
    it("comes from EXAMPLES_FRAMEWORK, and a missing or unknown one throws", () => {
        expect(frameworkOf("vue")).toBe("vue");
        expect(() => frameworkOf(undefined)).toThrow(/EXAMPLES_FRAMEWORK/);
        expect(() => frameworkOf("svelte")).toThrow(/react, vue, angular/);
    });

    it("mounts each framework's embed under its own base", () => {
        expect(embedBase("react")).toBe("/splitter/embed/react/");
        expect(embedBase("angular")).toBe("/splitter/embed/angular/");
    });
});

describe("a spec's examples", () => {
    const available = ["basic-horizontal", "ide-layout"];

    it("run when the framework has every one", () => {
        expect(
            skipReason("vue", available, ["basic-horizontal"]),
        ).toBeUndefined();
        expect(skipReason("vue", available, [])).toBeUndefined();
    });

    it("skip, naming the missing ones, when it lacks some", () => {
        expect(
            skipReason("vue", available, ["ide-layout", "toolbox", "keyboard"]),
        ).toBe("vue has no toolbox, keyboard example");
    });
});

describe("a complete framework", () => {
    const available = ["basic-horizontal"];

    it("is React and Vue today: the Angular app may still ship a subset", () => {
        expect([...COMPLETE_FRAMEWORKS]).toEqual(["react", "vue"]);
        for (const framework of COMPLETE_FRAMEWORKS) {
            expect(FRAMEWORKS).toContain(framework);
        }
    });

    it("skips, instead of failing, in a framework still being written", () => {
        expect(skipOrFail("angular", available, ["ide-layout"])).toBe(
            "angular has no ide-layout example",
        );
    });

    it("fails a spec whose example it lacks, instead of skipping it", () => {
        expect(() => skipOrFail("react", available, ["ide-layout"])).toThrow(
            /react has no ide-layout example, but every react example is required/,
        );
        expect(() => skipOrFail("vue", available, ["ide-layout"])).toThrow(
            /vue has no ide-layout example, but every vue example is required/,
        );
        expect(
            skipOrFail("react", available, ["basic-horizontal"]),
        ).toBeUndefined();
    });
});
