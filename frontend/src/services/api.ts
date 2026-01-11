/**
 * @deprecated This file is deprecated. Import from individual service files instead.
 *
 * Old import:
 * import { timeLogAPI, screenshotAPI } from "./services/api";
 *
 * New import:
 * import { timeLogService, screenshotService } from "./services";
 *
 * Or backward compatible:
 * import { timeLogAPI, screenshotAPI } from "./services";
 */

// Re-export all services for backward compatibility
export {
  API_BASE_URL,
  apiClient,
  authAPI,
  authService,
  screenshotAPI,
  screenshotService,
  syncAPI,
  syncService,
  taskAPI,
  taskService,
  timeLogAPI,
  timeLogService,
} from "./index";

export type { ApiResponse } from "./apiClient";

// Default export (apiClient)
export { apiClient as default } from "./apiClient";
