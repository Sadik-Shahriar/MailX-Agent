import { describe, expect, test } from "vitest";

import { RequestRegistry } from "../src/background/requestRegistry";

describe("request registry", () => {
  test("cancels registered requests and removes them", () => {
    const registry = new RequestRegistry();
    const controller = registry.register("request-1");

    expect(registry.cancel("request-1")).toBe(true);
    expect(controller.signal.aborted).toBe(true);
    expect(registry.size).toBe(0);
  });

  test("supersedes duplicate IDs without releasing the replacement", () => {
    const registry = new RequestRegistry();
    const first = registry.register("request-1");
    const second = registry.register("request-1");

    expect(first.signal.aborted).toBe(true);
    registry.release("request-1", first);
    expect(registry.size).toBe(1);
    registry.release("request-1", second);
    expect(registry.size).toBe(0);
  });

  test("remembers cancellation that arrives before registration", () => {
    const registry = new RequestRegistry();

    expect(registry.cancel("request-early")).toBe(true);
    const controller = registry.register("request-early");

    expect(controller.signal.aborted).toBe(true);
    expect(registry.size).toBe(0);
  });
});
