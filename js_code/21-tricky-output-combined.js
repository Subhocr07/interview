/**
 * Q21: Tricky Output Questions — Promise + setTimeout + Closure combined
 *
 * These multi-concept puzzles are the hardest category in senior JS interviews.
 * Work through each one before reading the answer.
 */

// ─── Puzzle 1: Closure capturing loop index via Promise ──────────────────────

const promises = [];

for (var i = 0; i < 3; i++) {
  promises.push(
    new Promise((resolve) => {
      setTimeout(() => resolve(i), i * 100); // var i — what does this resolve with?
    })
  );
}

Promise.all(promises).then(console.log);

/**
 * Output: [3, 3, 3]
 *
 * Why? `var i` is shared across all iterations.
 * By the time any setTimeout fires (0ms, 100ms, 200ms), the loop has finished → i=3.
 * All three resolve with i=3.
 *
 * Fix: use `let` in the for loop → [0, 1, 2]
 * Or: Promise.resolve(i) to snapshot the value immediately (outside setTimeout).
 */

// ─── Puzzle 2: Async function return + setTimeout ────────────────────────────

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  let x = 1;

  setTimeout(() => {
    x = 2;           // runs after run() is done
  }, 0);

  await wait(0);     // yields to event loop — setTimeout fires here

  console.log(x);   // what is x?
}

run();

/**
 * Output: 2
 *
 * `await wait(0)` suspends `run`, allowing the setTimeout callback to execute.
 * When `run` resumes, x has already been mutated to 2 by the closure in setTimeout.
 *
 * The closure in setTimeout shares the same `x` in run()'s scope.
 */

// ─── Puzzle 3: What does this log? ───────────────────────────────────────────

function makePromise(val) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(val), 0);
  });
}

const a = makePromise("first");
const b = makePromise("second");

b.then((val) => console.log("b:", val));
a.then((val) => console.log("a:", val));

/**
 * Output:
 *   b: second
 *   a: first
 *
 * Wait — why does b log before a?
 *
 * Both setTimeout(fn, 0) callbacks are queued in order: a first, then b.
 * So a resolves first, b resolves second.
 * But the .then handlers are attached in order: b first, then a.
 * When a resolves → schedules a's microtask
 * When b resolves → schedules b's microtask
 * Microtasks run after the macrotask (setTimeout) that triggered them.
 *
 * Actually — both setTimeouts are in the macrotask queue:
 *  macrotask 1: resolve a → a's .then is queued as microtask
 *    drain microtasks: logs "a: first"
 *  macrotask 2: resolve b → b's .then is queued as microtask
 *    drain microtasks: logs "b: second"
 *
 * Final output: a: first, b: second
 *
 * ✏️ Interviewer trap: "b.then is written first so b logs first" — WRONG.
 * Execution order depends on when the Promise RESOLVES, not when .then is attached.
 */

// ─── Puzzle 4: Closure + Promise constructor executor timing ─────────────────

console.log("A");

const p = new Promise((resolve) => {
  console.log("B");          // executor runs SYNCHRONOUSLY
  setTimeout(() => {
    console.log("C");
    resolve("done");
  }, 0);
  console.log("D");
});

p.then((val) => console.log("E:", val));

console.log("F");

/**
 * Output: A, B, D, F, C, E: done
 *
 * A — sync
 * B — Promise executor is synchronous
 * D — still inside executor, still sync
 * F — after new Promise(...), sync
 * C — setTimeout fires (macrotask) → also calls resolve("done")
 * E — resolve triggers .then → microtask runs after C's macrotask
 */

// ─── Puzzle 5: Counter with async mutation ───────────────────────────────────

function makeAsyncCounter() {
  let count = 0; // closed over

  return {
    async increment() {
      const current = count;
      await new Promise((r) => setTimeout(r, 0)); // simulate async work
      count = current + 1; // race condition if called concurrently!
    },
    get() { return count; },
  };
}

const counter = makeAsyncCounter();

(async () => {
  await Promise.all([
    counter.increment(),
    counter.increment(),
    counter.increment(),
  ]);

  console.log(counter.get()); // ???

/**
 * Output: 1
 *
 * All 3 increments read count=0 before any await returns.
 * All 3 write 0+1=1. Classic read-modify-write race via async gap.
 *
 * Fix: remove the await, or use a mutex (see 12-race-condition.js).
 */
})();
