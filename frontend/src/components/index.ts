/**
 * Components Index
 * Central export point for all shared components
 */

export { default as AuthenticatedImage } from "./AuthenticatedImage";
export {
  AlertDialog,
  ConfirmDialog,
  PromptDialog,
  useAlertDialog,
  useConfirmDialog,
  usePromptDialog,
} from "./Dialogs";
export { Icons } from "./Icons";
export { default as OptimizedImage } from "./OptimizedImage";
export { default as Pagination } from "./Pagination";
export { default as ServerStatusIndicator } from "./ServerStatusIndicator";

// Admin components
export * from "./admin";
