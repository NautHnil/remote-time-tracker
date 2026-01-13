import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// ============================================================================
// DIALOG CONTEXT
// ============================================================================

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog provider");
  }
  return context;
}

// ============================================================================
// DIALOG ROOT
// ============================================================================

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

// ============================================================================
// DIALOG TRIGGER
// ============================================================================

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

// ============================================================================
// DIALOG PORTAL
// ============================================================================

interface DialogPortalProps {
  children: React.ReactNode;
  container?: Element | null;
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { open } = useDialogContext();

  if (!open) return null;

  return createPortal(children, container || document.body);
}

// ============================================================================
// DIALOG OVERLAY
// ============================================================================

interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function DialogOverlay({
  className = "",
  ...props
}: DialogOverlayProps) {
  const { onOpenChange } = useDialogContext();

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

// ============================================================================
// DIALOG CONTENT
// ============================================================================

type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: DialogSize;
  onEscapeKeyDown?: () => void;
  onInteractOutside?: () => void;
  showCloseButton?: boolean;
  preventClose?: boolean;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw]",
};

export function DialogContent({
  children,
  className = "",
  size = "md",
  onEscapeKeyDown,
  onInteractOutside,
  showCloseButton = false,
  preventClose = false,
  ...props
}: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext();
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        if (onEscapeKeyDown) {
          onEscapeKeyDown();
        } else if (!preventClose) {
          onOpenChange(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, onEscapeKeyDown, preventClose]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (onInteractOutside) {
        onInteractOutside();
      } else if (!preventClose) {
        onOpenChange(false);
      }
    }
  };

  if (!open) return null;

  return (
    <DialogPortal>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        {/* Content */}
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          className={`
            relative z-50 w-full ${sizeClasses[size]}
            bg-dark-900 rounded-2xl shadow-2xl border border-dark-700/50
            animate-in fade-in-0 zoom-in-95 duration-200
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          )}
          {children}
        </div>
      </div>
    </DialogPortal>
  );
}

// ============================================================================
// DIALOG HEADER
// ============================================================================

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({
  children,
  className = "",
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 pb-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// DIALOG FOOTER
// ============================================================================

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({
  children,
  className = "",
  ...props
}: DialogFooterProps) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 p-6 pt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// DIALOG TITLE
// ============================================================================

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({
  children,
  className = "",
  ...props
}: DialogTitleProps) {
  return (
    <h2
      className={`text-xl font-bold text-white leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}

// ============================================================================
// DIALOG DESCRIPTION
// ============================================================================

interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({
  children,
  className = "",
  ...props
}: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-dark-400 ${className}`} {...props}>
      {children}
    </p>
  );
}

// ============================================================================
// DIALOG BODY
// ============================================================================

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({
  children,
  className = "",
  ...props
}: DialogBodyProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// DIALOG CLOSE
// ============================================================================

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogClose({ children, asChild }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e);
        onOpenChange(false);
      },
    });
  }

  return (
    <button type="button" onClick={() => onOpenChange(false)}>
      {children}
    </button>
  );
}

// ============================================================================
// DIALOG ICON HEADER (Custom component for icon + title layout)
// ============================================================================

type DialogIconVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "primary";

interface DialogIconHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  variant?: DialogIconVariant;
  className?: string;
}

const iconVariantClasses: Record<DialogIconVariant, string> = {
  default: "from-dark-600 to-dark-700",
  success: "from-green-500 to-green-600",
  warning: "from-yellow-500 to-orange-500",
  error: "from-red-500 to-red-600",
  info: "from-blue-500 to-blue-600",
  primary: "from-primary-500 to-accent-500",
};

export function DialogIconHeader({
  icon,
  title,
  description,
  variant = "default",
  className = "",
}: DialogIconHeaderProps) {
  return (
    <div className={`flex items-center gap-3 p-6 pb-4 ${className}`}>
      <div
        className={`w-12 h-12 bg-gradient-to-br ${iconVariantClasses[variant]} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-dark-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ALERT BOX (For warnings/info inside dialog)
// ============================================================================

type AlertVariant = "warning" | "error" | "success" | "info";

interface AlertBoxProps {
  variant?: AlertVariant;
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertVariantClasses: Record<
  AlertVariant,
  { bg: string; border: string; text: string; title: string }
> = {
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-200/70",
    title: "text-yellow-200",
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-200/70",
    title: "text-red-200",
  },
  success: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-200/70",
    title: "text-green-200",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-200/70",
    title: "text-blue-200",
  },
};

export function AlertBox({
  variant = "info",
  icon,
  title,
  children,
  className = "",
}: AlertBoxProps) {
  const styles = alertVariantClasses[variant];

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div>
          {title && <p className={`${styles.title} font-medium`}>{title}</p>}
          <div className={`${styles.text} text-sm ${title ? "mt-1" : ""}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "ghost"
  | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  default: "bg-dark-800 text-dark-200 hover:bg-dark-700 border border-dark-700",
  primary:
    "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700",
  secondary:
    "bg-dark-700 text-dark-100 hover:bg-dark-600 border border-dark-600",
  danger:
    "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700",
  warning:
    "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600",
  ghost: "text-dark-300 hover:bg-dark-800 hover:text-dark-100",
  outline:
    "border border-dark-600 text-dark-200 hover:bg-dark-800 hover:border-dark-500",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  children,
  variant = "default",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariantClasses[variant]}
        ${buttonSizeClasses[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon && !isLoading && rightIcon}
    </button>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to manage dialog open/close state
 */
export function useDialog(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);

  const onOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
  }, []);

  const openDialog = useCallback(() => setOpen(true), []);
  const closeDialog = useCallback(() => setOpen(false), []);
  const toggleDialog = useCallback(() => setOpen((prev) => !prev), []);

  return {
    open,
    onOpenChange,
    openDialog,
    closeDialog,
    toggleDialog,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DialogBody as Body,
  DialogClose as Close,
  DialogContent as Content,
  DialogDescription as Description,
  DialogFooter as Footer,
  DialogHeader as Header,
  DialogOverlay as Overlay,
  DialogPortal as Portal,
  Dialog as Root,
  DialogTitle as Title,
  DialogTrigger as Trigger,
};
