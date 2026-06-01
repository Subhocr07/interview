/**
 * Q1: Output Prediction — Microtask vs Macrotask
 *
 * Predict the output of the following code.
 *
 * Key concepts:
 *  - Synchronous code runs first
 *  - process.nextTick callbacks run before Promise microtasks
 *  - Promise.then callbacks are microtasks (run before macrotasks)
 *  - setTimeout is a macrotask (runs last)
 *
 * Execution order:
 *  1. Call stack (sync)
 *  2. process.nextTick queue
 *  3. Promise microtask queue
 *  4. Macrotask queue (setTimeout, setInterval, setImmediate)
 */

console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

process.nextTick(() => {
  console.log("NextTick");
});

console.log("End");

/**
 * Output:
 *   Start
 *   End
 *   NextTick
 *   Promise
 *   Timeout
 *
 * Follow-up Q: Why does nextTick execute before Promise callbacks?
 *
 * Answer: process.nextTick has its own queue that is drained BEFORE
 * the Promise microtask queue on every iteration of the event loop.
 * Both run before any I/O or timer callbacks, but nextTick always
 * goes first — even if it was scheduled after a Promise.resolve().
 */
