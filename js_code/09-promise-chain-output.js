/**
 * Q9: Promise Chain — Output Prediction
 *
 * Trace through a .then/.catch chain where an error is thrown mid-chain.
 */

Promise.resolve(1)
  .then((x) => x + 1)           // x = 1 → returns 2
  .then((x) => {
    throw new Error("Oops");     // skips next .then, jumps to .catch
  })
  .then((x) => console.log(x))  // SKIPPED — upstream threw
  .catch((err) => console.log(err.message)) // "Oops"
  .then(() => console.log("After Catch"));  // runs — .catch returned normally

/**
 * Output:
 *   Oops
 *   After Catch
 *
 * Key rules:
 *  1. A throw inside .then jumps to the nearest downstream .catch
 *  2. .then between the throw and .catch are all skipped
 *  3. After a .catch handles the error (returns normally), the chain RESUMES
 *     as if everything is fine — subsequent .then callbacks run
 *  4. If .catch itself throws, it propagates to the next .catch
 */

// Extended example — catch that re-throws
Promise.resolve()
  .then(() => {
    throw new Error("First");
  })
  .catch((err) => {
    console.log("Caught:", err.message); // runs
    throw new Error("Second");           // re-throw
  })
  .catch((err) => {
    console.log("Caught again:", err.message); // runs
  })
  .then(() => {
    console.log("Chain continues"); // runs
  });

/**
 * Output:
 *   Caught: First
 *   Caught again: Second
 *   Chain continues
 */
