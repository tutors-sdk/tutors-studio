/**
 * Whether Studio is in the middle of changing a course or putting it online: applying a plan, saving or
 * publishing. An update never installs while it is (STU-0181, ADR 0046). Counted, so work that overlaps is
 * covered until the last of it ends.
 */
let running = 0;

export const studioBusy = {
  get now(): boolean {
    return running > 0;
  },
  async during<T>(work: () => Promise<T>): Promise<T> {
    running++;
    try {
      return await work();
    } finally {
      running--;
    }
  },
};
