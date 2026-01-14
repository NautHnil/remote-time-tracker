import { useEffect, useState } from "react";
import { Icons } from "./Icons";
import {
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
} from "./ui/Dialog";

// ============================================================================
// CONFIRM DIALOG
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const buttonVariant =
    variant === "danger"
      ? "danger"
      : variant === "warning"
      ? "warning"
      : "primary";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" preventClose={isLoading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-gray-600 dark:text-dark-300 whitespace-pre-line">
            {message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PROMPT DIALOG
// ============================================================================

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: "text" | "number" | "email" | "password";
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  validation?: (value: string) => string | null;
  isLoading?: boolean;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  inputType = "text",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  validation,
  isLoading = false,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validation) {
      const validationError = validation(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onConfirm(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" preventClose={isLoading}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <input
              type={inputType}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              autoFocus
              disabled={isLoading}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="default"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ALERT DIALOG
// ============================================================================

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "info" | "success" | "error" | "warning";
  closeText?: string;
}

export function AlertDialog({
  isOpen,
  title,
  message,
  onClose,
  type = "info",
  closeText = "OK",
}: AlertDialogProps) {
  const getIconAndVariant = () => {
    switch (type) {
      case "success":
        return {
          icon: <Icons.Check className="w-6 h-6 text-white" />,
          variant: "success" as const,
          buttonVariant: "primary" as const,
        };
      case "error":
        return {
          icon: <Icons.X className="w-6 h-6 text-white" />,
          variant: "error" as const,
          buttonVariant: "danger" as const,
        };
      case "warning":
        return {
          icon: <Icons.Warning className="w-6 h-6 text-white" />,
          variant: "warning" as const,
          buttonVariant: "warning" as const,
        };
      default:
        return {
          icon: <Icons.Info className="w-6 h-6 text-white" />,
          variant: "info" as const,
          buttonVariant: "primary" as const,
        };
    }
  };

  const { icon, variant, buttonVariant } = getIconAndVariant();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogIconHeader icon={icon} title={title} variant={variant} />
        <DialogBody className="pt-0">
          <p className="text-gray-600 dark:text-dark-300 whitespace-pre-line">
            {message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant={buttonVariant} onClick={onClose}>
            {closeText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// LOGOUT CONFIRM DIALOG
// ============================================================================

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  isTracking: boolean;
  taskTitle?: string;
  elapsedTime?: number;
  isManualTask?: boolean;
  onConfirmLogout: () => void;
  onStopAndLogout: (taskTitle: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmDialog({
  isOpen,
  isTracking,
  taskTitle,
  elapsedTime = 0,
  isManualTask = false,
  onConfirmLogout,
  onStopAndLogout,
  onCancel,
  isLoading = false,
}: LogoutConfirmDialogProps) {
  const [inputTaskTitle, setInputTaskTitle] = useState(taskTitle || "");

  // Reset input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputTaskTitle(taskTitle || "");
    }
  }, [isOpen, taskTitle]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleStopAndLogout = () => {
    // For manual tasks, use the existing task title
    // For auto-track tasks, use the input value or generate default
    if (isManualTask && taskTitle) {
      onStopAndLogout(taskTitle);
    } else {
      const finalTitle = inputTaskTitle.trim() || "";
      onStopAndLogout(finalTitle);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" preventClose={isLoading}>
        <DialogIconHeader
          icon={<Icons.Logout className="w-6 h-6 text-white" />}
          title="Sign Out"
          description={
            isTracking ? "Active session detected" : "Confirm logout"
          }
          variant="warning"
        />

        <DialogBody className="pt-0">
          {isTracking ? (
            <div className="space-y-4">
              <AlertBox
                variant="warning"
                icon={<Icons.Warning className="w-5 h-5 text-yellow-500" />}
                title="Time tracking has been paused"
              >
                Please stop and save the current session before logging out, or
                cancel to resume tracking.
              </AlertBox>

              <div className="bg-gray-100 dark:bg-dark-800/50 rounded-xl p-4 space-y-3">
                {isManualTask ? (
                  // For manual tasks, show the task title as read-only
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-dark-400 text-sm">
                      Current Task
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium text-sm truncate max-w-[200px]">
                      {taskTitle || "Untitled Task"}
                    </span>
                  </div>
                ) : (
                  // For auto-track tasks, show an input to save task title
                  <div className="space-y-2">
                    <label className="text-gray-500 dark:text-dark-400 text-sm">
                      Task Title (optional)
                    </label>
                    <input
                      type="text"
                      value={inputTaskTitle}
                      onChange={(e) => setInputTaskTitle(e.target.value)}
                      placeholder="Enter a title for this work session..."
                      className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-dark-400 text-sm">
                    Time Tracked
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 font-mono font-semibold">
                    {formatDuration(elapsedTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-dark-400 text-sm">
                    Status
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      Paused
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-dark-300">
              Are you sure you want to sign out? You will need to log in again
              to access your account.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          {isTracking ? (
            <Button
              variant="warning"
              onClick={handleStopAndLogout}
              isLoading={isLoading}
              leftIcon={<Icons.Stop className="w-4 h-4" />}
            >
              Stop & Sign Out
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={onConfirmLogout}
              isLoading={isLoading}
            >
              Sign Out
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// QUIT APP CONFIRM DIALOG
// ============================================================================

interface QuitAppConfirmDialogProps {
  isOpen: boolean;
  isTracking: boolean;
  taskTitle?: string;
  elapsedTime?: number;
  isManualTask?: boolean;
  onConfirmQuit: () => void;
  onStopAndQuit: (taskTitle: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function QuitAppConfirmDialog({
  isOpen,
  isTracking,
  taskTitle,
  elapsedTime = 0,
  isManualTask = false,
  onConfirmQuit,
  onStopAndQuit,
  onCancel,
  isLoading = false,
}: QuitAppConfirmDialogProps) {
  const [inputTaskTitle, setInputTaskTitle] = useState(taskTitle || "");

  // Reset input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputTaskTitle(taskTitle || "");
    }
  }, [isOpen, taskTitle]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleStopAndQuit = () => {
    // For manual tasks, use the existing task title
    // For auto-track tasks, use the input value or generate default
    if (isManualTask && taskTitle) {
      onStopAndQuit(taskTitle);
    } else {
      const finalTitle = inputTaskTitle.trim() || "";
      onStopAndQuit(finalTitle);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" preventClose={isLoading}>
        <DialogIconHeader
          icon={<Icons.X className="w-6 h-6 text-white" />}
          title="Quit Application"
          description={isTracking ? "Active session detected" : "Confirm quit"}
          variant="error"
        />

        <DialogBody className="pt-0">
          {isTracking ? (
            <div className="space-y-4">
              <AlertBox
                variant="warning"
                icon={<Icons.Warning className="w-5 h-5 text-yellow-500" />}
                title="Time tracking has been paused"
              >
                Please stop and save the current session before quitting, or
                cancel to resume tracking.
              </AlertBox>

              <div className="bg-gray-100 dark:bg-dark-800/50 rounded-xl p-4 space-y-3">
                {isManualTask ? (
                  // For manual tasks, show the task title as read-only
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-dark-400 text-sm">
                      Current Task
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium text-sm truncate max-w-[200px]">
                      {taskTitle || "Untitled Task"}
                    </span>
                  </div>
                ) : (
                  // For auto-track tasks, show an input to save task title
                  <div className="space-y-2">
                    <label className="text-gray-500 dark:text-dark-400 text-sm">
                      Task Title (optional)
                    </label>
                    <input
                      type="text"
                      value={inputTaskTitle}
                      onChange={(e) => setInputTaskTitle(e.target.value)}
                      placeholder="Enter a title for this work session..."
                      className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-dark-400 text-sm">
                    Time Tracked
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 font-mono font-semibold">
                    {formatDuration(elapsedTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-dark-400 text-sm">
                    Status
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      Paused
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-dark-300">
              Are you sure you want to quit the application? The app will
              continue running in the system tray.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          {isTracking ? (
            <Button
              variant="warning"
              onClick={handleStopAndQuit}
              isLoading={isLoading}
              leftIcon={<Icons.Stop className="w-4 h-4" />}
            >
              Stop & Quit
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={onConfirmQuit}
              isLoading={isLoading}
            >
              Quit App
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook to manage confirm dialog state
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    variant?: "default" | "danger" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const show = (config: Omit<typeof state, "isOpen">) => {
    setState({ ...config, isOpen: true });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return { state, show, close };
}

/**
 * Hook to manage prompt dialog state
 */
export function usePromptDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue: string;
    inputType?: "text" | "number" | "email" | "password";
    onConfirm: (value: string) => void;
    onCancel?: () => void;
    validation?: (value: string) => string | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    defaultValue: "",
    onConfirm: () => {},
  });

  const show = (config: Omit<typeof state, "isOpen">) => {
    setState({ ...config, isOpen: true });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (state.onCancel) {
      state.onCancel();
    }
    close();
  };

  return { state, show, close: handleCancel };
}

/**
 * Hook to manage alert dialog state
 */
export function useAlertDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const show = (config: Omit<typeof state, "isOpen">) => {
    setState({ ...config, isOpen: true });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return { state, show, close };
}

/**
 * Hook to manage logout confirm dialog state
 */
export function useLogoutConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    isTracking: boolean;
    taskTitle?: string;
    elapsedTime?: number;
    isManualTask?: boolean;
  }>({
    isOpen: false,
    isTracking: false,
    taskTitle: "",
    elapsedTime: 0,
    isManualTask: false,
  });

  const show = (config: Omit<typeof state, "isOpen">) => {
    setState({ ...config, isOpen: true });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return { state, show, close };
}

/**
 * Hook to manage quit app confirm dialog state
 */
export function useQuitAppConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    isTracking: boolean;
    taskTitle?: string;
    elapsedTime?: number;
    isManualTask?: boolean;
  }>({
    isOpen: false,
    isTracking: false,
    taskTitle: "",
    elapsedTime: 0,
    isManualTask: false,
  });

  const show = (config: Omit<typeof state, "isOpen">) => {
    setState({ ...config, isOpen: true });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return { state, show, close };
}

// ============================================================================
// RE-EXPORT UI COMPONENTS
// ============================================================================

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
} from "./ui/Dialog";
