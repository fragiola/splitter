import {
    afterRenderEffect,
    Component,
    computed,
    DestroyRef,
    type ElementRef,
    effect,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import {
    createSplitterModel,
    createSplitterRef,
    injectSplitterState,
    SPLITTER,
    type SplitterJson,
    validateSplitter,
} from "@fragiola/splitter-angular";
import {
    LucideArrowDownToLine,
    LucideLayers,
    LucidePanelLeft,
    LucidePanelRight,
    LucidePause,
    LucidePlay,
    LucideRotateCcw,
} from "@lucide/angular";
import { ClickableButton } from "#/components/atoms/clickable";
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
import { Chart } from "./chart";
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
@Component({
    selector: "example-observability-console",
    imports: [
        SPLITTER,
        ClickableButton,
        Chart,
        LucideArrowDownToLine,
        LucideLayers,
        LucidePanelLeft,
        LucidePanelRight,
        LucidePause,
        LucidePlay,
        LucideRotateCcw,
    ],
    host: { class: "contents" },
    template: `
        <div [class]="styles.frame">
            <div role="toolbar" aria-label="Console" [class]="styles.toolbar">
                <button
                    kitClickable
                    size="sm"
                    variant="ghost"
                    [attr.aria-pressed]="!railCollapsed()"
                    [class]="styles.toggle"
                    (click)="toggle('services', railCollapsed())"
                >
                    <svg lucidePanelLeft aria-hidden="true"></svg>
                    Services
                </button>
                <button
                    kitClickable
                    size="sm"
                    variant="outline"
                    (click)="playing.set(!playing())"
                >
                    @if (playing()) {
                        <svg lucidePause aria-hidden="true"></svg>
                    } @else {
                        <svg lucidePlay aria-hidden="true"></svg>
                    }
                    {{ playing() ? "Pause" : "Play" }}
                </button>
                <span
                    data-testid="clock"
                    [attr.data-playing]="playing() ? '' : null"
                    [class]="styles.live"
                >
                    {{ playing() ? "Live" : "Paused" }} · {{ formatTime(telemetry().time) }}
                </span>
                <div [class]="styles.end">
                    <button
                        kitClickable
                        size="sm"
                        variant="ghost"
                        [attr.aria-pressed]="!inspectorCollapsed()"
                        [class]="styles.toggle"
                        (click)="toggle('inspector', inspectorCollapsed())"
                    >
                        <svg lucidePanelRight aria-hidden="true"></svg>
                        Inspector
                    </button>
                    <button kitClickable size="sm" variant="ghost" (click)="reset()">
                        <svg lucideRotateCcw aria-hidden="true"></svg>
                        Reset layout
                    </button>
                </div>
            </div>
            <div
                splitterGroup
                id="console"
                [model]="model"
                [splitterRef]="splitterRef"
                [class]="styles.group"
                (layoutCommit)="persist()"
            >
                <div
                    splitterPanel
                    id="services"
                    defaultSize="15rem"
                    minSize="11rem"
                    maxSize="30%"
                    collapsible
                    collapsedSize="2.75rem"
                    [class]="styles.services"
                >
                    <nav aria-label="Services" [class]="styles.rail">
                        <h2 [class]="styles.caption">Services</h2>
                        <button
                            type="button"
                            aria-label="All services"
                            title="All services"
                            [attr.aria-pressed]="service() === undefined"
                            [class]="styles.service"
                            (click)="select(undefined)"
                        >
                            <svg lucideLayers aria-hidden="true" [class]="styles.allIcon"></svg>
                            <span [class]="styles.name">All services</span>
                        </button>
                        @for (s of telemetry().services; track s.id) {
                            <button
                                type="button"
                                [attr.aria-label]="s.name"
                                [attr.title]="s.name + ': ' + healthOf(latest(s.errors))"
                                [attr.aria-pressed]="service() === s.id"
                                [attr.data-health]="healthOf(latest(s.errors))"
                                [class]="styles.service"
                                (click)="select(s.id)"
                            >
                                <span
                                    aria-hidden="true"
                                    [class]="styles.health[healthOf(latest(s.errors))]"
                                ></span>
                                <span [class]="styles.name">{{ s.name }}</span>
                                <span [class]="styles.figure">{{ formatMs(latest(s.latency)) }}</span>
                                <svg
                                    [attr.viewBox]="viewBox"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    [class]="styles.sparkline"
                                >
                                    <path
                                        [attr.d]="linePath(s.latency, scaleOf(s.latency, 50))"
                                        vector-effect="non-scaling-stroke"
                                        [class]="styles.sparklinePath"
                                    />
                                </svg>
                            </button>
                        }
                    </nav>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize services"
                    [class]="styles.separator"
                ></div>
                <div splitterPanel id="center" minSize="30%">
                    <div
                        splitterGroup
                        id="stream"
                        orientation="vertical"
                        [class]="styles.nested"
                        (layoutCommit)="persist()"
                    >
                        <div splitterPanel id="charts" [minSize]="120">
                            <div
                                splitterGroup
                                id="metrics"
                                [class]="styles.metrics"
                                (layoutCommit)="persist()"
                            >
                                <div splitterPanel id="latency" minSize="25%">
                                    <example-observability-console-chart
                                        tone="latency"
                                        heading="p95 latency"
                                        [scope]="scope()"
                                        [value]="formatMs(latest(series().latency))"
                                        [maxLabel]="formatMs(latencyMax())"
                                        [values]="series().latency"
                                        [max]="latencyMax()"
                                    />
                                </div>
                                <div
                                    splitterSeparator
                                    aria-label="Resize latency and errors"
                                    [class]="styles.separator"
                                ></div>
                                <div splitterPanel id="errors" minSize="25%">
                                    <example-observability-console-chart
                                        tone="errors"
                                        heading="Error rate"
                                        [scope]="scope()"
                                        [value]="formatPercent(latest(series().errors))"
                                        [maxLabel]="formatPercent(errorsMax())"
                                        [values]="series().errors"
                                        [max]="errorsMax()"
                                    />
                                </div>
                            </div>
                        </div>
                        <div
                            splitterSeparator
                            aria-label="Resize charts and logs"
                            [class]="styles.separator"
                        ></div>
                        <div
                            splitterPanel
                            id="logs"
                            defaultSize="50%"
                            minSize="5rem"
                            collapsible
                            collapsedSize="2rem"
                        >
                            <section aria-label="Logs" [class]="styles.pane">
                                <div [class]="styles.bar">
                                    <h2 [class]="styles.tab">Logs</h2>
                                    <span [class]="styles.scope">{{ scope() }}</span>
                                    @if (following()) {
                                        <span [class]="styles.status">Following</span>
                                    } @else {
                                        <button
                                            kitClickable
                                            size="sm"
                                            variant="ghost"
                                            [class]="styles.jump"
                                            (click)="following.set(true)"
                                        >
                                            <svg lucideArrowDownToLine aria-hidden="true"></svg>
                                            Jump to latest
                                        </button>
                                    }
                                </div>
                                <!-- a scroll container takes the focus, so the keyboard scrolls it -->
                                <div
                                    #tail
                                    role="log"
                                    aria-label="Log tail"
                                    aria-live="off"
                                    tabindex="0"
                                    [class]="styles.tail"
                                    (scroll)="onTailScroll($event)"
                                >
                                    <ol [class]="styles.lines">
                                        @for (line of lines(); track line.id) {
                                            <li [attr.data-level]="line.level" [class]="styles.logLine">
                                                <span [class]="styles.time">{{ formatTime(line.time) }}</span>
                                                <span [class]="styles.level[line.level]">{{ line.level }}</span>
                                                <span data-testid="log-service" [class]="styles.logService">{{ line.service }}</span>
                                                <span [class]="styles.message">{{ line.message }}</span>
                                            </li>
                                        }
                                    </ol>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
                <div
                    splitterSeparator
                    aria-label="Resize inspector"
                    [class]="styles.separator"
                ></div>
                <div
                    splitterPanel
                    id="inspector"
                    defaultSize="17rem"
                    minSize="13rem"
                    maxSize="35%"
                    collapsible
                >
                    <section aria-label="Trace inspector" [class]="styles.inspector">
                        <div [class]="styles.bar">
                            <h2 [class]="styles.tab">Traces</h2>
                            <span [class]="styles.status">{{ pinned() ? "Pinned" : "Latest" }}</span>
                        </div>
                        <ul aria-label="Recent traces" [class]="styles.traces">
                            @for (t of traces(); track t.id) {
                                <li>
                                    <button
                                        type="button"
                                        [attr.aria-pressed]="t.id === trace()?.id"
                                        [class]="styles.trace"
                                        (click)="pin(t)"
                                    >
                                        <span [class]="styles.operation">{{ t.operation }}</span>
                                        <span [class]="styles.duration(t.failed)">{{ formatMs(t.duration) }}@if (t.failed) {<span [class]="styles.hidden">, failed</span>}</span>
                                        <span [class]="styles.traceService">
                                            {{ serviceName(t.service) }} · {{ formatTime(t.time) }}
                                        </span>
                                    </button>
                                </li>
                            }
                        </ul>
                        @if (trace(); as shown) {
                            <div [class]="styles.detail">
                                <h3 [class]="styles.traceTitle">{{ shown.operation }}</h3>
                                <p [class]="styles.traceMeta">
                                    {{ shown.id.slice(0, 8) }} · {{ shown.spans.length }} spans ·
                                    {{ formatMs(shown.duration) }}
                                </p>
                                <ol aria-label="Spans" [class]="styles.spans">
                                    @for (bar of waterfall(); track bar.id) {
                                        <li [class]="styles.span">
                                            <span [class]="styles.spanName(bar.depth)">
                                                {{ serviceName(bar.service) }} {{ bar.label }}
                                            </span>
                                            <span [class]="styles.spanDuration">{{ bar.duration }}@if (bar.failed) {<span [class]="styles.hidden">, failed</span>}</span>
                                            <svg
                                                viewBox="0 0 100 10"
                                                preserveAspectRatio="none"
                                                aria-hidden="true"
                                                [class]="styles.track"
                                            >
                                                <rect
                                                    [attr.x]="bar.x"
                                                    [attr.width]="bar.width"
                                                    y="0"
                                                    height="10"
                                                    [class]="styles.spanBar(bar.failed)"
                                                />
                                            </svg>
                                        </li>
                                    }
                                </ol>
                            </div>
                        } @else {
                            <p [class]="styles.empty">No traces for {{ scope() }}.</p>
                        }
                    </section>
                </div>
            </div>
        </div>
    `,
})
export default class ObservabilityConsole {
    protected readonly styles = styles;
    protected readonly formatTime = formatTime;
    protected readonly formatMs = formatMs;
    protected readonly formatPercent = formatPercent;
    protected readonly healthOf = healthOf;
    protected readonly latest = latest;
    protected readonly linePath = linePath;
    protected readonly scaleOf = scaleOf;
    protected readonly serviceName = serviceName;
    protected readonly viewBox = VIEW_BOX;

    protected readonly model = restore();
    protected readonly splitterRef = createSplitterRef();
    // recomputed when a panel collapses or expands, however it happens (a drag, Enter, a click)
    private readonly railState = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "services" }),
        { splitterRef: () => this.splitterRef },
    );
    private readonly inspectorState = injectSplitterState(
        ({ model }) => model.is("panel-collapsed", { panelId: "inspector" }),
        { splitterRef: () => this.splitterRef },
    );
    protected readonly railCollapsed = computed(
        () => this.railState() ?? false,
    );
    protected readonly inspectorCollapsed = computed(
        () => this.inspectorState() ?? false,
    );

    // the feed is app state, outside the splitter: each tick is a new telemetry object
    private readonly feed = createTelemetryFeed();
    protected readonly telemetry = signal(this.feed.current());
    protected readonly playing = signal(!prefersReducedMotion());

    // a selected service filters the charts, the logs and the traces
    protected readonly service = signal<ServiceId | undefined>(undefined);
    // a trace the user picked stays shown; otherwise the inspector follows the latest
    protected readonly pinned = signal<Trace | undefined>(undefined);
    protected readonly series = computed(() =>
        seriesOf(this.telemetry(), this.service()),
    );
    protected readonly scope = computed(() => {
        const service = this.service();
        return service ? serviceName(service) : "All services";
    });
    protected readonly latencyMax = computed(() =>
        scaleOf(this.series().latency, 50),
    );
    protected readonly errorsMax = computed(() =>
        scaleOf(this.series().errors, 1),
    );
    protected readonly lines = computed(() =>
        logsOf(this.telemetry(), this.service()),
    );
    protected readonly traces = computed(() =>
        tracesOf(this.telemetry(), this.service(), TRACES),
    );
    protected readonly trace = computed(
        () => this.pinned() ?? this.traces()[0],
    );
    protected readonly waterfall = computed(() => {
        const trace = this.trace();
        return trace ? waterfallOf(trace) : [];
    });

    // the tail follows the newest line while it is scrolled to the bottom, and holds otherwise
    // (`tail.ts`: a resize of its panel never stops it)
    private readonly tail = viewChild<ElementRef<HTMLDivElement>>("tail");
    private readonly follower = createTailFollower();
    protected readonly following = signal(true);

    constructor() {
        const unsubscribe = this.feed.subscribe((next) =>
            this.telemetry.set(next),
        );
        effect(() => {
            if (this.playing()) this.feed.play();
            else this.feed.pause();
        });
        inject(DestroyRef).onDestroy(() => {
            unsubscribe();
            this.feed.dispose();
        });
        afterRenderEffect({
            write: () => {
                this.lines();
                const element = this.tail()?.nativeElement;
                if (element) this.follower.rendered(element, this.following());
            },
        });
    }

    protected persist() {
        save(KEY, this.model.get("splitter-json"));
    }

    protected select(id: ServiceId | undefined) {
        this.service.set(id);
        this.pinned.set(undefined);
    }

    protected pin(picked: Trace) {
        this.pinned.set(this.pinned()?.id === picked.id ? undefined : picked);
    }

    protected onTailScroll(event: Event) {
        this.following.set(
            this.follower.scrolled(
                event.currentTarget as HTMLDivElement,
                this.following(),
            ),
        );
    }

    protected toggle(panelId: "services" | "inspector", collapsed: boolean) {
        this.model.run(collapsed ? "panel.expand" : "panel.collapse", {
            panelId,
        });
    }

    protected reset() {
        this.model.run("batch", {
            commands: [
                { command: "group.reset", payload: { groupId: "console" } },
                { command: "group.reset", payload: { groupId: "stream" } },
                { command: "group.reset", payload: { groupId: "metrics" } },
            ],
        });
    }
}
