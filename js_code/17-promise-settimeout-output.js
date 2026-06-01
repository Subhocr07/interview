/**
 * Q17: Predict Output — Promise + setTimeout + Closure (chained)
 *
 * These are common in senior interviews to test event loop + closure mastery.
 */

// --- Puzzle 1 ---
const log = (val) => () => console.log(val); // closure factory

setTimeout(log("A"), 0);
Promise.resolve().then(log("B"));
Promise.resolve().then(() => setTimeout(log("C"), 0));
Promise.resolve().then(log("D"));
setTimeout(log("E"), 0);

/**
 * Step-by-step:
 *  Sync:      log("A") is called immediately to build the fn → setTimeout queues fn
 *             log("B") is called immediately → Promise schedules the fn (microtask)
 *             log("C") is called immediately → Promise schedules fn (microtask)
 *             log("D") is called immediately → Promise schedules fn (microtask)
 *             log("E") is called immediately → setTimeout queues fn
 *
 * Wait — log(val) RETURNS a function, it doesn't log yet!
 *
 * Microtask queue: [fn→"B", fn→scheduleC, fn→"D"]
 * Macrotask queue: [fn→"A", fn→"E"]
 *
 * Run microtasks first:
 *   fn→"B"       → logs B
 *   fn→scheduleC → runs setTimeout(log("C"), 0) → adds C to macrotask queue
 *   fn→"D"       → logs D
 *
 * Then macrotasks:
 *   fn→"A" → logs A
 *   fn→"E" → logs E
 *   fn→"C" → logs C  (queued AFTER A and E were already in queue)
 *
 * Output: B, D, A, E, C
 */

// --- Puzzle 2 ---
console.log("1");

setTimeout(() => {
  console.log("2");
  Promise.resolve().then(() => console.log("3"));
}, 0);

Promise.resolve().then(() => {
  console.log("4");
  setTimeout(() => console.log("5"), 0);
});

console.log("6");

/**
 * Walkthrough:
 *  Sync:      "1", "6"
 *  Microtask: "4", schedules setTimeout→"5"
 *  Macrotask: setTimeout from line 1 → logs "2", then schedules microtask→"3"
 *    After that macrotask drains microtasks: "3"
 *  Macrotask: setTimeout→"5"
 *
 * Output: 1, 6, 4, 2, 3, 5
 *
 * Key rule: after EACH macrotask, drain ALL microtasks before the next macrotask.
 */

// --- Puzzle 3: Closure + async value capture ---
const results = [];

for (let i = 0; i < 3; i++) {
  Promise.resolve(i).then((val) => {
    setTimeout(() => {
      results.push(val); // captures resolved value, NOT loop variable
    }, 0);
  });
}

setTimeout(() => {
  console.log(results); // [0, 1, 2] — correct, because Promise resolved with snapshot
}, 100);

/**
 * Why does this work correctly (unlike the var+setTimeout loop)?
 *
 * Promise.resolve(i) resolves with the VALUE of i at that moment (0, 1, 2).
 * The .then callback receives `val` — a new binding per microtask.
 * Even with `var i`, the value is already captured in the Promise's resolved value.
 */
