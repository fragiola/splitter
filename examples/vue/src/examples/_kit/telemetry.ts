// Demo data for the observability console: fictional services whose latency and error rate walk at
// random, the log lines and traces they write, and a feed that advances them a few times a second.
// Seeded, so the same seed gives the same services, the same history and the same ticks. App
// content and app policy, not part of the splitter. Copy this file and change it freely.
//
// The feed ticks on a timer only while it plays, and not while the document is hidden; it never
// fetches. Its clock is its own (each tick is `TICK_MS` later), so the log times do not depend on
// the machine's.

export type ServiceId =
    | "gateway"
    | "accounts"
    | "catalog"
    | "search"
    | "checkout"
    | "payments";

export type Level = "info" | "warn" | "error";

/** How a service is doing, from its latest error rate. */
export type Health = "healthy" | "degraded" | "failing";

/** How many points a service keeps for its charts. */
export const HISTORY = 60;

/** How many log lines the feed keeps, newest last. */
export const LOG_LIMIT = 200;

/** How many traces the feed keeps, newest first. */
export const TRACE_LIMIT = 24;

/** How far the feed's clock moves on each tick, in milliseconds. */
export const TICK_MS = 500;

/** When the feed's clock starts: a fixed morning, so the same seed writes the same times. */
const START = Date.UTC(2026, 0, 12, 9, 30, 0);

export interface Service {
    readonly id: ServiceId;
    readonly name: string;
    /** the p95 latency of the last `HISTORY` ticks, in milliseconds, oldest first */
    readonly latency: readonly number[];
    /** the error rate of the last `HISTORY` ticks, in percent, oldest first */
    readonly errors: readonly number[];
    /** requests a second, now */
    readonly requests: number;
}

export interface LogLine {
    readonly id: number;
    /** on the feed's clock, in milliseconds */
    readonly time: number;
    readonly service: ServiceId;
    readonly level: Level;
    readonly message: string;
    readonly traceId?: string;
}

export interface Span {
    readonly id: string;
    readonly service: ServiceId;
    readonly name: string;
    /** from the trace's start, in milliseconds */
    readonly start: number;
    readonly duration: number;
    /** 0 for the root span, 1 for what it calls, … */
    readonly depth: number;
    readonly failed: boolean;
}

export interface Trace {
    readonly id: string;
    /** the service the request entered */
    readonly service: ServiceId;
    readonly operation: string;
    /** on the feed's clock, in milliseconds */
    readonly time: number;
    readonly duration: number;
    readonly failed: boolean;
    /** the root span first, each span before what it calls */
    readonly spans: readonly Span[];
}

/** Everything the console shows, at one tick. A tick makes a new object; nothing is mutated. */
export interface Telemetry {
    readonly tick: number;
    /** the feed's clock, in milliseconds */
    readonly time: number;
    readonly services: readonly Service[];
    readonly logs: readonly LogLine[];
    readonly traces: readonly Trace[];
}

interface Profile {
    readonly name: string;
    /** the p95 latency it drifts around, in milliseconds */
    readonly latency: number;
    /** the error rate it drifts around, in percent */
    readonly errors: number;
    readonly requests: number;
    /** what a request to it calls */
    readonly calls: readonly ServiceId[];
    readonly operations: readonly string[];
}

const PROFILES: Record<ServiceId, Profile> = {
    gateway: {
        name: "Gateway",
        latency: 48,
        errors: 0.2,
        requests: 1840,
        calls: ["accounts", "catalog", "search"],
        operations: ["GET /", "GET /api/session"],
    },
    accounts: {
        name: "Accounts",
        latency: 82,
        errors: 0.3,
        requests: 420,
        calls: [],
        operations: ["POST /login", "GET /profile"],
    },
    catalog: {
        name: "Catalog",
        latency: 64,
        errors: 0.1,
        requests: 960,
        calls: ["search"],
        operations: ["GET /products", "GET /products/:id"],
    },
    search: {
        name: "Search",
        latency: 118,
        errors: 0.4,
        requests: 610,
        calls: [],
        operations: ["GET /search", "GET /suggest"],
    },
    checkout: {
        name: "Checkout",
        latency: 156,
        errors: 0.6,
        requests: 140,
        calls: ["accounts", "catalog", "payments"],
        operations: ["POST /cart", "POST /orders"],
    },
    payments: {
        name: "Payments",
        latency: 212,
        errors: 0.8,
        requests: 90,
        calls: [],
        operations: ["POST /charges", "POST /refunds"],
    },
};

/** The services, in the order the rail lists them. */
export const SERVICE_IDS: readonly ServiceId[] = [
    "gateway",
    "accounts",
    "catalog",
    "search",
    "checkout",
    "payments",
];

const RESOURCES = ["orders", "products", "sessions", "carts", "users"];
const TABLES = ["orders", "line_items", "inventory", "accounts"];

