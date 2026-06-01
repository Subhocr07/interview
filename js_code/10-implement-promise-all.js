/**
 * Q10: Implement Promise.all from scratch
 *
 * Very common for 5+ year experience interviews.
 * Must handle: ordering, early rejection, empty array, non-promise values.
 */

function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return resolve([]); // edge case

    const results = new Array(promises.length);
    let completed = 0;

    promises.forEach((promise, index) => {
      // Wrap in Promise.resolve so non-promise values work too
      Promise.resolve(promise)
        .then((result) => {
          results[index] = result; // preserve order
          completed++;

          if (completed === promises.length) {
            resolve(results);
          }
        })
        .catch(reject); // any rejection immediately rejects the whole thing
    });
  });
}

// --- Test it ---
myPromiseAll([
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]

myPromiseAll([
  Promise.resolve("A"),
  Promise.reject("Boom"),
  Promise.resolve("C"),
]).catch(console.log); // "Boom"

myPromiseAll([]).then(console.log); // []

myPromiseAll([1, 2, 3]).then(console.log); // [1, 2, 3] (non-promise values)

/**
 * Follow-up: Implement Promise.allSettled
 */
function myPromiseAllSettled(promises) {
  return Promise.all(
    promises.map((p) =>
      Promise.resolve(p)
        .then((value) => ({ status: "fulfilled", value }))
        .catch((reason) => ({ status: "rejected", reason }))
    )
  );
}

/**
 * Follow-up: Implement Promise.race
 */
function myPromiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((p) => Promise.resolve(p).then(resolve).catch(reject));
  });
}

/**
 * Follow-up: Implement Promise.any
 * Resolves with the first fulfilled; rejects only if ALL reject.
 */
function myPromiseAny(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) return reject(new AggregateError([], "All promises were rejected"));

    let rejectedCount = 0;
    const errors = new Array(promises.length);

    promises.forEach((p, index) => {
      Promise.resolve(p)
        .then(resolve)
        .catch((err) => {
          errors[index] = err;
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        });
    });
  });
}
