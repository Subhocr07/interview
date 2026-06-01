/**
 * Q6: Limit Concurrent Async Operations
 *
 * Run 100 tasks but only 5 at a time to avoid overwhelming the server/DB.
 * Very common senior-level question.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Approach 1: Worker pool pattern ---
async function runWithLimit(tasks, limit) {
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++; // claim the next task atomically
      await tasks[current]();
    }
  }

  // Spin up `limit` workers; each one keeps consuming tasks until none remain
  await Promise.all(Array(limit).fill(null).map(worker));
}

// --- Approach 2: Chunking (simpler but less efficient — idle workers wait for slowest in chunk) ---
async function runInChunks(tasks, chunkSize) {
  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    await Promise.all(chunk.map((t) => t()));
  }
}

// --- Demo ---
function makeTask(id) {
  return async () => {
    await delay(Math.random() * 300 + 100);
    console.log(`Task ${id} done`);
  };
}

const tasks = Array.from({ length: 20 }, (_, i) => makeTask(i + 1));

(async () => {
  console.time("worker-pool");
  await runWithLimit(tasks, 5); // at most 5 running simultaneously
  console.timeEnd("worker-pool");
})();

/**
 * Why does chunking underperform the worker-pool pattern?
 *
 * Chunking: [1,2,3,4,5] → wait for ALL 5 before starting next chunk.
 *           If task 3 is slow, tasks 6-10 sit idle even though 1,2,4,5 finished.
 *
 * Worker pool: as soon as any worker finishes, it immediately picks up the next task.
 *              No idle time — always keeping exactly `limit` tasks running.
 *
 * Real-world: use p-limit, bottleneck, or async.parallelLimit from popular libraries.
 */