/** A seeded random source in [0, 1) (mulberry32): the same seed, the same numbers. */
export function randomSource(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let x = state;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(items: readonly T[], random: () => number): T {
    return items[Math.floor(random() * items.length)] as T;
}

function hex(random: () => number, length: number): string {
    let text = "";
    for (let i = 0; i < length; i++) {
        text += Math.floor(random() * 16).toString(16);
    }
    return text;
}

/** The name the console shows for a service. */
export function serviceName(id: ServiceId): string {
    return PROFILES[id].name;
}

/** How a service is doing, from an error rate in percent. */
export function healthOf(errors: number): Health {
    if (errors >= 2.5) return "failing";
    if (errors >= 1.2) return "degraded";
    return "healthy";
}

/** The last value of a series (0 for an empty one). */
export function latest(values: readonly number[]): number {
    return values[values.length - 1] ?? 0;
}

/** A time on the feed's clock as `hh:mm:ss.mmm` (UTC, so every machine writes the same). */
export function formatTime(time: number): string {
    return new Date(time).toISOString().slice(11, 23);
}

/** Whether the reader asked for less motion: the feed then starts paused. */
export function prefersReducedMotion(): boolean {
    try {
        return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
}

/** An incident: a service slower and failing more for a while. */
interface Incident {
    readonly service: ServiceId;
    readonly until: number;
}

/** What advances from tick to tick besides the telemetry itself. */
interface Simulation {
    readonly random: () => number;
    incident: Incident | undefined;
    nextLog: number;
}

/** A walk pulled back towards a target, so a long run stays readable. */
function walk(
    value: number,
    target: number,
    spread: number,
    random: () => number,
): number {
    const noise = (random() - 0.5) * 2 * spread * target;
    return Math.max(value + (target - value) * 0.25 + noise, 0);
}

function round(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function nextService(
    service: Service,
    simulation: Simulation,
    tick: number,
): Service {
    const { random, incident } = simulation;
    const profile = PROFILES[service.id];
    const hit = incident?.service === service.id && tick < incident.until;
    const spike = random() < 0.04 ? 1.8 : 1;
    const latency = walk(
        latest(service.latency),
        profile.latency * (hit ? 2.6 : 1) * spike,
        0.12,
        random,
    );
    const errors = walk(
        latest(service.errors),
        profile.errors + (hit ? 3.2 : 0),
        0.3,
        random,
    );
    return {
        ...service,
        latency: [...service.latency.slice(1 - HISTORY), Math.round(latency)],
        errors: [...service.errors.slice(1 - HISTORY), round(errors, 2)],
        requests: Math.round(
            walk(service.requests, profile.requests, 0.05, random),
        ),
    };
}

function traceOf(
    service: ServiceId,
    time: number,
    latency: (id: ServiceId) => number,
    failing: (id: ServiceId) => boolean,
    random: () => number,
): Trace {
    const id = hex(random, 16);
    const spans: Span[] = [];
    // each span calls its service's dependencies one after the other, inside its own time
    function span(on: ServiceId, name: string, start: number, depth: number) {
        const duration = Math.max(
            Math.round(latency(on) * (0.4 + random() * 0.6)),
            2,
        );
        const failed = failing(on) && random() < 0.5;
        const index = spans.length;
        spans.push({
            id: hex(random, 8),
            service: on,
            name,
            start,
            duration,
            depth,
            failed,
        });
        const calls = depth < 2 ? PROFILES[on].calls : [];
        let at = start + Math.round(duration * 0.1);
        for (const call of calls) {
            if (random() < 0.3) continue;
            const child = span(
                call,
                pick(PROFILES[call].operations, random),
                at,
                depth + 1,
            );
            at = child.start + child.duration + 1;
        }
        // a span lasts at least as long as what it called
        const self = spans[index] as Span;
        const end = Math.max(self.start + self.duration, at);
        spans[index] = {
            ...self,
            duration: end - self.start,
            failed: self.failed || spans.slice(index + 1).some((s) => s.failed),
        };
        return spans[index] as Span;
    }
    const root = span(
        service,
        pick(PROFILES[service].operations, random),
        0,
        0,
    );
    return {
        id,
        service,
        operation: root.name,
        time,
        duration: root.duration,
        failed: root.failed,
        spans,
    };
}

function logOf(
    simulation: Simulation,
    time: number,
    service: Service,
    trace: Trace | undefined,
): LogLine {
    const { random } = simulation;
    const errors = latest(service.errors);
    const roll = random() * 100;
    const level: Level =
        roll < errors * 4 ? "error" : roll < errors * 4 + 8 ? "warn" : "info";
    const ms = Math.round(latest(service.latency) * (0.5 + random()));
    const resource = pick(RESOURCES, random);
    const upstream = pick(SERVICE_IDS, random);
    let message: string;
    if (level === "error") {
        message = pick(
            [
                `POST /api/${resource} 500 in ${ms} ms`,
                `upstream ${upstream} timed out after ${ms * 4} ms`,
                `connection reset by ${upstream}`,
            ],
            random,
        );
    } else if (level === "warn") {
        message = pick(
            [
                `slow query on ${pick(TABLES, random)} took ${ms * 2} ms`,
                `retrying ${upstream} (attempt 2 of 3)`,
                `pool at ${70 + Math.floor(random() * 25)}% of its connections`,
            ],
            random,
        );
    } else {
        message = pick(
            [
                `GET /api/${resource} 200 in ${ms} ms`,
                `POST /api/${resource} 201 in ${ms} ms`,
                `cache hit for ${resource}`,
                `served ${service.requests} requests in the last second`,
            ],
            random,
        );
    }
    return {
        id: simulation.nextLog++,
        time,
        service: service.id,
        level,
        message,
        ...(trace && trace.service === service.id ? { traceId: trace.id } : {}),
    };
}

/** The telemetry one tick later. Advances `simulation` (its random source, its counters). */
function advance(telemetry: Telemetry, simulation: Simulation): Telemetry {
    const { random } = simulation;
    const tick = telemetry.tick + 1;
    const time = telemetry.time + TICK_MS;
    if (
        simulation.incident === undefined ||
        tick >= simulation.incident.until
    ) {
        simulation.incident =
            random() < 0.03
                ? {
                      service: pick(SERVICE_IDS, random),
                      until: tick + 10 + Math.floor(random() * 20),
                  }
                : undefined;
    }
    const services = telemetry.services.map((service) =>
        nextService(service, simulation, tick),
    );
    const byId = new Map(services.map((service) => [service.id, service]));
    const of = (id: ServiceId) => byId.get(id) as Service;
    // a new trace on most ticks, through the service a request is likeliest to enter
    const trace =
        random() < 0.7
            ? traceOf(
                  pick(
                      ["gateway", "gateway", "checkout", "catalog", "search"],
                      random,
                  ),
                  time,
                  (id) => latest(of(id).latency),
                  (id) => healthOf(latest(of(id).errors)) !== "healthy",
                  random,
              )
            : undefined;
    const lines: LogLine[] = [];
    const count = 1 + Math.floor(random() * 3);
    for (let n = 0; n < count; n++) {
        const service =
            trace && n === 0 ? of(trace.service) : pick(services, random);
        lines.push(
            logOf(
                simulation,
                time + Math.floor(random() * TICK_MS),
                service,
                trace,
            ),
        );
    }
    lines.sort((a, b) => a.time - b.time);
    return {
        tick,
        time,
        services,
        logs: [...telemetry.logs, ...lines].slice(-LOG_LIMIT),
        traces: trace
            ? [trace, ...telemetry.traces].slice(0, TRACE_LIMIT)
            : telemetry.traces,
    };
}

/** The first telemetry: the services at rest, then `HISTORY` ticks, so the charts start full. */
function warmUp(simulation: Simulation): Telemetry {
    let telemetry: Telemetry = {
        tick: 0,
        time: START,
        services: SERVICE_IDS.map((id) => {
            const profile = PROFILES[id];
            return {
                id,
                name: profile.name,
                latency: [profile.latency],
                errors: [profile.errors],
                requests: profile.requests,
            };
        }),
        logs: [],
        traces: [],
    };
    for (let n = 1; n < HISTORY; n++) {
        telemetry = advance(telemetry, simulation);
    }
    return telemetry;
}

export type TelemetryListener = (telemetry: Telemetry) => void;

/**
 * The console's feed: while it plays, a new `Telemetry` every `interval` milliseconds (not while
 * the document is hidden), told to its listeners. Paused, it holds the last one.
 */
export interface TelemetryFeed {
    readonly playing: boolean;
    /** the telemetry now */
    current(): Telemetry;
    play(): void;
    pause(): void;
    /** one tick now, playing or not */
    step(): void;
    subscribe(listener: TelemetryListener): () => void;
    /** pauses and forgets the listeners */
    dispose(): void;
}

export function createTelemetryFeed(
    options: { readonly seed?: number; readonly interval?: number } = {},
): TelemetryFeed {
    const simulation: Simulation = {
        random: randomSource(options.seed ?? 7),
        incident: undefined,
        nextLog: 1,
    };
    const interval = options.interval ?? TICK_MS;
    const listeners = new Set<TelemetryListener>();
    let telemetry = warmUp(simulation);
    let playing = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const hidden = () =>
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";

    function step() {
        telemetry = advance(telemetry, simulation);
        for (const listener of listeners) listener(telemetry);
    }
    // the timer runs only while the feed plays and the document shows
    function sync() {
        const run = playing && !hidden();
        if (run && timer === undefined) timer = setInterval(step, interval);
        if (!run && timer !== undefined) {
            clearInterval(timer);
            timer = undefined;
        }
    }
    // while it plays, the feed follows the document's visibility
    function setPlaying(next: boolean) {
        if (next !== playing && typeof document !== "undefined") {
            if (next) document.addEventListener("visibilitychange", sync);
            else document.removeEventListener("visibilitychange", sync);
        }
        playing = next;
        sync();
    }

    return {
        get playing() {
            return playing;
        },
        current: () => telemetry,
        play: () => setPlaying(true),
        pause: () => setPlaying(false),
        step,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        dispose() {
            setPlaying(false);
            listeners.clear();
        },
    };
}
