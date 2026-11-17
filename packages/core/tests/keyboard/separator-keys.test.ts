import { describe, expect, it } from "vitest";
import { separatorKeyIntent } from "../../src/keyboard/separator-keys";

const horizontal = {
    orientation: "horizontal",
    direction: "ltr",
    step: 5,
} as const;
const vertical = {
    orientation: "vertical",
    direction: "ltr",
    step: 5,
} as const;

describe("separatorKeyIntent (Window Splitter)", () => {
    it("moves a horizontal group's separator with left and right", () => {
        expect(separatorKeyIntent({ ...horizontal, key: "ArrowLeft" })).toEqual(
            {
                type: "move",
                delta: -5,
            },
        );
        expect(
            separatorKeyIntent({ ...horizontal, key: "ArrowRight" }),
        ).toEqual({
            type: "move",
            delta: 5,
        });
        expect(
            separatorKeyIntent({ ...horizontal, key: "ArrowUp" }),
        ).toBeUndefined();
        expect(
            separatorKeyIntent({ ...horizontal, key: "ArrowDown" }),
        ).toBeUndefined();
    });

    it("mirrors left and right in right-to-left", () => {
        const rtl = { ...horizontal, direction: "rtl" } as const;
        expect(separatorKeyIntent({ ...rtl, key: "ArrowLeft" })).toEqual({
            type: "move",
            delta: 5,
        });
        expect(separatorKeyIntent({ ...rtl, key: "ArrowRight" })).toEqual({
            type: "move",
            delta: -5,
        });
        expect(separatorKeyIntent({ ...rtl, key: "Home" })).toEqual({
            type: "move",
            delta: -100,
        });
    });

    it("moves a vertical group's separator with up and down, in either direction", () => {
        for (const direction of ["ltr", "rtl"] as const) {
            expect(
                separatorKeyIntent({ ...vertical, direction, key: "ArrowUp" }),
            ).toEqual({ type: "move", delta: -5 });
            expect(
                separatorKeyIntent({
                    ...vertical,
                    direction,
                    key: "ArrowDown",
                }),
            ).toEqual({ type: "move", delta: 5 });
        }
        expect(
            separatorKeyIntent({ ...vertical, key: "ArrowLeft" }),
        ).toBeUndefined();
    });

    it("uses the configured step", () => {
        expect(
            separatorKeyIntent({ ...horizontal, step: 10, key: "ArrowRight" }),
        ).toEqual({
            type: "move",
            delta: 10,
        });
    });

    it("sends Home and End to the limits, Enter toggles, F6 cycles", () => {
        expect(separatorKeyIntent({ ...horizontal, key: "Home" })).toEqual({
            type: "move",
            delta: -100,
        });
        expect(separatorKeyIntent({ ...horizontal, key: "End" })).toEqual({
            type: "move",
            delta: 100,
        });
        expect(separatorKeyIntent({ ...horizontal, key: "Enter" })).toEqual({
            type: "toggle",
        });
        expect(separatorKeyIntent({ ...horizontal, key: "F6" })).toEqual({
            type: "cycle",
            backwards: false,
        });
        expect(
            separatorKeyIntent({ ...horizontal, key: "F6", shiftKey: true }),
        ).toEqual({ type: "cycle", backwards: true });
        expect(separatorKeyIntent({ ...horizontal, key: "a" })).toBeUndefined();
    });
});
