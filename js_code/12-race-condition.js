/**
 * Q12: Async Race Condition
 *
 * Why does count end up as 1 instead of 2?
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let count = 0;

async function increment() {
  const current = count;  // both read 0 at the "same time"
  await delay(100);       // both yield here
  count = current + 1;    // both write 0 + 1 = 1
}

async function demo() {
  await Promise.all([
    increment(), // reads count=0, awaits, writes 1
    increment(), // ALSO reads count=0, awaits, writes 1  ← overwrites!
  ]);

  console.log(count); // 1, not 2!
}

demo();

/**
 * Why is count 1?
 *
 * Both calls read `count = 0` BEFORE either await returns.
 * Both compute `0 + 1 = 1`.
 * The second write clobbers the first — the increment from the first is lost.
 *
 * This is a classic read-modify-write race condition.
 * JavaScript is single-threaded but async gaps (await) allow interleaving.
 */

// --- Fix 1: Mutex / lock (serialise access) ---
class AsyncMutex {
  constructor() { this._queue = Promise.resolve(); }

  lock(fn) {
    return (this._queue = this._queue.then(fn));
  }
}

const mutex = new AsyncMutex();
let safeCount = 0;

async function safeIncrement() {
  await mutex.lock(async () => {
    const current = safeCount;
    await delay(100);
    safeCount = current + 1;
  });
}

async function safeDemo() {
  await Promise.all([safeIncrement(), safeIncrement()]);
  console.log(safeCount); // 2 ✅
}

safeDemo();

// --- Fix 2: Avoid the read-modify-write gap entirely (synchronous update) ---
let atomicCount = 0;

async function atomicIncrement() {
  await delay(100);
  atomicCount++; // increment happens synchronously after await — no gap
}

async function atomicDemo() {
  await Promise.all([atomicIncrement(), atomicIncrement()]);
  console.log(atomicCount); // 2 ✅
}

atomicDemo();

/**
 * Real-world prevention:
 *  - Atomic DB operations (SELECT FOR UPDATE, findOneAndUpdate)
 *  - Redis INCR (atomic by nature)
 *  - Optimistic locking (check version, retry on conflict)
 *  - Message queues to serialise writes
 */
