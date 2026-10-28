import { createScrollMeter } from '../pet/nudges';

const offset = (t: EventTarget | null) =>
  t instanceof Document ? (t.scrollingElement?.scrollTop ?? 0) : t instanceof Element ? t.scrollTop : undefined;

// Capture phase: scroll doesn't bubble, and feeds often scroll an inner container
export function watchScroll(onThreshold: () => void) {
  const meter = createScrollMeter();
  const last = new WeakMap<EventTarget, number>();

  document.addEventListener(
    'scroll',
    (e) => {
      if (document.visibilityState !== 'visible' || !e.target) return;
      const y = offset(e.target);
      if (y === undefined) return;
      const prev = last.get(e.target);
      last.set(e.target, y);
      if (prev !== undefined && meter.add(y - prev)) onThreshold();
    },
    { capture: true, passive: true },
  );
}
