import { useEffect, useState } from "react";
import { Icons } from "../Icons";
import {
  AlertBox,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
} from "../ui/Dialog";

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
                      className="input-sm"
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
