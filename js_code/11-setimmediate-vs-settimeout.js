/**
 * Q11: setImmediate vs setTimeout(fn, 0) — Event Loop Phases
 *
 * Predict the output and explain the difference.
 */

// --- Case 1: Top-level (outside I/O callback) ---
setTimeout(() => console.log("Timeout"), 0);
setImmediate(() => console.log("Immediate"), 0);

/**
 * Output: NON-DETERMINISTIC
 *   Could be: Timeout → Immediate
 *   Could be: Immediate → Timeout
 *
 * Why? At the top level, Node.js timer resolution means setTimeout(fn, 0)
 * might have already expired by the time the event loop starts the timers phase,
 * or it might not — depends on OS scheduling. setImmediate runs in the "check"
 * phase which comes AFTER the I/O poll phase.
 *
 * Event loop order:
 *   timers → pending callbacks → idle/prepare → poll → check → close callbacks
 *           ^setTimeout/setInterval^                    ^setImmediate^
 */

// --- Case 2: Inside an I/O callback — ALWAYS deterministic ---
const fs = require("fs");

fs.readFile(__filename, () => {
  setTimeout(() => console.log("A - Timeout"), 0);
  setImmediate(() => console.log("B - Immediate"));
});

/**
 * Output (always):
 *   B - Immediate
 *   A - Timeout
 *
 * Why? The I/O callback runs in the poll phase. After poll, the event loop
 * moves to the "check" phase (setImmediate) BEFORE going back to timers.
 * So inside any I/O callback, setImmediate ALWAYS runs before setTimeout(fn,0).
 *
 * Interview tip: "Use setImmediate when you want to execute AFTER the current I/O
 * event callbacks but BEFORE any timers."
 */

// --- process.nextTick vs setImmediate ---
setImmediate(() => console.log("setImmediate"));
process.nextTick(() => console.log("nextTick"));

/**
 * Output:
 *   nextTick       ← runs before ANY I/O or timers
 *   setImmediate   ← runs in check phase
 *
 * Despite the name, setImmediate is NOT immediate — nextTick is truly "next"
 * in the sense that it runs before the event loop continues at all.
 */
