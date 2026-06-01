/**
 * Q14: Async Task Queue
 *
 * Implement a queue that runs tasks one at a time (FIFO),
 * even if tasks are added while others are running.
 * Common in backend-heavy interviews for job scheduling, rate limiting.
 */

class AsyncQueue {
  constructor() {
    this._queue = [];
    this._running = false;
  }

  // Add a task (thunk: () => Promise) to the queue
  async add(task) {
    this._queue.push(task);

    if (!this._running) {
      this._running = true;

      while (this._queue.length > 0) {
        const current = this._queue.shift();
        try {
          await current();
        } catch (err) {
          console.error("Task failed:", err.message);
          // continues with next task instead of crashing the queue
        }
      }

      this._running = false;
    }
  }
}

// --- Demo ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const queue = new AsyncQueue();

queue.add(async () => { await delay(300); console.log("Task 1"); });
queue.add(async () => { await delay(100); console.log("Task 2"); });
queue.add(async () => { await delay(200); console.log("Task 3"); });

/**
 * Output (always in order):
 *   Task 1
 *   Task 2
 *   Task 3
 *
 * Despite Task 2 being faster (100ms), it waits for Task 1 to finish first.
 */

// --- Extended: Queue with concurrency limit (run N tasks at a time) ---
class BoundedQueue {
  constructor(concurrency = 1) {
    this._concurrency = concurrency;
    this._queue = [];
    this._active = 0;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    while (this._active < this._concurrency && this._queue.length > 0) {
      const { task, resolve, reject } = this._queue.shift();
      this._active++;

      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this._active--;
          this._drain();
        });
    }
  }
}

(async () => {
  const bq = new BoundedQueue(2); // 2 at a time

  const results = await Promise.all([
    bq.add(async () => { await delay(300); return "A"; }),
    bq.add(async () => { await delay(100); return "B"; }),
    bq.add(async () => { await delay(200); return "C"; }),
    bq.add(async () => { await delay(50);  return "D"; }),
  ]);

  console.log(results); // ["A", "B", "C", "D"] in order
})();
