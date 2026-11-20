<script setup lang="ts">
import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    useSplitterRef,
    useSplitterState,
    validateSplitter,
} from "@fragiola/splitter-vue";
import {
    ArrowDownToLine,
    Layers,
    PanelLeft,
    PanelRight,
    Pause,
    Play,
    RotateCcw,
} from "@lucide/vue";
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    shallowRef,
    useTemplateRef,
    watch,
} from "vue";
import { Clickable } from "#/components/atoms/clickable";
import { load, save } from "../_kit/persistence";
import {
    createTelemetryFeed,
    formatTime,
    healthOf,
    latest,
    prefersReducedMotion,
    type ServiceId,
    serviceName,
    type Trace,
} from "../_kit/telemetry";
import Chart from "./chart.vue";
import {
    formatMs,
    formatPercent,
    linePath,
    logsOf,
    scaleOf,
    seriesOf,
    tracesOf,
    VIEW_BOX,
    waterfallOf,
} from "./charts";
import * as styles from "./styles";
import { createTailFollower } from "./tail";

const KEY = "fragiola-splitter:observability-console";

/** How many of the latest traces the inspector lists. */
const TRACES = 5;

/** The model of the saved layout: a document that is missing or invalid starts from the defaults. */
function restore() {
    const saved = load<SplitterJson>(KEY);
    const valid = saved !== undefined && validateSplitter(saved).length === 0;
    return createSplitterModel(valid ? saved : undefined);
}

// A live observability console in three nested groups of one model: the services rail | the
// charts (latency | errors) over the log tail | the trace inspector. The feed (`_kit/telemetry.ts`,
// seeded, no network) ticks twice a second while it plays; it starts paused when the reader asks
// for less motion and stops while the page is hidden. Every resize reflows the charts (an SVG
// stretched to its panel) and the logs while they stream. The rail collapses to its health dots,
// the inspector away, the logs to their title bar (a drag, or Enter on their separator); the
// layout is saved on every commit and Reset layout puts the three groups back. The side panels keep
// their percentage when the window resizes: with `preserve-pixel-size` a restored layout comes
// back a fraction of a percent off (docs/docs-examples-gaps.md, S14).
const model = restore();
const splitterRef = useSplitterRef();
const persist = () => save(KEY, model.get("splitter-json"));
// recomputed when a panel collapses or expands, however it happens (a drag, Enter, a click)
const railState = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "services" }),
    { splitterRef },
);
const inspectorState = useSplitterState(
    ({ model }) => model.is("panel-collapsed", { panelId: "inspector" }),
    { splitterRef },
);
const railCollapsed = computed(() => railState.value ?? false);
const inspectorCollapsed = computed(() => inspectorState.value ?? false);

// the feed is app state, outside the splitter: each tick is a new telemetry object
const feed = createTelemetryFeed();
const telemetry = shallowRef(feed.current());
const playing = ref(!prefersReducedMotion());
const unsubscribe = feed.subscribe((next) => {
    telemetry.value = next;
});
onMounted(() => {
    if (playing.value) feed.play();
});
watch(playing, (next) => (next ? feed.play() : feed.pause()));
onBeforeUnmount(() => {
    unsubscribe();
    feed.dispose();
});

// a selected service filters the charts, the logs and the traces
const service = ref<ServiceId | undefined>();
// a trace the user picked stays shown; otherwise the inspector follows the latest
const pinned = shallowRef<Trace | undefined>();
const series = computed(() => seriesOf(telemetry.value, service.value));
const scope = computed(() =>
    service.value ? serviceName(service.value) : "All services",
);
const latencyMax = computed(() => scaleOf(series.value.latency, 50));
const errorsMax = computed(() => scaleOf(series.value.errors, 1));
const lines = computed(() => logsOf(telemetry.value, service.value));
const traces = computed(() =>
    tracesOf(telemetry.value, service.value, TRACES),
);
const trace = computed(() => pinned.value ?? traces.value[0]);
function select(id: ServiceId | undefined) {
    service.value = id;
    pinned.value = undefined;
}
function pin(picked: Trace) {
    pinned.value = pinned.value?.id === picked.id ? undefined : picked;
}

// the tail follows the newest line while it is scrolled to the bottom, and holds otherwise
// (`tail.ts`: a resize of its panel never stops it)
const tail = useTemplateRef<HTMLDivElement>("tail");
const follower = createTailFollower();
const following = ref(true);
watch(
    [lines, following],
    () => {
        if (tail.value) follower.rendered(tail.value, following.value);
    },
    { flush: "post" },
);
onMounted(() => {
    if (tail.value) follower.rendered(tail.value, following.value);
});
function onTailScroll(event: Event) {
    following.value = follower.scrolled(
        event.currentTarget as HTMLDivElement,
        following.value,
    );
}

