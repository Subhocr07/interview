/**
 * Q4: Implement a delay() utility
 *
 * Create a function that pauses async execution for N milliseconds.
 * This is the async/await equivalent of sleep() in other languages.
 */

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Usage
async function main() {
  console.log("Before delay");
  await delay(2000);
  console.log("After 2 sec");
}

main();

/**
 * Follow-up extensions:
 */

// 1. Delay that also passes a value through
function delayWithValue(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// 2. Cancellable delay using AbortController
function cancellableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("Delay cancelled"));
    });
  });
}

async function cancellableExample() {
  const controller = new AbortController();

  setTimeout(() => controller.abort(), 500); // cancel after 500ms

  try {
    await cancellableDelay(2000, controller.signal);
    console.log("Completed");
  } catch (err) {
    console.log(err.message); // "Delay cancelled"
  }
}

cancellableExample();
