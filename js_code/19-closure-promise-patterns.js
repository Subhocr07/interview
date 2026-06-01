/**
 * Q19: Closure-based Promise Patterns
 *
 * Practical patterns that combine closure + Promise for real-world problems.
 * Each pattern is commonly asked in senior interviews.
 */

// ─── Pattern 1: once() — run async logic exactly once ───────────────────────
// No matter how many times it's called, the underlying fn runs only once.

function once(fn) {
  let promise = null;

  return function (...args) {
    if (!promise) {
      promise = Promise.resolve(fn(...args)); // cache the Promise itself
    }
    return promise; // every caller gets the same Promise
  };
}

async function fetchConfig() {
  console.log("Fetching config..."); // logs only once
  return { apiUrl: "https://api.example.com" };
}

const getConfig = once(fetchConfig);

(async () => {
  const [a, b, c] = await Promise.all([getConfig(), getConfig(), getConfig()]);
  console.log(a === b && b === c); // true — same resolved value
})();


// ─── Pattern 2: Memoize async function (cache per argument) ─────────────────
function memoizeAsync(fn) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args);

    if (!cache.has(key)) {
      // Store the Promise so concurrent calls with same key share one fetch
      cache.set(key, Promise.resolve(fn(...args)));
    }

    return cache.get(key);
  };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUser(id) {
  await delay(200);
  console.log(`DB hit for user ${id}`);
  return { id, name: `User ${id}` };
}

const cachedFetchUser = memoizeAsync(fetchUser);

(async () => {
  // Two concurrent calls with same id → only ONE DB hit
  const [u1, u2] = await Promise.all([
    cachedFetchUser(42),
    cachedFetchUser(42),
  ]);
  console.log(u1 === u2); // true — same Promise, same object

  await cachedFetchUser(42); // no DB hit — served from cache
  await cachedFetchUser(99); // DB hit — different key
})();


// ─── Pattern 3: Deferred Promise (expose resolve/reject outside) ─────────────
// Useful for bridging callback-based code or coordinating across modules.

function createDeferred() {
  let resolve, reject;

  const promise = new Promise((res, rej) => {
    resolve = res; // captured by closure
    reject = rej;
  });

  return { promise, resolve, reject };
}

const deferred = createDeferred();

// Somewhere else in code:
setTimeout(() => deferred.resolve("done!"), 500);

// Awaiting the deferred
deferred.promise.then(console.log); // "done!" after 500ms


// ─── Pattern 4: Lazy Promise (don't start until first call) ──────────────────
function lazy(fn) {
  let started = false;
  let promise = null;

  return function () {
    if (!started) {
      started = true;
      promise = fn(); // fn() kicks off the async work
    }
    return promise;
  };
}

const heavyInit = lazy(async () => {
  await delay(300);
  console.log("Heavy init ran");
  return { db: "connected" };
});

// Nothing runs yet... only starts when called:
heavyInit().then(console.log);
heavyInit(); // returns same promise, does NOT re-run


// ─── Pattern 5: timeout race using closure state ─────────────────────────────
function withTimeout(fn, ms) {
  return function (...args) {
    let timedOut = false; // closure flag shared between race arms

    const work = fn(...args).then((result) => {
      if (timedOut) return; // discard result if already timed out
      return result;
    });

    const timer = new Promise((_, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject(new Error(`Timed out after ${ms}ms`));
      }, ms)
    );

    return Promise.race([work, timer]);
  };
}

async function slowQuery() {
  await delay(1000);
  return "query result";
}

const safeQuery = withTimeout(slowQuery, 500);

safeQuery()
  .then(console.log)
  .catch((err) => console.log(err.message)); // "Timed out after 500ms"
