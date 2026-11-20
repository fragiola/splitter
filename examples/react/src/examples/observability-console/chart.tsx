"use client";

import {
    areaPath,
    GRID,
    linePath,
    VIEW_BOX,
    VIEW_HEIGHT,
    VIEW_WIDTH,
} from "./charts";
import * as styles from "./styles";

export interface ChartProps {
    /** which chart: its palette */
    tone: "latency" | "errors";
    title: string;
    /** what the series covers: a service, or every one */
    scope: string;
    /** the latest value, formatted */
    value: string;
    /** the scale's top, formatted */
    maxLabel: string;
    values: readonly number[];
    max: number;
}

// A live chart: an <svg> with a fixed viewBox, stretched to whatever its panel is
// (`preserveAspectRatio="none"`), its strokes kept at one width (`vector-effect`). Resizing the
// panel redraws it; nothing is measured. The figures are HTML, so they never stretch.
export function Chart({
    tone,
    title,
    scope,
    value,
    maxLabel,
    values,
    max,
}: ChartProps) {
    return (
        <section aria-label={title} className={styles.chart}>
            <div className={styles.bar}>
                <h2 className={styles.tab}>{title}</h2>
                <span className={styles.scope}>{scope}</span>
                <span
                    data-testid={`${tone}-now`}
                    className={styles.value[tone]}
                >
                    {value}
                </span>
            </div>
            <div className={styles.plot}>
                <span aria-hidden="true" className={styles.max}>
                    {maxLabel}
                </span>
                <svg
                    viewBox={VIEW_BOX}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className={styles.svg[tone]}
                >
                    {GRID.map((y) => (
                        <line
                            key={y}
                            x1={0}
                            x2={VIEW_WIDTH}
                            y1={y}
                            y2={y}
                            vectorEffect="non-scaling-stroke"
                            className={styles.gridLine}
                        />
                    ))}
                    <line
                        x1={0}
                        x2={VIEW_WIDTH}
                        y1={VIEW_HEIGHT}
                        y2={VIEW_HEIGHT}
                        vectorEffect="non-scaling-stroke"
                        className={styles.baseline}
                    />
                    <path d={areaPath(values, max)} className={styles.area} />
                    <path
                        d={linePath(values, max)}
                        vectorEffect="non-scaling-stroke"
                        className={styles.line}
                    />
                </svg>
            </div>
        </section>
    );
}
