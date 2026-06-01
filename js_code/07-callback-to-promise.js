/**
 * Q7: Convert Callback-based API to Promise
 *
 * Legacy Node.js APIs (fs, crypto, dns) use error-first callbacks.
 * Show multiple ways to convert them to Promises.
 */

const fs = require("fs");
const util = require("util");

// --- Callback style (legacy) ---
fs.readFile("test.txt", "utf8", (err, data) => {
  if (err) return console.error(err);
  console.log("Callback:", data);
});

// --- Approach 1: Manual promisification ---
function readFilePromise(path, encoding = "utf8") {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// --- Approach 2: util.promisify (Node built-in) ---
const readFile = util.promisify(fs.readFile);

// --- Approach 3: fs/promises (Node 14+ native) ---
const fsPromises = require("fs/promises");

(async () => {
  try {
    const data = await fsPromises.readFile("test.txt", "utf8");
    console.log("fs/promises:", data);
  } catch (err) {
    console.error(err.message);
  }
})();

/**
 * Generic promisify — implement your own util.promisify:
 */
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

const myReadFile = promisify(fs.readFile);

/**
 * Follow-up Q: What if the callback returns multiple success values?
 *
 * Standard util.promisify only resolves with the first result argument.
 * For multi-value callbacks (rare), resolve with an array or object manually.
 */
