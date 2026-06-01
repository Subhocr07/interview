/**
 * Q18: Stale Closure in Async Code
 *
 * A subtle and common bug: a closure captures a variable, but by the time
 * the async callback runs, the variable has been reassigned externally.
 */

// --- Example 1: Stale closure in event handler ---
let user = { name: "Alice" };

function greetLater() {
  const snapshot = user; // close over current reference

  setTimeout(() => {
    console.log("Hello,", snapshot.name); // always "Alice" — closed over snapshot
  }, 1000);
}

greetLater();
user = { name: "Bob" }; // reassign — snapshot is unaffected

/**
 * Output: "Hello, Alice"
 *
 * `snapshot` holds the object reference at the time greetLater() was called.
 * Reassigning `user` doesn't affect `snapshot`.
 *
 * BUT — if you mutate the object instead of reassigning:
 */

let config = { timeout: 3000 };

setTimeout(() => {
  console.log(config.timeout); // reads CURRENT value of config.timeout
}, 500);

config.timeout = 5000; // mutation — the closure sees the new value

/**
 * Output: 5000
 *
 * The closure holds a reference to the SAME object.
 * Mutation is visible through the reference; reassignment is not.
 */

// --- Example 2: React-style stale closure (classic hook bug pattern) ---
function makeCounter() {
  let count = 0;

  function getCount() { return count; }

  function increment() { count++; }

  // Stale closure: captures count=0 at creation time
  function delayedLog() {
    const captured = count;
    setTimeout(() => {
      console.log("captured:", captured); // always 0
      console.log("live:    ", getCount()); // reads current count
    }, 1000);
  }

  return { increment, delayedLog, getCount };
}

const counter = makeCounter();
counter.delayedLog(); // captures count=0
counter.increment();
counter.increment();
counter.increment();

/**
 * After 1s output:
 *   captured: 0   ← stale — closed over old value
 *   live:     3   ← fresh — calls getCount() which reads current count
 *
 * Fix: always access mutable state through a getter/ref, not a direct capture.
 */

// --- Example 3: Promise + stale closure ---
let status = "pending";

const p = new Promise((resolve) => {
  setTimeout(resolve, 100);
});

p.then(() => {
  console.log(status); // reads LIVE value at the time .then fires
});

status = "ready"; // changed before promise resolves

/**
 * Output: "ready"
 *
 * The .then callback doesn't close over `status` at the point Promise
 * was created — it reads `status` from the enclosing scope when it executes.
 * Since `status` changed before the promise resolved, it sees "ready".
 */

// --- Fix pattern: capture the value explicitly if you need the snapshot ---
let currentStatus = "pending";

const p2 = new Promise((resolve) => setTimeout(resolve, 100));
const statusAtCreation = currentStatus; // snapshot

p2.then(() => {
  console.log(statusAtCreation); // always "pending" regardless of later changes
});

currentStatus = "ready";