function toggle(panelId: "services" | "inspector", collapsed: boolean) {
    model.run(collapsed ? "panel.expand" : "panel.collapse", { panelId });
}
function reset() {
    model.run("batch", {
        commands: [
            { command: "group.reset", payload: { groupId: "console" } },
            { command: "group.reset", payload: { groupId: "stream" } },
            { command: "group.reset", payload: { groupId: "metrics" } },
        ],
    });
}
// Enter toggles the panel before a separator (the charts, which do not collapse): the logs
// are after it, so the app toggles them itself (docs/docs-examples-gaps.md, S12)
function onLogsSeparatorKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    const collapsed = model.is("panel-collapsed", { panelId: "logs" });
    model.run(collapsed ? "panel.expand" : "panel.collapse", {
        panelId: "logs",
    });
}
</script>

<template>
    <div :class="styles.frame">
        <div role="toolbar" aria-label="Console" :class="styles.toolbar">
            <Clickable.Button
                size="sm"
                variant="ghost"
                :aria-pressed="!railCollapsed"
                :class="styles.toggle"
                @click="toggle('services', railCollapsed)"
            >
                <PanelLeft aria-hidden="true" />
                Services
            </Clickable.Button>
            <Clickable.Button size="sm" variant="outline" @click="playing = !playing">
                <Pause v-if="playing" aria-hidden="true" />
                <Play v-else aria-hidden="true" />
                {{ playing ? "Pause" : "Play" }}
            </Clickable.Button>
            <span
                data-testid="clock"
                :data-playing="playing ? '' : undefined"
                :class="styles.live"
            >
                {{ playing ? "Live" : "Paused" }} · {{ formatTime(telemetry.time) }}
            </span>
            <div :class="styles.end">
                <Clickable.Button
                    size="sm"
                    variant="ghost"
                    :aria-pressed="!inspectorCollapsed"
                    :class="styles.toggle"
                    @click="toggle('inspector', inspectorCollapsed)"
                >
                    <PanelRight aria-hidden="true" />
                    Inspector
                </Clickable.Button>
                <Clickable.Button size="sm" variant="ghost" @click="reset">
                    <RotateCcw aria-hidden="true" />
                    Reset layout
                </Clickable.Button>
            </div>
        </div>
        <Splitter.Group
            id="console"
            :model="model"
            :splitter-ref="splitterRef"
            :class="styles.group"
            @layout-commit="persist"
        >
            <Splitter.Panel
                id="services"
                default-size="15rem"
                min-size="11rem"
                max-size="30%"
                collapsible
                collapsed-size="2.75rem"
                :class="styles.services"
            >
                <nav aria-label="Services" :class="styles.rail">
                    <h2 :class="styles.caption">Services</h2>
                    <button
                        type="button"
                        aria-label="All services"
                        title="All services"
                        :aria-pressed="service === undefined"
                        :class="styles.service"
                        @click="select(undefined)"
                    >
                        <Layers aria-hidden="true" :class="styles.allIcon" />
                        <span :class="styles.name">All services</span>
                    </button>
                    <button
                        v-for="s in telemetry.services"
                        :key="s.id"
                        type="button"
                        :aria-label="s.name"
                        :title="`${s.name}: ${healthOf(latest(s.errors))}`"
                        :aria-pressed="service === s.id"
                        :data-health="healthOf(latest(s.errors))"
                        :class="styles.service"
                        @click="select(s.id)"
                    >
                        <span
                            aria-hidden="true"
                            :class="styles.health[healthOf(latest(s.errors))]"
                        />
                        <span :class="styles.name">{{ s.name }}</span>
                        <span :class="styles.figure">
                            {{ formatMs(latest(s.latency)) }}
                        </span>
                        <svg
                            :viewBox="VIEW_BOX"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                            :class="styles.sparkline"
                        >
                            <path
                                :d="linePath(s.latency, scaleOf(s.latency, 50))"
                                vector-effect="non-scaling-stroke"
                                :class="styles.sparklinePath"
                            />
                        </svg>
                    </button>
                </nav>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize services"
                :class="styles.separator"
            />
            <Splitter.Panel id="center" min-size="30%">
                <Splitter.Group
                    id="stream"
                    orientation="vertical"
                    :class="styles.nested"
                    @layout-commit="persist"
                >
                    <Splitter.Panel id="charts" :min-size="120">
                        <Splitter.Group
                            id="metrics"
                            :class="styles.metrics"
                            @layout-commit="persist"
                        >
                            <Splitter.Panel id="latency" min-size="25%">
                                <Chart
                                    tone="latency"
                                    title="p95 latency"
                                    :scope="scope"
                                    :value="formatMs(latest(series.latency))"
                                    :max-label="formatMs(latencyMax)"
                                    :values="series.latency"
                                    :max="latencyMax"
                                />
                            </Splitter.Panel>
                            <Splitter.Separator
                                aria-label="Resize latency and errors"
                                :class="styles.separator"
                            />
                            <Splitter.Panel id="errors" min-size="25%">
                                <Chart
                                    tone="errors"
                                    title="Error rate"
                                    :scope="scope"
                                    :value="formatPercent(latest(series.errors))"
                                    :max-label="formatPercent(errorsMax)"
                                    :values="series.errors"
                                    :max="errorsMax"
                                />
                            </Splitter.Panel>
                        </Splitter.Group>
                    </Splitter.Panel>
                    <Splitter.Separator
                        aria-label="Resize charts and logs"
                        :class="styles.separator"
                        @keydown="onLogsSeparatorKeydown"
                    />
                    <Splitter.Panel
                        id="logs"
                        default-size="50%"
                        min-size="5rem"
                        collapsible
                        collapsed-size="2rem"
                    >
                        <section aria-label="Logs" :class="styles.pane">
                            <div :class="styles.bar">
                                <h2 :class="styles.tab">Logs</h2>
                                <span :class="styles.scope">{{ scope }}</span>
                                <span v-if="following" :class="styles.status">
                                    Following
                                </span>
                                <Clickable.Button
                                    v-else
                                    size="sm"
                                    variant="ghost"
                                    :class="styles.jump"
                                    @click="following = true"
                                >
                                    <ArrowDownToLine aria-hidden="true" />
                                    Jump to latest
                                </Clickable.Button>
                            </div>
                            <!-- a scroll container takes the focus, so the keyboard scrolls it -->
                            <div
                                ref="tail"
                                role="log"
                                aria-label="Log tail"
                                aria-live="off"
                                tabindex="0"
                                :class="styles.tail"
                                @scroll="onTailScroll"
                            >
                                <ol :class="styles.lines">
                                    <li
                                        v-for="line in lines"
                                        :key="line.id"
                                        :data-level="line.level"
                                        :class="styles.logLine"
                                    >
                                        <span :class="styles.time">
                                            {{ formatTime(line.time) }}
                                        </span>
                                        <span :class="styles.level[line.level]">
                                            {{ line.level }}
                                        </span>
                                        <span
                                            data-testid="log-service"
                                            :class="styles.logService"
                                        >
                                            {{ line.service }}
                                        </span>
                                        <span :class="styles.message">
                                            {{ line.message }}
                                        </span>
                                    </li>
                                </ol>
                            </div>
                        </section>
                    </Splitter.Panel>
                </Splitter.Group>
            </Splitter.Panel>
            <Splitter.Separator
                aria-label="Resize inspector"
                :class="styles.separator"
            />
            <Splitter.Panel
                id="inspector"
                default-size="17rem"
                min-size="13rem"
                max-size="35%"
                collapsible
            >
                <section aria-label="Trace inspector" :class="styles.inspector">
                    <div :class="styles.bar">
                        <h2 :class="styles.tab">Traces</h2>
                        <span :class="styles.status">
                            {{ pinned ? "Pinned" : "Latest" }}
                        </span>
                    </div>
                    <ul aria-label="Recent traces" :class="styles.traces">
                        <li v-for="t in traces" :key="t.id">
                            <button
                                type="button"
                                :aria-pressed="t.id === trace?.id"
                                :class="styles.trace"
                                @click="pin(t)"
                            >
                                <span :class="styles.operation">{{ t.operation }}</span>
                                <span :class="styles.duration(t.failed)">
                                    {{ formatMs(t.duration)
                                    }}<span v-if="t.failed" :class="styles.hidden">, failed</span>
                                </span>
                                <span :class="styles.traceService">
                                    {{ serviceName(t.service) }} · {{ formatTime(t.time) }}
                                </span>
                            </button>
                        </li>
                    </ul>
                    <div v-if="trace" :class="styles.detail">
                        <h3 :class="styles.traceTitle">{{ trace.operation }}</h3>
                        <p :class="styles.traceMeta">
                            {{ trace.id.slice(0, 8) }} · {{ trace.spans.length }} spans ·
                            {{ formatMs(trace.duration) }}
                        </p>
                        <ol aria-label="Spans" :class="styles.spans">
                            <li
                                v-for="bar in waterfallOf(trace)"
                                :key="bar.id"
                                :class="styles.span"
                            >
                                <span :class="styles.spanName(bar.depth)">
                                    {{ serviceName(bar.service) }} {{ bar.label }}
                                </span>
                                <span :class="styles.spanDuration">
                                    {{ bar.duration
                                    }}<span v-if="bar.failed" :class="styles.hidden">, failed</span>
                                </span>
                                <svg
                                    viewBox="0 0 100 10"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    :class="styles.track"
                                >
                                    <rect
                                        :x="bar.x"
                                        :width="bar.width"
                                        y="0"
                                        height="10"
                                        :class="styles.spanBar(bar.failed)"
                                    />
                                </svg>
                            </li>
                        </ol>
                    </div>
                    <p v-else :class="styles.empty">No traces for {{ scope }}.</p>
                </section>
            </Splitter.Panel>
        </Splitter.Group>
    </div>
</template>
