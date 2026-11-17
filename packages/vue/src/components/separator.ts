import { onScopeDispose } from "vue";
import {
    type SeparatorPartState,
    type UseSeparatorOptions,
    useSeparator,
} from "../composables/use-separator";
import { useGroupContext } from "../context";
import {
    definePrimitive,
    type PrimitiveProps,
    type SlotFunction,
    type SplitterComponent,
} from "../utils/primitive";
import { type RenderSlot, renderElement, toElement } from "../utils/render";

export interface SeparatorProps extends PrimitiveProps, UseSeparatorOptions {}

export interface SeparatorSlots extends RenderSlot<SeparatorPartState> {
    /** the separator's content (a grip); the primitive renders none */
    default?: SlotFunction<{ state: SeparatorPartState }>;
}

const PROPS = [
    "disabled",
    "resetOnDoubleClick",
    "as",
] as const satisfies readonly (keyof SeparatorProps)[];

/** The props a bare attribute sets to `true` (`<Splitter.Separator disabled>`). */
const BOOLEANS = [
    "disabled",
    "resetOnDoubleClick",
] as const satisfies readonly (keyof SeparatorProps)[];

/**
 * The events the engine listens to on a separator, by the listener attribute Vue gives them
 * (`@keydown` is `onKeydown`).
 */
const ENGINE_EVENTS = {
    onPointerdown: "pointerdown",
    onPointermove: "pointermove",
    onPointerup: "pointerup",
    onPointercancel: "pointercancel",
    onLostpointercapture: "lostpointercapture",
    onKeydown: "keydown",
    onDblclick: "dblclick",
} as const;

type ListenerKey = keyof typeof ENGINE_EVENTS;

const isListenerKey = (key: string): key is ListenerKey =>
    Object.hasOwn(ENGINE_EVENTS, key);

/** Calls an attribute's listener (a function, or the list `mergeProps` makes of several). */
function callListener(listener: unknown, event: Event): void {
    if (typeof listener === "function") {
        listener(event);
    } else if (Array.isArray(listener)) {
        for (const each of listener) {
            callListener(each, event);
        }
    }
}

/**
 * The separator between two neighbouring panels (`role="separator"`, Window Splitter): drag it
 * with the pointer, or focus it and use the arrows, Home, End and Enter; double click it to reset
 * its panel. Place one between each pair of panels: the n-th separator of a group, in document
 * order, is the one after its n-th panel. It has no name of its own: give it an `aria-label`.
 */
export const Separator: SplitterComponent<SeparatorProps, SeparatorSlots> =
    definePrimitive<SeparatorProps, SeparatorSlots>(
        "Separator",
        PROPS,
        (props, { attrs, slots }) => {
            const { registry } = useGroupContext("Splitter.Separator");
            const separator = useSeparator(() => props);

            // The engine listens to the element once it binds it, after Vue attached the
            // element's own listeners: the consumer's listeners for the engine's events are added
            // after each bind instead, so they run after the engine's (its key already handled,
            // `defaultPrevented` set), as in React.
            let element: HTMLElement | null = null;
            const added: [string, (event: Event) => void][] = [];
            const detach = () => {
                for (const [type, listener] of added.splice(0)) {
                    element?.removeEventListener(type, listener);
                }
            };
            const attach = () => {
                detach();
                if (!element) {
                    return;
                }
                for (const [key, type] of Object.entries(ENGINE_EVENTS)) {
                    const listener = (event: Event) =>
                        callListener(attrs[key], event);
                    element.addEventListener(type, listener);
                    added.push([type, listener]);
                }
            };
            // the registry tells its separators once the engine (un)bound them
            onScopeDispose(registry.subscribe(attach));
            onScopeDispose(detach);
            const ref = (value: unknown) => {
                separator.props.value.ref(value);
                const next = toElement(value);
                if (next !== element) {
                    detach();
                    element = next;
                    attach();
                }
            };

            return () => {
                const state = separator.state.value;
                const { ref: _ref, style, ...own } = separator.props.value;
                const rest: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(attrs)) {
                    if (!isListenerKey(key)) {
                        rest[key] = value;
                    }
                }
                return renderElement({
                    tag: "div",
                    as: props.as,
                    attrs: rest,
                    render: slots.render,
                    state,
                    ref,
                    props: own,
                    style,
                    children: slots.default
                        ? () => slots.default?.({ state })
                        : undefined,
                });
            };
        },
        BOOLEANS,
    );
