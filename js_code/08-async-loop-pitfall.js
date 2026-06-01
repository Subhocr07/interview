/**
 * Q8: Async Loop Pitfall — forEach vs for...of vs Promise.all
 *
 * Understand why forEach doesn't await async callbacks.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function doSomething(item) {
  await delay(100);
  console.log("Processed:", item);
}

const arr = [1, 2, 3];

// ❌ WRONG: forEach ignores the returned Promise — fire-and-forget
async function wrongLoop() {
  arr.forEach(async (item) => {
    await doSomething(item);
  });

  console.log("Done"); // prints BEFORE items are processed!
}

// ✅ Correct Option 1: for...of — sequential, one at a time
async function sequentialLoop() {
  for (const item of arr) {
    await doSomething(item);
  }
  console.log("Done (sequential)");
}

// ✅ Correct Option 2: Promise.all — parallel, all at once
async function parallelLoop() {
  await Promise.all(arr.map(doSomething));
  console.log("Done (parallel)");
}

// ✅ Correct Option 3: for...of with index (when you need index)
async function indexedLoop() {
  for (let i = 0; i < arr.length; i++) {
    await doSomething(arr[i]);
  }
  console.log("Done (indexed)");
}

// --- Also broken: reduce with async ---
// ❌ Produces chain of Promises but doesn't await between them correctly
async function wrongReduce() {
  arr.reduce(async (acc, item) => {
    await acc; // must await previous accumulator!
    await doSomething(item);
  }, Promise.resolve());
}

// ✅ Correct reduce pattern (sequential via chaining)
async function correctReduce() {
  await arr.reduce(async (accPromise, item) => {
    await accPromise;
    await doSomething(item);
  }, Promise.resolve());
  console.log("Done (reduce)");
}

/**
 * Rule of thumb:
 *   Sequential → for...of with await
 *   Parallel   → Promise.all(arr.map(...))
 *   Partial parallel (limit N) → concurrency limiter (see 06-concurrency-limiter.js)
 */
