/**
 * Q16: Classic Closure + Loop + setTimeout
 *
 * One of the most commonly asked JS interview questions of all time.
 * Predict the output, then fix it 3 different ways.
 */

// ❌ WRONG — var is function-scoped, all callbacks share the SAME `i`
for (var i = 1; i <= 3; i++) {
  setTimeout(() => {
    console.log(i); // prints 4, 4, 4
  }, i * 1000);
}

/**
 * Why 4, 4, 4?
 *
 * `var i` is hoisted to the enclosing function scope (or global).
 * All 3 arrow functions close over the SAME variable `i`.
 * By the time any setTimeout fires (≥1s), the loop has finished → i = 4.
 * Each callback reads the current value of i, which is 4.
 */

// ✅ Fix 1: Use `let` (block-scoped — each iteration gets its own `i`)
for (let i = 1; i <= 3; i++) {
  setTimeout(() => {
    console.log(i); // 1, 2, 3
  }, i * 1000);
}

// ✅ Fix 2: IIFE — create a new scope per iteration, capture current value
for (var i = 1; i <= 3; i++) {
  (function (j) {
    setTimeout(() => {
      console.log(j); // 1, 2, 3
    }, j * 1000);
  })(i);
}

// ✅ Fix 3: Pass value via extra setTimeout argument (rarely known)
for (var i = 1; i <= 3; i++) {
  setTimeout(
    (j) => {
      console.log(j); // 1, 2, 3
    },
    i * 1000,
    i  // extra args to setTimeout are passed to the callback
  );
}

// ✅ Fix 4: Factory function that closes over a fresh binding
function makeLogger(val) {
  return () => console.log(val);
}

for (var i = 1; i <= 3; i++) {
  setTimeout(makeLogger(i), i * 1000); // 1, 2, 3
}

/**
 * Follow-up Q: What does the IIFE approach actually do?
 *
 * The IIFE runs immediately on each iteration, creating a NEW execution
 * context with its own `j` parameter. The closure inside setTimeout
 * captures `j` (a fresh copy of i), not the shared `i` variable.
 */
