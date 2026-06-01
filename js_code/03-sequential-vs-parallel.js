/**
 * Q3: Sequential vs Parallel Async Execution
 *
 * Understand the performance difference and when to use each.
 */

// Simulate API calls
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUser()     { await delay(300); return { id: 1, name: "Alice" }; }
async function fetchOrders()   { await delay(200); return [{ id: 101 }, { id: 102 }]; }
async function fetchPayments() { await delay(400); return [{ amount: 500 }]; }

// --- Sequential: total time = 300 + 200 + 400 = 900ms ---
async function loadDataSequential() {
  console.time("sequential");
  const user     = await fetchUser();
  const orders   = await fetchOrders();
  const payments = await fetchPayments();
  console.timeEnd("sequential"); // ~900ms
  return { user, orders, payments };
}

// --- Parallel: total time = max(300, 200, 400) = 400ms ---
async function loadDataParallel() {
  console.time("parallel");
  const [user, orders, payments] = await Promise.all([
    fetchUser(),
    fetchOrders(),
    fetchPayments(),
  ]);
  console.timeEnd("parallel"); // ~400ms
  return { user, orders, payments };
}

loadDataSequential();
loadDataParallel();

/**
 * When to AVOID Promise.all:
 *  1. Tasks are dependent on each other (e.g. must have userId before fetching orders)
 *  2. One failure should NOT cancel unrelated work → use Promise.allSettled instead
 *  3. Side effects that must happen in order (e.g. write then confirm)
 *  4. Limited server resources / rate limits that don't allow burst calls
 */
