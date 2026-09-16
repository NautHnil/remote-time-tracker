import {
  AlertBox,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogIconHeader,
} from "../dialogs/Dialog";
import { Icons } from "../Icons";
import { UpdateStep } from "./UpdateSection";

export interface UpdateInfo {
  update_available: boolean;
  latest_version?: string;
  release_date?: string;
  release_notes?: string;
  releaseNotes?: string;
  original_release_notes?: string;
  is_mandatory?: boolean;
  isMandatory?: boolean;
}

interface UpdateModalProps {
  open: boolean;
  info: UpdateInfo | null;
  step: UpdateStep;
  progress: number;
  errorMessage: string;
  onClose: () => void;
  onDownload: () => void | Promise<void>;
  onInstall: () => void | Promise<void>;
}

function formatReleaseDate(value?: string) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderReleaseNotes(notes?: string) {
  const trimmed = notes?.trim();

  if (!trimmed) {
    return (
      <p className="text-sm text-gray-500 dark:text-dark-400">
        No release notes were provided for this version.
      </p>
    );
  }

  return trimmed.split(/\r?\n/).map((line, index) => {
    const rawLine = line.trim();

    if (!rawLine) {
      return <div key={index} className="h-3" />;
    }

    const headingMatch = rawLine.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      return (
        <h4
          key={index}
          className="mt-4 first:mt-0 text-sm font-semibold text-gray-950 dark:text-white"
        >
          {cleanInlineMarkdown(headingMatch[2])}
        </h4>
      );
    }

    const bulletMatch = rawLine.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={index} className="flex gap-2 text-sm leading-6">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
          <span className="text-gray-700 dark:text-dark-200">
            {cleanInlineMarkdown(bulletMatch[1])}
          </span>
        </div>
      );
    }

    const numberedMatch = rawLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex gap-2 text-sm leading-6">
          <span className="min-w-5 flex-shrink-0 font-semibold text-blue-600 dark:text-blue-300">
            {numberedMatch[1]}.
          </span>
          <span className="text-gray-700 dark:text-dark-200">
            {cleanInlineMarkdown(numberedMatch[2])}
          </span>
        </div>
      );
    }

    return (
      <p
        key={index}
        className="text-sm leading-6 text-gray-700 dark:text-dark-200"
      >
        {cleanInlineMarkdown(rawLine)}
      </p>
    );
  });
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return false;
}

export function UpdateModal({
  open,
  info,
  step,
  progress,
  errorMessage,
  onClose,
  onDownload,
  onInstall,
}: UpdateModalProps) {
  const isMandatory = toBoolean(info?.is_mandatory ?? info?.isMandatory);
  const version = info?.latest_version;
  const releaseDate = formatReleaseDate(info?.release_date);
  const releaseNotes = info?.release_notes ?? info?.releaseNotes ?? "";
  const isDownloading = step === "download-pending" || step === "downloading";
  const isInstalling = step === "installing";
  const canInstall = step === "downloaded";
  const isBusy = isDownloading || isInstalling;
  const actionLabel = canInstall
    ? "Install & Restart"
    : isDownloading
      ? `Downloading ${progress}%`
      : isInstalling
        ? "Installing..."
        : "Update Now";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isMandatory) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="xl"
        preventClose={isMandatory}
        showCloseButton={!isMandatory}
        className="overflow-hidden"
      >
        <DialogIconHeader
          icon={
            isMandatory ? (
              <Icons.Shield className="h-6 w-6 text-white" />
            ) : (
              <Icons.Download className="h-6 w-6 text-white" />
            )
          }
          title={
            isMandatory
              ? "Required Update"
              : `Version ${version ? `v${version}` : "Update"} Available`
          }
          description={
            isMandatory
              ? "Install this version to continue using the app."
              : "Review the release notes and update when ready."
          }
          variant={isMandatory ? "warning" : "info"}
        />

        <DialogBody className="space-y-5 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-800/60">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-gray-500 dark:text-dark-400">
                <Icons.Package className="h-4 w-4" />
                New Version
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {version ? `v${version}` : "Available"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-800/60">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-gray-500 dark:text-dark-400">
                <Icons.Calendar className="h-4 w-4" />
                Release Date
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {releaseDate || "Not specified"}
              </p>
            </div>
          </div>

          {isMandatory && (
            <AlertBox
              variant="warning"
              icon={<Icons.AlertTriangle className="h-5 w-5" />}
              title="Update required"
            >
              This version is marked as mandatory. The app will remain locked
              until you download and install the latest version.
            </AlertBox>
          )}

          {step === "error" && (
            <AlertBox
              variant="error"
              icon={<Icons.AlertTriangle className="h-5 w-5" />}
              title="Update failed"
            >
              {errorMessage || "Unable to update right now."}
            </AlertBox>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Release Notes
            </h3>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-950/60">
              {renderReleaseNotes(releaseNotes)}
            </div>
          </div>

          {step === "downloading" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-dark-300">
                <span>Downloading</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {!isMandatory && (
            <Button variant="outline" onClick={onClose}>
              Later
            </Button>
          )}
          <Button
            variant={canInstall ? "primary" : "warning"}
            onClick={canInstall ? onInstall : onDownload}
            isLoading={isBusy}
            disabled={isBusy}
            leftIcon={
              canInstall ? (
                <Icons.RefreshCw className="h-4 w-4" />
              ) : (
                <Icons.Download className="h-4 w-4" />
              )
            }
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpdateModal;
