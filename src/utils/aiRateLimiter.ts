// simple in-memory rate limiter for Gemini free tier protection
type QueueTask<T> = () => Promise<T>;

class AiRateLimiter {
  private queue: QueueTask<any>[] = [];
  private active = false;

  // free-tier safety (adjust anytime)
  private readonly MIN_DELAY_MS = 13_000; // ~4–5 RPM safe
  private readonly MAX_DAILY = 18; // keep buffer under 20/day

  private dailyCount = 0;
  private dayStart = Date.now();

  // enqueue AI work and execute safely
  async schedule<T>(task: QueueTask<T>): Promise<T | null> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        try {
          // reset daily counter every 24h
          if (Date.now() - this.dayStart > 86_400_000) {
            this.dailyCount = 0;
            this.dayStart = Date.now();
          }

          // hard daily cap protection
          if (this.dailyCount >= this.MAX_DAILY) {
            return resolve(null);
          }

          const result = await task();
          this.dailyCount++;
          resolve(result);
        } catch {
          resolve(null);
        }
      });

      this.run();
    });
  }

  // process queue sequentially with delay
  private async run() {
    if (this.active) return;
    this.active = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) await job();

      await new Promise((r) => setTimeout(r, this.MIN_DELAY_MS));
    }

    this.active = false;
  }
}

export const aiRateLimiter = new AiRateLimiter();