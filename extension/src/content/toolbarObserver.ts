export function collectAddedMessageBodies(nodes: Iterable<Node>): HTMLElement[] {
  const bodies = new Set<HTMLElement>();
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    const element = node as HTMLElement;
    if (element.matches(".a3s")) bodies.add(element);
    for (const body of element.querySelectorAll<HTMLElement>(".a3s")) bodies.add(body);
  }
  return [...bodies];
}

export class DebouncedMessageBodies {
  private readonly pending = new Set<Node>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly onBodies: (bodies: HTMLElement[]) => void,
    private readonly delayMs = 100,
  ) {}

  add(nodes: Iterable<Node>): void {
    for (const node of nodes) this.pending.add(node);
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const bodies = collectAddedMessageBodies(this.pending);
      this.pending.clear();
      if (bodies.length) this.onBodies(bodies);
    }, this.delayMs);
  }
}
