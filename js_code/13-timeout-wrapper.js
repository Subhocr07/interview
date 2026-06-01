/**
 * Q13: Timeout Wrapper for Promises
 *
 * Reject a promise if it doesn't resolve within N milliseconds.
 * Uses Promise.race to pit the real work against a timer.
 */

function withTimeout(promise, ms, label = "Operation") {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );

  return Promise.race([promise, timeout]);
}

// --- Demo ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function slowApi() {
  await delay(3000);
  return "data";
}

async function fastApi() {
  await delay(500);
  return "data";
}

(async () => {
  // Slow API with 1s timeout → times out
  try {
    const result = await withTimeout(slowApi(), 1000, "slowApi");
    console.log(result);
  } catch (err) {
    console.log(err.message); // "slowApi timed out after 1000ms"
  }

  // Fast API with 1s timeout → succeeds
  try {
    const result = await withTimeout(fastApi(), 1000, "fastApi");
    console.log(result); // "data"
  } catch (err) {
    console.log(err.message);
  }
})();

/**
 * Follow-up: withTimeout + cleanup (cancel the timer to avoid leaks)
 */
function withTimeoutClean(promise, ms) {
  let timerId;

  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error("Timeout")), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
}

/**
 * Follow-up: Apply timeout to every call in a service object
 */
function withTimeoutAll(service, ms) {
  return new Proxy(service, {
    get(target, prop) {
      const fn = target[prop];
      if (typeof fn !== "function") return fn;
      return (...args) => withTimeoutClean(fn.apply(target, args), ms);
    },
  });
}

/**
 * Production note:
 *  - HTTP clients (axios, got) have built-in timeout config — prefer those.
 *  - For DB queries, use query-level timeouts (MongoDB maxTimeMS, pg statement_timeout).
 *  - withTimeout does NOT cancel the underlying operation — the Promise still runs;
 *    you just stop waiting for it. For true cancellation, use AbortController.
 */
