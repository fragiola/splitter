<script setup lang="ts">
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
defineProps<{
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
}>();
</script>

<template>
    <section :aria-label="title" :class="styles.chart">
        <div :class="styles.bar">
            <h2 :class="styles.tab">{{ title }}</h2>
            <span :class="styles.scope">{{ scope }}</span>
            <span :data-testid="`${tone}-now`" :class="styles.value[tone]">
                {{ value }}
            </span>
        </div>
        <div :class="styles.plot">
            <span aria-hidden="true" :class="styles.max">{{ maxLabel }}</span>
            <svg
                :viewBox="VIEW_BOX"
                preserveAspectRatio="none"
                aria-hidden="true"
                :class="styles.svg[tone]"
            >
                <line
                    v-for="y in GRID"
                    :key="y"
                    x1="0"
                    :x2="VIEW_WIDTH"
                    :y1="y"
                    :y2="y"
                    vector-effect="non-scaling-stroke"
                    :class="styles.gridLine"
                />
                <line
                    x1="0"
                    :x2="VIEW_WIDTH"
                    :y1="VIEW_HEIGHT"
                    :y2="VIEW_HEIGHT"
                    vector-effect="non-scaling-stroke"
                    :class="styles.baseline"
                />
                <path :d="areaPath(values, max)" :class="styles.area" />
                <path
                    :d="linePath(values, max)"
                    vector-effect="non-scaling-stroke"
                    :class="styles.line"
                />
            </svg>
        </div>
    </section>
</template>
