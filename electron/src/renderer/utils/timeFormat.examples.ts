/**
 * Example usage và test cases cho time formatting utilities
 */

import {
  formatDuration,
  formatDurationDetailed,
  formatDurationFull,
  formatDurationMinimal,
  formatDurationShort,
  formatDurationSmart,
  formatTimeHMS,
  hoursToMs,
  minutesToMs,
  parseDuration,
  secondsToMs,
} from "./timeFormat";

// ============================================
// BASIC USAGE EXAMPLES
// ============================================

console.group("📊 Basic Usage Examples");

// Default (short format)
console.log("10 seconds:", formatDuration(10000));
// Output: "10 sec"

console.log("5 minutes:", formatDuration(300000));
// Output: "5 min"

console.log("2 hours:", formatDuration(7200000));
// Output: "2 hrs"

console.groupEnd();

// ============================================
// FORMAT VARIATIONS
// ============================================

console.group("🎨 Format Variations");

const oneHour = 3600000;

console.log("Short format:", formatDurationShort(oneHour));
// Output: "1 hr"

console.log("Full format:", formatDurationFull(oneHour));
// Output: "1 hour"

console.log("Minimal format:", formatDurationMinimal(oneHour));
// Output: "1h"

console.groupEnd();

// ============================================
// MULTIPLE UNITS
// ============================================

console.group("🔢 Multiple Units");

const complexTime = 3665000; // 1h 1m 5s

console.log("1 unit (default):", formatDuration(complexTime));
// Output: "1 hr"

console.log(
  "2 units:",
  formatDuration(complexTime, { maxUnits: 2, format: "short" })
);
// Output: "1 hr 1 min"

console.log(
  "3 units:",
  formatDuration(complexTime, { maxUnits: 3, format: "short" })
);
// Output: "1 hr 1 min 5 sec"

console.log("Detailed full:", formatDurationDetailed(complexTime, "full"));
// Output: "1 hour 1 minute 5 seconds"

console.groupEnd();

// ============================================
// REAL-WORLD USE CASES
// ============================================

console.group("💼 Real-World Use Cases");

// Screenshot interval: 5 minutes
const screenshotInterval = 300000;
console.log(
  "Screenshot interval:",
  formatDurationShort(screenshotInterval),
  "or",
  formatDurationFull(screenshotInterval)
);
// Output: "5 min or 5 minutes"

// Sync interval: 1 minute
const syncInterval = 60000;
console.log(
  "Sync interval:",
  formatDurationShort(syncInterval),
  "or",
  formatDurationFull(syncInterval)
);
// Output: "1 min or 1 minute"

// Very short interval: 10 seconds
const shortInterval = 10000;
console.log(
  "Short interval:",
  formatDurationShort(shortInterval),
  "or",
  formatDurationFull(shortInterval)
);
// Output: "10 sec or 10 seconds"

// Long duration: 8 hours
const workDay = 8 * 60 * 60 * 1000;
console.log(
  "Work day:",
  formatDurationShort(workDay),
  "or",
  formatDurationFull(workDay)
);
// Output: "8 hrs or 8 hours"

console.groupEnd();

// ============================================
// SMART FORMATTING
// ============================================

console.group("🧠 Smart Formatting");

console.log("5 seconds:", formatDurationSmart(5000));
// Output: "5 sec"

console.log("90 seconds:", formatDurationSmart(90000));
// Output: "1 min 30 sec"

console.log("5 minutes:", formatDurationSmart(300000));
// Output: "5 min"

console.log("1.5 hours:", formatDurationSmart(5400000));
// Output: "1 hr 30 min"

console.log("2 hours:", formatDurationSmart(7200000));
// Output: "2 hrs"

console.groupEnd();

// ============================================
// TIME CONVERSIONS
// ============================================

console.group("🔄 Time Conversions");

console.log("30 seconds to ms:", secondsToMs(30));
// Output: 30000

console.log("5 minutes to ms:", minutesToMs(5));
// Output: 300000

console.log("2 hours to ms:", hoursToMs(2));
// Output: 7200000

console.groupEnd();

// ============================================
// PARSING DURATIONS
// ============================================

console.group("📝 Parsing Durations");

console.log("Parse '5m':", parseDuration("5m"));
// Output: 300000

console.log("Parse '30s':", parseDuration("30s"));
// Output: 30000

console.log("Parse '1h30m':", parseDuration("1h30m"));
// Output: 5400000

console.log("Parse '5 minutes':", parseDuration("5 minutes"));
// Output: 300000

console.log("Parse '2 hours 30 minutes':", parseDuration("2 hours 30 minutes"));
// Output: 9000000

console.groupEnd();

// ============================================
// HH:MM:SS FORMAT
// ============================================

console.group("⏰ HH:MM:SS Format");

