import { useState } from "react";

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
