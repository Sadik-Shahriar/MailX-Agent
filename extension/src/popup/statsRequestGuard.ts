export function createStatsRequestGuard() {
  let latest = 0;

  return {
    start: () => ++latest,
    isCurrent: (request: number) => request === latest,
  };
}