console.log("30 seconds:", formatTimeHMS(30000));
// Output: "00:00:30"

console.log("5 minutes:", formatTimeHMS(300000));
// Output: "00:05:00"

console.log("1h 1m 5s:", formatTimeHMS(3665000));
// Output: "01:01:05"

console.log("8 hours:", formatTimeHMS(28800000));
// Output: "08:00:00"

console.groupEnd();

// ============================================
// COMPONENT INTEGRATION EXAMPLES
// ============================================

console.group("🔌 Component Integration");

// Settings component example
const settingsExample = {
  screenshotInterval: 300000,
  syncInterval: 60000,
};

console.log(
  `Screenshot Interval: ${formatDurationShort(
    settingsExample.screenshotInterval
  )} (${formatDurationFull(settingsExample.screenshotInterval)})`
);
// Output: "Screenshot Interval: 5 min (5 minutes)"

console.log(
  `Sync Interval: ${formatDurationShort(
    settingsExample.syncInterval
  )} (${formatDurationFull(settingsExample.syncInterval)})`
);
// Output: "Sync Interval: 1 min (1 minute)"

// Time tracker display
const elapsedTime = 3665000; // 1h 1m 5s

console.log("Timer display (HH:MM:SS):", formatTimeHMS(elapsedTime));
// Output: "Timer display (HH:MM:SS): 01:01:05"

console.log("Elapsed (short):", formatDurationShort(elapsedTime));
// Output: "Elapsed (short): 1 hr"

console.log("Elapsed (detailed):", formatDurationDetailed(elapsedTime));
// Output: "Elapsed (detailed): 1 hr 1 min 5 sec"

console.groupEnd();

// ============================================
// UI TEXT EXAMPLES
// ============================================

console.group("💬 UI Text Examples");

const intervals = [
  10000, // 10s
  30000, // 30s
  60000, // 1m
  300000, // 5m
  600000, // 10m
  1800000, // 30m
  3600000, // 1h
  7200000, // 2h
];

intervals.forEach((interval) => {
  console.log(
    `${interval}ms → Short: "${formatDurationShort(
      interval
    )}" | Full: "${formatDurationFull(
      interval
    )}" | Minimal: "${formatDurationMinimal(interval)}"`
  );
});

console.groupEnd();

// ============================================
// EXPORT FOR TESTING
// ============================================

export const examples = {
  basic: {
    tenSeconds: formatDuration(10000),
    fiveMinutes: formatDuration(300000),
    twoHours: formatDuration(7200000),
  },
  formats: {
    short: formatDurationShort(3600000),
    full: formatDurationFull(3600000),
    minimal: formatDurationMinimal(3600000),
  },
  detailed: {
    oneUnit: formatDuration(3665000),
    twoUnits: formatDuration(3665000, { maxUnits: 2 }),
    threeUnits: formatDuration(3665000, { maxUnits: 3 }),
  },
  realWorld: {
    screenshotInterval: formatDurationShort(300000),
    syncInterval: formatDurationShort(60000),
    workDay: formatDurationShort(28800000),
  },
};

// Test all functions
export function runTests() {
  const tests = [
    {
      name: "10 seconds short",
      fn: () => formatDurationShort(10000),
      expected: "10 sec",
    },
    {
      name: "5 minutes short",
      fn: () => formatDurationShort(300000),
      expected: "5 min",
    },
    {
      name: "1 hour short",
      fn: () => formatDurationShort(3600000),
      expected: "1 hr",
    },
    {
      name: "2 hours short",
      fn: () => formatDurationShort(7200000),
      expected: "2 hrs",
    },
    {
      name: "5 minutes full",
      fn: () => formatDurationFull(300000),
      expected: "5 minutes",
    },
    {
      name: "1 hour full",
      fn: () => formatDurationFull(3600000),
      expected: "1 hour",
    },
    {
      name: "5 minutes minimal",
      fn: () => formatDurationMinimal(300000),
      expected: "5m",
    },
    {
      name: "1 hour minimal",
      fn: () => formatDurationMinimal(3600000),
      expected: "1h",
    },
    {
      name: "HH:MM:SS format",
      fn: () => formatTimeHMS(3665000),
      expected: "01:01:05",
    },
    {
      name: "Parse 5m",
      fn: () => parseDuration("5m"),
      expected: 300000,
    },
    {
      name: "Parse 1h30m",
      fn: () => parseDuration("1h30m"),
      expected: 5400000,
    },
  ];

  console.group("🧪 Running Tests");

  let passed = 0;
  let failed = 0;

  tests.forEach((test) => {
    const result = test.fn();
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ ${test.name}: ${result}`);
    } else {
      failed++;
      console.error(
        `❌ ${test.name}: Expected ${test.expected}, got ${result}`
      );
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  console.groupEnd();

  return { passed, failed, total: tests.length };
}
