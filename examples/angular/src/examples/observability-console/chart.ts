import { Component, computed, input } from "@angular/core";
import {
    areaPath,
    GRID,
    linePath,
    VIEW_BOX,
    VIEW_HEIGHT,
    VIEW_WIDTH,
} from "./charts";
import * as styles from "./styles";

// A live chart: an <svg> with a fixed viewBox, stretched to whatever its panel is
// (`preserveAspectRatio="none"`), its strokes kept at one width (`vector-effect`). Resizing the
// panel redraws it; nothing is measured. The figures are HTML, so they never stretch.
@Component({
    selector: "example-observability-console-chart",
    host: { class: "contents" },
    template: `
        <section [attr.aria-label]="heading()" [class]="styles.chart">
            <div [class]="styles.bar">
                <h2 [class]="styles.tab">{{ heading() }}</h2>
                <span [class]="styles.scope">{{ scope() }}</span>
                <span [attr.data-testid]="tone() + '-now'" [class]="styles.value[tone()]">
                    {{ value() }}
                </span>
            </div>
            <div [class]="styles.plot">
                <span aria-hidden="true" [class]="styles.max">{{ maxLabel() }}</span>
                <svg
                    [attr.viewBox]="viewBox"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    [class]="styles.svg[tone()]"
                >
                    @for (y of grid; track y) {
                        <line
                            x1="0"
                            [attr.x2]="width"
                            [attr.y1]="y"
                            [attr.y2]="y"
                            vector-effect="non-scaling-stroke"
                            [class]="styles.gridLine"
                        />
                    }
                    <line
                        x1="0"
                        [attr.x2]="width"
                        [attr.y1]="height"
                        [attr.y2]="height"
                        vector-effect="non-scaling-stroke"
                        [class]="styles.baseline"
                    />
                    <path [attr.d]="area()" [class]="styles.area" />
                    <path
                        [attr.d]="line()"
                        vector-effect="non-scaling-stroke"
                        [class]="styles.line"
                    />
                </svg>
            </div>
        </section>
    `,
})
export class Chart {
    /** which chart: its palette */
    readonly tone = input.required<"latency" | "errors">();
    /** its name (not `title`: that would also be the host element's tooltip) */
    readonly heading = input.required<string>();
    /** what the series covers: a service, or every one */
    readonly scope = input.required<string>();
    /** the latest value, formatted */
    readonly value = input.required<string>();
    /** the scale's top, formatted */
    readonly maxLabel = input.required<string>();
    readonly values = input.required<readonly number[]>();
    readonly max = input.required<number>();

    protected readonly styles = styles;
    protected readonly grid = GRID;
    protected readonly viewBox = VIEW_BOX;
    protected readonly width = VIEW_WIDTH;
    protected readonly height = VIEW_HEIGHT;
    protected readonly area = computed(() =>
        areaPath(this.values(), this.max()),
    );
    protected readonly line = computed(() =>
        linePath(this.values(), this.max()),
    );
}
