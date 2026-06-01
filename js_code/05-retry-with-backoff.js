/**
 * Q5: Retry an async function up to N times
 *
 * Implement retry logic, then extend with exponential backoff.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Basic retry ---
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    return retry(fn, retries - 1);
  }
}

// --- With exponential backoff ---
// Wait time doubles after each failure: 100ms, 200ms, 400ms, 800ms...
async function retryWithBackoff(fn, retries = 3, baseDelay = 100) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;

      const waitTime = baseDelay * 2 ** attempt; // 100, 200, 400...
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`);
      await delay(waitTime);
    }
  }
}

// --- With jitter (recommended for distributed systems to avoid thundering herd) ---
async function retryWithJitter(fn, retries = 3, baseDelay = 100) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;

      const exponential = baseDelay * 2 ** attempt;
      const jitter = Math.random() * baseDelay;
      const waitTime = exponential + jitter;
      await delay(waitTime);
    }
  }
}

// --- Demo ---
let callCount = 0;

async function unstableApi() {
  callCount++;
  if (callCount < 3) throw new Error("Service unavailable");
  return "Success!";
}

(async () => {
  try {
    const result = await retryWithBackoff(unstableApi);
    console.log(result); // "Success!" on 3rd attempt
  } catch (err) {
    console.error("All retries exhausted:", err.message);
  }
})();

/**
 * Follow-up Q: When should you NOT retry?
 *
 * Do NOT retry on:
 *  - 400 Bad Request (client bug, retrying won't help)
 *  - 401 Unauthorized / 403 Forbidden
 *  - 404 Not Found
 *
 * DO retry on:
 *  - 429 Too Many Requests (with backoff)
 *  - 500/502/503/504 (transient server errors)
 *  - Network timeouts
 */
