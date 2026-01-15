import { Icons } from "../Icons";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
} from "../ui/Dialog";

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
