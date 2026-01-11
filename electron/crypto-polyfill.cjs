// Polyfill for crypto.getRandomValues in Node.js environment
// This fixes the Vite dev server crash with Node 20+

if (typeof globalThis.crypto === "undefined") {
  const nodeCrypto = require("crypto");
  globalThis.crypto = {
    getRandomValues: function (buffer) {
      return nodeCrypto.randomFillSync(buffer);
    },
  };
}
