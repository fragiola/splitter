"use client";

import {
    createSplitterModel,
    Splitter,
    type SplitterJson,
    useSplitterRef,
    useSplitterState,
    validateSplitter,
} from "@fragiola/splitter-react";
import {
    ArrowDownToLine,
    Layers,
    PanelLeft,
    PanelRight,
    Pause,
    Play,
    RotateCcw,
} from "lucide-react";
import {
    type KeyboardEvent,
    type UIEvent,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
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

const KEY = "fragiola-splitter:observability-console";

/** How many of the latest traces the inspector lists. */
const TRACES = 5;

/** How close to the bottom the log tail still counts as followed, in pixels. */
const FOLLOW = 8;

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
export default function ObservabilityConsole() {
    const [model] = useState(restore);
    const splitterRef = useSplitterRef();
    const persist = () => save(KEY, model.get("splitter-json"));
    // re-render when a panel collapses or expands, however it happens (a drag, Enter, a click)
    const railCollapsed =
        useSplitterState(
            ({ model }) => model.is("panel-collapsed", { panelId: "services" }),
            { splitterRef },
        ) ?? false;
    const inspectorCollapsed =
        useSplitterState(
            ({ model }) =>
                model.is("panel-collapsed", { panelId: "inspector" }),
            { splitterRef },
        ) ?? false;

    // the feed is app state, outside the splitter: each tick is a new telemetry object
    const [feed] = useState(() => createTelemetryFeed());
    const [telemetry, setTelemetry] = useState(() => feed.current());
    const [playing, setPlaying] = useState(() => !prefersReducedMotion());
    useEffect(() => feed.subscribe(setTelemetry), [feed]);
    useEffect(() => {
        if (playing) feed.play();
        else feed.pause();
        return () => feed.pause();
    }, [feed, playing]);

    // a selected service filters the charts, the logs and the traces
    const [service, setService] = useState<ServiceId | undefined>();
    // a trace the user picked stays shown; otherwise the inspector follows the latest
    const [pinned, setPinned] = useState<Trace | undefined>();
    const series = seriesOf(telemetry, service);
    const scope = service ? serviceName(service) : "All services";
    const latencyMax = scaleOf(series.latency, 50);
    const errorsMax = scaleOf(series.errors, 1);
    const lines = logsOf(telemetry, service);
    const traces = tracesOf(telemetry, service, TRACES);
    const trace = pinned ?? traces[0];
    function select(id: ServiceId | undefined) {
        setService(id);
        setPinned(undefined);
    }

    // the tail follows the newest line while it is scrolled to the bottom, and holds otherwise
    const tail = useRef<HTMLDivElement>(null);
    const [following, setFollowing] = useState(true);
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs again for every batch of lines
    useLayoutEffect(() => {
        const element = tail.current;
        if (element && following) element.scrollTop = element.scrollHeight;
    }, [lines, following]);
    function onTailScroll(event: UIEvent<HTMLDivElement>) {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        setFollowing(scrollHeight - scrollTop - clientHeight < FOLLOW);
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
    function onLogsSeparatorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Enter") return;
        const collapsed = model.is("panel-collapsed", { panelId: "logs" });
        model.run(collapsed ? "panel.expand" : "panel.collapse", {
            panelId: "logs",
        });
    }

    return (
        <div className={styles.frame}>
            <div role="toolbar" aria-label="Console" className={styles.toolbar}>
                <Clickable.Button
                    size="sm"
                    variant="ghost"
                    aria-pressed={!railCollapsed}
                    onClick={() => toggle("services", railCollapsed)}
                    className={styles.toggle}
                >
                    <PanelLeft aria-hidden="true" />
                    Services
                </Clickable.Button>
                <Clickable.Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPlaying((current) => !current)}
                >
                    {playing ? (
                        <Pause aria-hidden="true" />
                    ) : (
                        <Play aria-hidden="true" />
                    )}
                    {playing ? "Pause" : "Play"}
                </Clickable.Button>
                <span
                    data-testid="clock"
                    data-playing={playing ? "" : undefined}
                    className={styles.live}
                >
                    {playing ? "Live" : "Paused"} · {formatTime(telemetry.time)}
                </span>
                <div className={styles.end}>
                    <Clickable.Button
                        size="sm"
                        variant="ghost"
                        aria-pressed={!inspectorCollapsed}
                        onClick={() => toggle("inspector", inspectorCollapsed)}
                        className={styles.toggle}
                    >
                        <PanelRight aria-hidden="true" />
                        Inspector
                    </Clickable.Button>
                    <Clickable.Button size="sm" variant="ghost" onClick={reset}>
                        <RotateCcw aria-hidden="true" />
                        Reset layout
                    </Clickable.Button>
                </div>
            </div>
            <Splitter.Group
                id="console"
                model={model}
                splitterRef={splitterRef}
                onLayoutCommit={persist}
                className={styles.group}
            >
                <Splitter.Panel
                    id="services"
                    defaultSize="15rem"
                    minSize="11rem"
                    maxSize="30%"
                    collapsible
                    collapsedSize="2.75rem"
                    className={styles.services}
                >
                    <nav aria-label="Services" className={styles.rail}>
                        <h2 className={styles.caption}>Services</h2>
                        <button
                            type="button"
                            aria-label="All services"
                            title="All services"
                            aria-pressed={service === undefined}
                            onClick={() => select(undefined)}
                            className={styles.service}
                        >
                            <Layers
                                aria-hidden="true"
                                className={styles.allIcon}
                            />
                            <span className={styles.name}>All services</span>
                        </button>
                        {telemetry.services.map((s) => {
                            const health = healthOf(latest(s.errors));
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    aria-label={s.name}
                                    title={`${s.name}: ${health}`}
                                    aria-pressed={service === s.id}
                                    data-health={health}
                                    onClick={() => select(s.id)}
                                    className={styles.service}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={styles.health[health]}
                                    />
                                    <span className={styles.name}>
                                        {s.name}
                                    </span>
                                    <span className={styles.figure}>
                                        {formatMs(latest(s.latency))}
                                    </span>
                                    <svg
                                        viewBox={VIEW_BOX}
                                        preserveAspectRatio="none"
                                        aria-hidden="true"
                                        className={styles.sparkline}
                                    >
                                        <path
                                            d={linePath(
                                                s.latency,
                                                scaleOf(s.latency, 50),
                                            )}
                                            vectorEffect="non-scaling-stroke"
                                            className={styles.sparklinePath}
                                        />
                                    </svg>
                                </button>
                            );
                        })}
                    </nav>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize services"
                    className={styles.separator}
                />
                <Splitter.Panel id="center" minSize="30%">
                    <Splitter.Group
                        id="stream"
                        orientation="vertical"
                        onLayoutCommit={persist}
                        className={styles.nested}
                    >
                        <Splitter.Panel id="charts" minSize={120}>
                            <Splitter.Group
                                id="metrics"
                                onLayoutCommit={persist}
                                className={styles.metrics}
                            >
                                <Splitter.Panel id="latency" minSize="25%">
                                    <Chart
                                        tone="latency"
                                        title="p95 latency"
                                        scope={scope}
                                        value={formatMs(latest(series.latency))}
                                        maxLabel={formatMs(latencyMax)}
                                        values={series.latency}
                                        max={latencyMax}
                                    />
                                </Splitter.Panel>
                                <Splitter.Separator
                                    aria-label="Resize latency and errors"
                                    className={styles.separator}
                                />
                                <Splitter.Panel id="errors" minSize="25%">
                                    <Chart
                                        tone="errors"
                                        title="Error rate"
                                        scope={scope}
                                        value={formatPercent(
                                            latest(series.errors),
                                        )}
                                        maxLabel={formatPercent(errorsMax)}
                                        values={series.errors}
                                        max={errorsMax}
                                    />
                                </Splitter.Panel>
                            </Splitter.Group>
                        </Splitter.Panel>
                        <Splitter.Separator
                            aria-label="Resize charts and logs"
                            onKeyDown={onLogsSeparatorKeyDown}
                            className={styles.separator}
                        />
                        <Splitter.Panel
                            id="logs"
                            defaultSize="50%"
                            minSize="5rem"
                            collapsible
                            collapsedSize="2rem"
                        >
                            <section aria-label="Logs" className={styles.pane}>
                                <div className={styles.bar}>
                                    <h2 className={styles.tab}>Logs</h2>
                                    <span className={styles.scope}>
                                        {scope}
                                    </span>
                                    {following ? (
                                        <span className={styles.status}>
                                            Following
                                        </span>
                                    ) : (
                                        <Clickable.Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setFollowing(true)}
                                            className={styles.jump}
                                        >
                                            <ArrowDownToLine aria-hidden="true" />
                                            Jump to latest
                                        </Clickable.Button>
                                    )}
                                </div>
                                {/* a scroll container takes the focus, so the keyboard scrolls it */}
                                <div
                                    ref={tail}
                                    role="log"
                                    aria-label="Log tail"
                                    aria-live="off"
                                    // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard
                                    tabIndex={0}
                                    onScroll={onTailScroll}
                                    className={styles.tail}
                                >
                                    <ol className={styles.lines}>
                                        {lines.map((line) => (
                                            <li
                                                key={line.id}
                                                data-level={line.level}
                                                className={styles.logLine}
                                            >
                                                <span className={styles.time}>
                                                    {formatTime(line.time)}
                                                </span>
                                                <span
                                                    className={
                                                        styles.level[line.level]
                                                    }
                                                >
                                                    {line.level}
                                                </span>
                                                <span
                                                    data-testid="log-service"
                                                    className={
                                                        styles.logService
                                                    }
                                                >
                                                    {line.service}
                                                </span>
                                                <span
                                                    className={styles.message}
                                                >
                                                    {line.message}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </section>
                        </Splitter.Panel>
                    </Splitter.Group>
                </Splitter.Panel>
                <Splitter.Separator
                    aria-label="Resize inspector"
                    className={styles.separator}
                />
                <Splitter.Panel
                    id="inspector"
                    defaultSize="17rem"
                    minSize="13rem"
                    maxSize="35%"
                    collapsible
                >
                    <section
                        aria-label="Trace inspector"
                        className={styles.inspector}
                    >
                        <div className={styles.bar}>
                            <h2 className={styles.tab}>Traces</h2>
                            <span className={styles.status}>
                                {pinned ? "Pinned" : "Latest"}
                            </span>
                        </div>
                        <ul
                            aria-label="Recent traces"
                            className={styles.traces}
                        >
                            {traces.map((t) => (
                                <li key={t.id}>
                                    <button
                                        type="button"
                                        aria-pressed={t.id === trace?.id}
                                        onClick={() =>
                                            setPinned(
                                                pinned?.id === t.id
                                                    ? undefined
                                                    : t,
                                            )
                                        }
                                        className={styles.trace}
                                    >
                                        <span className={styles.operation}>
                                            {t.operation}
                                        </span>
                                        <span
                                            className={styles.duration(
                                                t.failed,
                                            )}
                                        >
                                            {formatMs(t.duration)}
                                            {t.failed && (
                                                <span className={styles.hidden}>
                                                    , failed
                                                </span>
                                            )}
                                        </span>
                                        <span className={styles.traceService}>
                                            {serviceName(t.service)} ·{" "}
                                            {formatTime(t.time)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {trace ? (
                            <div className={styles.detail}>
                                <h3 className={styles.traceTitle}>
                                    {trace.operation}
                                </h3>
                                <p className={styles.traceMeta}>
                                    {trace.id.slice(0, 8)} ·{" "}
                                    {trace.spans.length} spans ·{" "}
                                    {formatMs(trace.duration)}
                                </p>
                                <ol aria-label="Spans" className={styles.spans}>
                                    {waterfallOf(trace).map((bar) => (
                                        <li
                                            key={bar.id}
                                            className={styles.span}
                                        >
                                            <span
                                                className={styles.spanName(
                                                    bar.depth,
                                                )}
                                            >
                                                {serviceName(bar.service)}{" "}
                                                {bar.label}
                                            </span>
                                            <span
                                                className={styles.spanDuration}
                                            >
                                                {bar.duration}
                                                {bar.failed && (
                                                    <span
                                                        className={
                                                            styles.hidden
                                                        }
                                                    >
                                                        , failed
                                                    </span>
                                                )}
                                            </span>
                                            <svg
                                                viewBox="0 0 100 10"
                                                preserveAspectRatio="none"
                                                aria-hidden="true"
                                                className={styles.track}
                                            >
                                                <rect
                                                    x={bar.x}
                                                    width={bar.width}
                                                    y={0}
                                                    height={10}
                                                    className={styles.spanBar(
                                                        bar.failed,
                                                    )}
                                                />
                                            </svg>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ) : (
                            <p className={styles.empty}>
                                No traces for {scope}.
                            </p>
                        )}
                    </section>
                </Splitter.Panel>
            </Splitter.Group>
        </div>
    );
}
