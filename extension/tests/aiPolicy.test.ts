import { describe, expect, test, vi } from "vitest";

import { canSendRemoteAi, dispatchRemoteAi } from "../src/shared/aiPolicy";

describe("remote AI trigger policy", () => {
  test("blocks automatic and unknown sources", () => {
    const dispatch = vi.fn();

    expect(canSendRemoteAi("automatic")).toBe(false);
    expect(canSendRemoteAi("unknown")).toBe(false);
    expect(dispatchRemoteAi("automatic", dispatch)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("preserves explicit user actions", () => {
    const dispatch = vi.fn();

    expect(canSendRemoteAi("explicit")).toBe(true);
    expect(dispatchRemoteAi("explicit", dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
  });
});
