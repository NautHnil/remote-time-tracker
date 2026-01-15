// Dialog Components
export { AlertDialog } from "./AlertDialog";
export { ConfirmDialog } from "./ConfirmDialog";
export { LogoutConfirmDialog } from "./LogoutConfirmDialog";
export { PromptDialog } from "./PromptDialog";
export { QuitAppConfirmDialog } from "./QuitAppConfirmDialog";

// Dialog Hooks
export {
  useAlertDialog,
  useConfirmDialog,
  useLogoutConfirmDialog,
  usePromptDialog,
  useQuitAppConfirmDialog,
} from "../../hooks/useDialogs";

// Re-export UI primitives for convenience
export {
  AlertBox,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconHeader,
  DialogTitle,
  useDialog,
} from "./Dialog";
