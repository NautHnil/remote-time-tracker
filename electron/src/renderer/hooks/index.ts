/**
 * Hooks Index
 * Central export point for all custom hooks
 */

export { useServerHealth } from "./useServerHealth";
export type { ServerHealthStatus } from "./useServerHealth";

// Dialog Hooks
export {
  useAlertDialog,
  useConfirmDialog,
  useLogoutConfirmDialog,
  usePromptDialog,
  useQuitAppConfirmDialog,
} from "./useDialogs";
