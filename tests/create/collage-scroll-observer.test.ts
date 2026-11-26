import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollageScrollScene } from "@/app/components/create/use-collage-scroll-scene";

// Exercise the hook's actual DOM subscriptions without a hosted preview or browser globals.
const hooks = vi.hoisted(() => ({
  effect: undefined as undefined | (() => void | (() => void)),
  state: { progress: 0, width: 1200 },
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void | (() => void)) => { hooks.effect = effect; },
  useState: (initial: typeof hooks.state) => [initial, (update: (previous: typeof hooks.state) => typeof hooks.state) => { hooks.state = update(hooks.state); }],
}));

function sceneFixture(inPanel = false) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const observe = vi.fn(), disconnect = vi.fn();
  const view = Object.assign(new EventTarget(), {
    getComputedStyle: (node: { overflowY?: string }) => ({ overflowY: node.overflowY ?? "visible" }),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; }),
    cancelAnimationFrame: vi.fn((id: number) => { frames.delete(id); }),
    ResizeObserver: class { observe = observe; disconnect = disconnect; constructor(public callback: () => void) {} },
  });
  const body = {}, documentElement = {};
  const panel = Object.assign(new EventTarget(), {
    parentElement: body, overflowY: "auto", clientTop: 2,
    // Initially there is no overflow: late-loading media must not change the selected root.
    scrollHeight: 100, clientHeight: 100,
    getBoundingClientRect: () => ({ top: 100 }),
  });
  const sceneRect = { top: inPanel ? -398 : -500, height: 1800 };
  const pinRect = { width: 600, height: 800 };
  const scene = { parentElement: inPanel ? panel : body, ownerDocument: { body, documentElement, defaultView: view }, getBoundingClientRect: () => sceneRect };
  const pin = { getBoundingClientRect: () => pinRect };
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); };
  const mount = (enabled = true) => {
    // React hooks are mocked above to run and inspect the subscription effect directly.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCollageScrollScene({ current: scene as unknown as HTMLDivElement }, { current: pin as unknown as HTMLDivElement }, enabled);
    return hooks.effect?.();
  };
  return { view, panel, sceneRect, pinRect, observe, disconnect, frames, flush, mount };
}

beforeEach(() => { hooks.effect = undefined; hooks.state = { progress: 0, width: 1200 }; });

describe("collage scroll subscriptions", () => {
  it("uses its owner frame's APIs without a global window or ResizeObserver", () => {
    const fixture = sceneFixture();
    const cleanup = fixture.mount();
    expect(hooks.state).toEqual({ progress: 0.5, width: 600 });
    expect(fixture.observe).toHaveBeenCalledTimes(2);
    cleanup?.();
  });

  it("subscribes to an initially non-overflowing panel and includes its border", () => {
    const fixture = sceneFixture(true);
    const cleanup = fixture.mount();
    expect(hooks.state.progress).toBe(0.5);
    fixture.sceneRect.top = -648;
    fixture.panel.dispatchEvent(new Event("scroll"));
    fixture.flush();
    expect(hooks.state.progress).toBe(0.75);
    expect(fixture.observe).toHaveBeenCalledTimes(3);
    cleanup?.();
  });

  it("coalesces scroll events, remeasures resized pins and supports reverse scroll", () => {
    const fixture = sceneFixture();
    const cleanup = fixture.mount();
    fixture.sceneRect.top = -200;
    fixture.pinRect.width = 390;
    fixture.view.dispatchEvent(new Event("scroll"));
    fixture.view.dispatchEvent(new Event("resize"));
    fixture.view.dispatchEvent(new Event("scroll"));
    expect(fixture.view.requestAnimationFrame).toHaveBeenCalledTimes(1);
    fixture.flush();
    expect(hooks.state).toEqual({ progress: 0.2, width: 390 });
    cleanup?.();
  });

  it("removes listeners, disconnects observation and cancels pending work", () => {
    const fixture = sceneFixture();
    const cleanup = fixture.mount();
    fixture.view.dispatchEvent(new Event("scroll"));
    cleanup?.();
    expect(fixture.frames.size).toBe(0);
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    fixture.view.dispatchEvent(new Event("scroll"));
    fixture.view.dispatchEvent(new Event("resize"));
    expect(fixture.view.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when scroll motion is disabled", () => {
    const fixture = sceneFixture();
    expect(fixture.mount(false)).toBeUndefined();
    expect(fixture.observe).not.toHaveBeenCalled();
    fixture.view.dispatchEvent(new Event("scroll"));
    expect(fixture.frames.size).toBe(0);
  });
});
