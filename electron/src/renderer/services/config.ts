/**
 * API Configuration
 * Centralized configuration for API calls
 */

// API Base URL from environment variable
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

// API timeout (30 seconds)
export const API_TIMEOUT = 30000;

// Retry configuration
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000;

// Request headers
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    ME: "/auth/me",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
  },

  // Time Logs
  TIMELOGS: {
    START: "/timelogs/start",
    STOP: "/timelogs/stop",
    PAUSE: "/timelogs/pause",
    RESUME: "/timelogs/resume",
    ACTIVE: "/timelogs/active",
    LIST: "/timelogs",
    BY_ID: (id: number) => `/timelogs/${id}`,
    STATS: "/timelogs/stats",
  },

  // Screenshots
  SCREENSHOTS: {
    LIST: "/screenshots",
    TODAY_COUNT: "/screenshots/today/count",
    BY_ID: (id: number) => `/screenshots/${id}`,
    BY_TIMELOG: (timelogId: number) => `/screenshots/timelog/${timelogId}`,
    BY_TASK: (taskId: number) => `/screenshots/task/${taskId}`,
    RANGE: "/screenshots/range",
    STATS: "/screenshots/stats",
    DELETE: (id: number) => `/screenshots/${id}`,
    VIEW: (id: number) => `/screenshots/${id}/view`,
    DOWNLOAD: (id: number) => `/screenshots/${id}/download`,
  },

  // Tasks
  TASKS: {
    LIST: "/tasks",
    CREATE: "/tasks",
    BY_ID: (id: number) => `/tasks/${id}`,
    UPDATE: (id: number) => `/tasks/${id}`,
    DELETE: (id: number) => `/tasks/${id}`,
  },

  // Sync
  SYNC: {
    BATCH: "/sync/batch",
  },

  // Presence
  PRESENCE: {
    HEARTBEAT: "/presence/heartbeat",
  },
} as const;
