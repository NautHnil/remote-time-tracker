/**
 * Time formatting utilities for displaying durations
 */

export type DurationFormat = "short" | "full" | "minimal";

interface FormatDurationOptions {
  /**
   * Format style:
   * - "short": "5 min", "30 sec", "2 hr"
   * - "full": "5 minutes", "30 seconds", "2 hours"
   * - "minimal": "5m", "30s", "2h"
   */
  format?: DurationFormat;

  /**
   * Maximum number of units to display
   * Example: 1 = "5 min", 2 = "5 min 30 sec"
   */
  maxUnits?: number;

  /**
   * Whether to include zero values
   * Example: "0 hours 5 minutes" vs "5 minutes"
   */
  includeZero?: boolean;

  /**
   * Delimiter between units
   */
  delimiter?: string;
}

interface TimeUnit {
  value: number;
  short: string;
  full: string;
  minimal: string;
}

/**
 * Format milliseconds to human-readable duration
 *
 * @example
 * formatDuration(10000) // "10 sec" (default short format)
 * formatDuration(10000, { format: "full" }) // "10 seconds"
 * formatDuration(10000, { format: "minimal" }) // "10s"
 * formatDuration(300000) // "5 min"
 * formatDuration(300000, { format: "full" }) // "5 minutes"
 * formatDuration(3600000) // "1 hr"
 * formatDuration(3600000, { format: "full" }) // "1 hour"
 * formatDuration(3665000, { maxUnits: 2 }) // "1 hr 1 min"
 * formatDuration(3665000, { maxUnits: 3, format: "full" }) // "1 hour 1 minute 5 seconds"
 */
export function formatDuration(
  milliseconds: number,
  options: FormatDurationOptions = {}
): string {
  const {
    format = "short",
    maxUnits = 1,
    includeZero = false,
    delimiter = " ",
  } = options;

  // Convert to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);

  if (totalSeconds === 0) {
    return format === "short"
      ? "0 sec"
      : format === "full"
      ? "0 seconds"
      : "0s";
  }

  // Calculate time units
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const units: TimeUnit[] = [
    {
      value: hours,
      short: hours === 1 ? "hr" : "hrs",
      full: hours === 1 ? "hour" : "hours",
      minimal: "h",
    },
    {
      value: minutes,
      short: "min",
      full: minutes === 1 ? "minute" : "minutes",
      minimal: "m",
    },
    {
      value: seconds,
      short: "sec",
      full: seconds === 1 ? "second" : "seconds",
      minimal: "s",
    },
  ];

  // Filter and format units
  const parts: string[] = [];

  for (const unit of units) {
    if (unit.value > 0 || (includeZero && parts.length === 0)) {
      const label =
        format === "short"
          ? unit.short
          : format === "full"
          ? unit.full
          : unit.minimal;

      parts.push(`${unit.value}${format === "minimal" ? "" : " "}${label}`);

      if (parts.length >= maxUnits) {
        break;
      }
    }
  }

  return parts.length > 0
    ? parts.join(delimiter)
    : "0" + (format === "minimal" ? "s" : " sec");
}

/**
 * Format milliseconds to short duration (convenience wrapper)
 * @example
 * formatDurationShort(300000) // "5 min"
 * formatDurationShort(3600000) // "1 hr"
 */
export function formatDurationShort(milliseconds: number): string {
  return formatDuration(milliseconds, { format: "short" });
}

/**
 * Format milliseconds to full duration (convenience wrapper)
 * @example
 * formatDurationFull(300000) // "5 minutes"
 * formatDurationFull(3600000) // "1 hour"
 */
export function formatDurationFull(milliseconds: number): string {
  return formatDuration(milliseconds, { format: "full" });
}

/**
 * Format milliseconds to minimal duration (convenience wrapper)
 * @example
 * formatDurationMinimal(300000) // "5m"
 * formatDurationMinimal(3600000) // "1h"
 */
export function formatDurationMinimal(milliseconds: number): string {
  return formatDuration(milliseconds, { format: "minimal" });
}

/**
 * Format milliseconds to detailed duration with multiple units
 * @example
 * formatDurationDetailed(3665000) // "1 hr 1 min 5 sec"
 * formatDurationDetailed(3665000, "full") // "1 hour 1 minute 5 seconds"
 */
export function formatDurationDetailed(
  milliseconds: number,
  format: DurationFormat = "short"
): string {
  return formatDuration(milliseconds, { format, maxUnits: 3 });
}

/**
 * Convert seconds to milliseconds
 * @example
 * secondsToMs(30) // 30000
 */
export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}

/**
 * Convert minutes to milliseconds
 * @example
 * minutesToMs(5) // 300000
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Convert hours to milliseconds
 * @example
 * hoursToMs(2) // 7200000
 */
export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/**
 * Parse duration string to milliseconds
 * Supports: "5m", "30s", "2h", "1h30m", "5 minutes", etc.
 * @example
 * parseDuration("5m") // 300000
 * parseDuration("30s") // 30000
 * parseDuration("1h30m") // 5400000
 * parseDuration("5 minutes") // 300000
 */
export function parseDuration(duration: string): number {
  const regex =
    /(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/gi;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("h")) {
      totalMs += hoursToMs(value);
    } else if (unit.startsWith("m")) {
      totalMs += minutesToMs(value);
    } else if (unit.startsWith("s")) {
      totalMs += secondsToMs(value);
    }
  }

  return totalMs;
}

/**
 * Format time in HH:MM:SS format
 * @example
 * formatTimeHMS(3665000) // "01:01:05"
 * formatTimeHMS(65000) // "00:01:05"
 */
export function formatTimeHMS(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format time in compact format for mini displays
 * Shows H:MM when hours > 0, otherwise M:SS
 * @example
 * formatTimeCompact(3665000) // "1:01" (1 hour 1 minute)
 * formatTimeCompact(65000) // "1:05" (1 minute 5 seconds)
 * formatTimeCompact(5000) // "0:05" (5 seconds)
 */
export function formatTimeCompact(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    // Show H:MM format when hours > 0
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }
  // Show M:SS format when no hours
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Get smart duration format based on value
 * Auto-selects best unit (seconds, minutes, or hours)
 * @example
 * formatDurationSmart(5000) // "5 sec"
 * formatDurationSmart(300000) // "5 min"
 * formatDurationSmart(3600000) // "1 hr"
 * formatDurationSmart(7200000) // "2 hrs"
 */
export function formatDurationSmart(
  milliseconds: number,
  format: DurationFormat = "short"
): string {
  const seconds = milliseconds / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;

  // If less than 1 minute, show in seconds
  if (minutes < 1) {
    return formatDuration(milliseconds, { format, maxUnits: 1 });
  }

  // If less than 1 hour, show in minutes (and seconds if >= 2 units)
  if (hours < 1) {
    const maxUnits = seconds % 60 > 0 ? 2 : 1;
    return formatDuration(milliseconds, { format, maxUnits });
  }

  // Show in hours (and minutes if >= 2 units)
  const maxUnits = minutes % 60 > 0 ? 2 : 1;
  return formatDuration(milliseconds, { format, maxUnits });
}
