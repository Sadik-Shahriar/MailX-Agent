import type { RequestSource } from "./types";

export function canSendRemoteAi(source: RequestSource): boolean {
  return source === "explicit";
}

export function dispatchRemoteAi(source: RequestSource, dispatch: () => void): boolean {
  if (!canSendRemoteAi(source)) return false;
  dispatch();
  return true;
}
