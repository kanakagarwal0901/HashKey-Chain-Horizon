// Asynchronous Mutex for Strict Linearizable Concurrency Control
export class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked: boolean = false;

  public async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          next();
        } else {
          this.locked = false;
        }
      };

      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => resolve(release));
      }
    });
  }
}
