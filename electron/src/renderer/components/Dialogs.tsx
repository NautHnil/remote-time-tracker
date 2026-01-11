import { useEffect, useState } from "react";
import { Icons } from "./Icons";

// ==================== ConfirmDialog ====================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-blue-600 hover:bg-blue-700",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
        <p className="text-gray-300 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== PromptDialog ====================
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
  validation?: (value: string) => string | null; // Returns error message or null
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

    // Validate if validation function provided
    if (validation) {
      const validationError = validation(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onConfirm(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
        <p className="text-gray-300 mb-4">{message}</p>
        <form onSubmit={handleSubmit}>
          <input
            type={inputType}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null); // Clear error on change
            }}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex gap-3 justify-end mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== AlertDialog ====================
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
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          bgColor: "bg-green-600",
          icon: <Icons.Check className="w-6 h-6 text-white" />,
        };
      case "error":
        return {
          bgColor: "bg-red-600",
          icon: <Icons.X className="w-6 h-6 text-white" />,
        };
      case "warning":
        return {
          bgColor: "bg-yellow-600",
          icon: <Icons.Warning className="w-6 h-6 text-white" />,
        };
      default:
        return {
          bgColor: "bg-blue-600",
          icon: <Icons.Info className="w-6 h-6 text-white" />,
        };
    }
  };

  const { bgColor, icon } = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
          >
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-300 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2 ${bgColor} text-white rounded-lg hover:opacity-90 transition`}
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Custom Hooks ====================

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
    confirmButtonClass?: string;
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
    // Call onCancel callback if provided
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
