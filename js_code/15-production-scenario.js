/**
 * Q15: Production Scenario — Multi-API orchestration
 *
 * Call: User API → Order API → Payment API → Notification API
 *
 * Questions asked in senior interviews:
 *  1. Which APIs can run in parallel?
 *  2. What if Payment API fails?
 *  3. How will you retry?
 *  4. How will you prevent duplicate payments?
 *  5. How will you implement timeout?
 *  6. How will you circuit-break failing services?
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Utilities ---

function withTimeout(promise, ms, label) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out`)), ms)
  );
  return Promise.race([promise, timer]);
}

async function retryWithBackoff(fn, retries = 3, base = 200) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await delay(base * 2 ** i);
    }
  }
}

// --- Simple Circuit Breaker ---
class CircuitBreaker {
  constructor(threshold = 3, cooldown = 10000) {
    this._failures = 0;
    this._threshold = threshold;
    this._cooldown = cooldown;
    this._open = false;
    this._openedAt = null;
  }

  async call(fn) {
    if (this._open) {
      if (Date.now() - this._openedAt < this._cooldown) {
        throw new Error("Circuit is OPEN — service unavailable");
      }
      this._open = false; // attempt half-open
      this._failures = 0;
    }

    try {
      const result = await fn();
      this._failures = 0;
      return result;
    } catch (err) {
      this._failures++;
      if (this._failures >= this._threshold) {
        this._open = true;
        this._openedAt = Date.now();
        console.error(`Circuit opened after ${this._failures} failures`);
      }
      throw err;
    }
  }
}

// --- Simulated APIs ---
async function fetchUser(userId) {
  await delay(100);
  return { id: userId, name: "Alice" };
}

async function fetchOrders(userId) {
  await delay(150);
  return [{ id: 101, userId }];
}

async function processPayment(orderId, idempotencyKey) {
  await delay(200);
  // idempotencyKey prevents duplicate charges on retry
  return { txnId: `TXN-${idempotencyKey}`, status: "success" };
}

async function sendNotification(userId, txnId) {
  await delay(80);
  console.log(`Notification sent to user ${userId} for txn ${txnId}`);
}

// --- Circuit breakers per service ---
const paymentBreaker = new CircuitBreaker(3, 10000);
const notifBreaker   = new CircuitBreaker(5, 5000);

// --- Orchestration ---
async function checkoutFlow(userId) {
  // Step 1: User and Orders can be fetched in parallel
  const [user, orders] = await Promise.all([
    withTimeout(fetchUser(userId), 2000, "fetchUser"),
    withTimeout(fetchOrders(userId), 2000, "fetchOrders"),
  ]);

  console.log("User:", user.name, "| Orders:", orders.length);

  // Step 2: Payment — must be sequential (depends on user & orders)
  // Use idempotency key to prevent duplicate charges on retry
  const idempotencyKey = `${userId}-${orders[0].id}-${Date.now()}`;

  const payment = await retryWithBackoff(
    () => paymentBreaker.call(() =>
      withTimeout(processPayment(orders[0].id, idempotencyKey), 3000, "payment")
    ),
    3
  );

  console.log("Payment:", payment.txnId);

  // Step 3: Notification — non-critical, failure is acceptable
  try {
    await notifBreaker.call(() =>
      withTimeout(sendNotification(userId, payment.txnId), 1000, "notification")
    );
  } catch (err) {
    // Notification failure should NOT fail the checkout
    console.warn("Notification failed (non-critical):", err.message);
  }

  return { user, orders, payment };
}

checkoutFlow(42).then(console.log).catch(console.error);

/**
 * Design decisions explained:
 *
 * Q1: Parallel calls → User + Orders (independent). Payment is sequential.
 * Q2: Payment failure → retried with backoff; checkout fails if all retries exhaust.
 * Q3: Retry → retryWithBackoff with exponential delay.
 * Q4: Duplicate payment prevention → idempotency key (userId + orderId + timestamp).
 *     In production: store in DB, payment gateway deduplicates on same key.
 * Q5: Timeout → withTimeout wraps each call with Promise.race.
 * Q6: Circuit breaker → opens after N failures, stops hammering the service,
 *     tries again after cooldown (half-open state).
 */
