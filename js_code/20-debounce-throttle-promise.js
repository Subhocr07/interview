/**
 * Q20: Debounce & Throttle with Promise + Closure
 *
 * Classic closure interview question extended with Promise for async use cases.
 * Debounce and throttle both rely on closures to persist timer/state between calls.
 */

// ─── Debounce ────────────────────────────────────────────────────────────────
// Only executes after the user STOPS calling for `wait` ms.
// Each call resets the timer. Useful: search input, form auto-save.

function debounce(fn, wait) {
  let timer = null; // closure — persists across calls

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
}

// Debounce returning a Promise — caller can await the eventual result
function debouncePromise(fn, wait) {
  let timer = null;
  let pendingResolve = null;
  let pendingReject  = null;

  return function (...args) {
    clearTimeout(timer);

    return new Promise((resolve, reject) => {
      pendingResolve = resolve; // replace with latest caller's resolve
      pendingReject  = reject;

      timer = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          pendingResolve(result);
        } catch (err) {
          pendingReject(err);
        }
      }, wait);
    });
  };
}

// Demo
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  await delay(100); // simulate API
  return `Results for: ${query}`;
}

const debouncedSearch = debouncePromise(search, 300);

// Rapid calls — only the last one fires the API
(async () => {
  debouncedSearch("j");
  debouncedSearch("ja");
  debouncedSearch("jav");
  const result = await debouncedSearch("java"); // only this hits the API
  console.log(result); // "Results for: java"
})();


// ─── Throttle ────────────────────────────────────────────────────────────────
// Executes at most once per `wait` ms — ignores calls in between.
// Useful: scroll handlers, button click spam prevention.

function throttle(fn, wait) {
  let lastRan = 0; // closure — tracks when fn last executed

  return function (...args) {
    const now = Date.now();
    if (now - lastRan >= wait) {
      lastRan = now;
      fn.apply(this, args);
    }
  };
}

// Throttle with Promise — queues the last skipped call for execution after cooldown
function throttlePromise(fn, wait) {
  let lastRan = 0;
  let pending = null; // closure — holds next queued call

  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - lastRan);

    if (remaining <= 0) {
      lastRan = now;
      return Promise.resolve(fn.apply(this, args));
    }

    // Schedule/replace the pending call
    if (pending) clearTimeout(pending.timer);

    return new Promise((resolve, reject) => {
      pending = {
        timer: setTimeout(() => {
          lastRan = Date.now();
          pending = null;
          Promise.resolve(fn.apply(this, args)).then(resolve).catch(reject);
        }, remaining),
      };
    });
  };
}

/**
 * Debounce vs Throttle — interview summary:
 *
 * Debounce:  waits for activity to STOP, then fires ONCE.
 *            "Fire after the user stops typing for 300ms"
 *
 * Throttle:  fires at most ONCE per interval regardless of how many calls come in.
 *            "Fire at most once per 200ms even if scroll fires 60fps"
 *
 * Both use closures to maintain:
 *  - timer reference (to clear/reset)
 *  - lastRan timestamp (throttle)
 *  - pending Promise resolvers (async variants)
 */

/**
 * Follow-up: What is the closure capturing in debounce?
 *
 * `timer` — a reference to the current setTimeout handle.
 *   - Persists between calls because it lives in the outer function's scope.
 *   - Each new call can clearTimeout(timer) because the closure still holds it.
 *   - If timer were a local variable inside the returned function, each call
 *     would get a fresh `null` — clearTimeout would have nothing to cancel.
 */
