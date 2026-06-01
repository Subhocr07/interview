/**
 * Q2: Promise.all vs Promise.allSettled
 *
 * Predict the output, then rewrite to capture all results even if one fails.
 */

const p1 = Promise.resolve("A");
const p2 = Promise.reject("Error");
const p3 = Promise.resolve("C");

// --- Part 1: Promise.all ---
// Fails fast — rejects as soon as ANY promise rejects.
Promise.all([p1, p2, p3])
  .then(console.log)   // never reached
  .catch(console.log); // Output: "Error"

// --- Part 2: Promise.allSettled ---
// Waits for ALL promises regardless of success/failure.
Promise.allSettled([p1, p2, p3]).then((results) => {
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      console.log("Fulfilled:", result.value);
    } else {
      console.log("Rejected:", result.reason);
    }
  });
});

/**
 * Promise.allSettled output:
 *   Fulfilled: A
 *   Rejected:  Error
 *   Fulfilled: C
 *
 * Rule of thumb:
 *   Promise.all      → use when ALL must succeed (e.g. auth + config + DB)
 *   Promise.allSettled → use when partial failure is acceptable (e.g. dashboards, batch jobs)
 *   Promise.race     → use when you need the FIRST result (e.g. timeout race)
 *   Promise.any      → use when you need the FIRST SUCCESS (ignores rejections)
 */
