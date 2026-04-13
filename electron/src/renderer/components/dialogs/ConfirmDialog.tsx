import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (checked?: boolean) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning";
  isLoading?: boolean;
  checkboxLabel?: string;
  checkboxDescription?: string;
  checkboxRequired?: boolean;
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
  checkboxLabel,
  checkboxDescription,
  checkboxRequired = false,
}: ConfirmDialogProps) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setChecked(false);
    }
  }, [isOpen]);

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
          {checkboxLabel && (
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left dark:border-dark-700 dark:bg-dark-800/60">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-900"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-dark-100">
                  {checkboxLabel}
                </span>
                {checkboxDescription && (
                  <span className="mt-1 block text-xs text-gray-600 dark:text-dark-300">
                    {checkboxDescription}
                  </span>
                )}
              </span>
            </label>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={() => onConfirm(checked)}
            isLoading={isLoading}
            disabled={checkboxRequired && !checked}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
