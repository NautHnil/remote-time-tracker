import { Icons } from "../Icons";
import { StatusBadge } from "./ui";

export type UpdateStep =
  | "idle"
  | "checking"
  | "available"
  | "download-pending" // New: waiting for download to start
  | "downloading"
  | "downloaded"
  | "installing"
  | "up-to-date"
  | "error";

interface UpdateSectionProps {
  version: string;
  step: UpdateStep;
  availableVersion: string | null;
  progress: number;
  errorMessage: string;
  onCheck: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
  onInstall: () => void | Promise<void>;
}

export function UpdateSection({
  version,
  step,
  availableVersion,
  progress,
  errorMessage,
  onCheck,
  onDownload,
  onInstall,
}: UpdateSectionProps) {

  const getStatusConfig = () => {
    switch (step) {
      case "idle":
        return {
          badge: "neutral" as const,
          badgeText: "Not Checked",
          icon: <Icons.Info className="w-4 h-4" />,
          description: "Click below to check for updates",
        };
      case "checking":
        return {
          badge: "warning" as const,
          badgeText: "Checking...",
          icon: <Icons.RefreshCw className="w-4 h-4 animate-spin" />,
          description: "Looking for new versions...",
        };
      case "available":
        return {
          badge: "info" as const,
          badgeText: `v${availableVersion} Available`,
          icon: <Icons.ArrowUp className="w-4 h-4" />,
          description: "A new version is ready to download",
        };
      case "download-pending":
        return {
          badge: "warning" as const,
          badgeText: "Starting...",
          icon: <Icons.Download className="w-4 h-4 animate-pulse" />,
          description: "Preparing download...",
        };
      case "downloading":
        return {
          badge: "warning" as const,
          badgeText: `${progress}%`,
          icon: <Icons.Download className="w-4 h-4 animate-pulse" />,
          description: "Downloading update...",
        };
      case "downloaded":
        return {
          badge: "success" as const,
          badgeText: "Ready",
          icon: <Icons.Check className="w-4 h-4" />,
          description: "Update downloaded and ready to install",
        };
      case "installing":
        return {
          badge: "warning" as const,
          badgeText: "Installing...",
          icon: <Icons.RefreshCw className="w-4 h-4 animate-spin" />,
          description: "Installing update, app will restart...",
        };
      case "up-to-date":
        return {
          badge: "success" as const,
          badgeText: "Up to Date",
          icon: <Icons.Check className="w-4 h-4" />,
          description: "You have the latest version",
        };
      case "error":
        return {
          badge: "error" as const,
          badgeText: "Error",
          icon: <Icons.X className="w-4 h-4" />,
          description: errorMessage || "An error occurred",
        };
      default:
        return {
          badge: "neutral" as const,
          badgeText: "Unknown",
          icon: <Icons.Info className="w-4 h-4" />,
          description: "",
        };
    }
  };

  const statusConfig = getStatusConfig();

  const renderActionButton = () => {
    const baseClasses =
      "w-full flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all duration-200";

    switch (step) {
      case "idle":
      case "up-to-date":
      case "error":
        return (
          <button
            onClick={onCheck}
            className={`${baseClasses} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40`}
          >
            <Icons.RefreshCw className="w-5 h-5" />
            Check for Updates
          </button>
        );
      case "checking":
        return (
          <button
            disabled
            className={`${baseClasses} bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed`}
          >
            <Icons.RefreshCw className="w-5 h-5 animate-spin" />
            Checking...
          </button>
        );
      case "available":
        return (
          <button
            onClick={onDownload}
            className={`${baseClasses} bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40`}
          >
            <Icons.Download className="w-5 h-5" />
            Download v{availableVersion}
          </button>
        );
      case "download-pending":
        return (
          <button
            disabled
            className={`${baseClasses} bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed`}
          >
            <Icons.Download className="w-5 h-5 animate-pulse" />
            Starting download...
          </button>
        );
      case "downloading":
        return (
          <button
            disabled
            className={`${baseClasses} bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed`}
          >
            <Icons.Download className="w-5 h-5 animate-pulse" />
            Downloading... {progress}%
          </button>
        );
      case "downloaded":
        return (
          <button
            onClick={onInstall}
            className={`${baseClasses} bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40`}
          >
            <Icons.RefreshCw className="w-5 h-5" />
            Install & Restart
          </button>
        );
      case "installing":
        return (
          <button
            disabled
            className={`${baseClasses} bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed`}
          >
            <Icons.RefreshCw className="w-5 h-5 animate-spin" />
            Installing...
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current Version
            </span>
            <Icons.Package className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            v{version}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Status
            </span>
            <StatusBadge status={statusConfig.badge}>
              {statusConfig.icon}
              {statusConfig.badgeText}
            </StatusBadge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {statusConfig.description}
          </p>
        </div>
      </div>

      {step === "downloading" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Downloading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {renderActionButton()}
    </div>
  );
}
