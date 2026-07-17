import { describe, expect, test, vi } from "vitest";

import { collectAddedMessageBodies, DebouncedMessageBodies } from "../src/content/toolbarObserver";

function node(matches: boolean, children: Node[] = []): Node {
  return {
    nodeType: 1,
    matches: vi.fn(() => matches),
    querySelectorAll: vi.fn(() => children),
  } as unknown as Node;
}

describe("toolbar mutation observer", () => {
  test("collects only added message bodies and deduplicates Gmail node reuse", () => {
    const message = node(true);
    const wrapper = node(false, [message]);
    const unrelated = node(false);

    expect(collectAddedMessageBodies([unrelated, wrapper, message])).toEqual([message]);
  });

  test("debounces mutation bursts into one relevant toolbar update", () => {
    vi.useFakeTimers();
    const onBodies = vi.fn();
    const batcher = new DebouncedMessageBodies(onBodies, 100);
    const message = node(true);

    batcher.add([node(false)]);
    batcher.add([message]);
    batcher.add([message]);
    vi.advanceTimersByTime(100);

    expect(onBodies).toHaveBeenCalledTimes(1);
    expect(onBodies).toHaveBeenCalledWith([message]);
    vi.useRealTimers();
  });
});
