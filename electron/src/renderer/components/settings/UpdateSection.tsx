import { useEffect, useState } from "react";
import { Icons } from "../Icons";
import { StatusBadge } from "./ui";

type UpdateStep =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "up-to-date"
  | "manual-install"
  | "error";

export function UpdateSection() {
  const [version, setVersion] = useState<string>("?");
  const [step, setStep] = useState<UpdateStep>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const v = await window.electronAPI.app.getVersion();
        setVersion(v);
      } catch (err) {
        console.error("Failed to get app version:", err);
      }

      unsub = window.electronAPI.updates.onEvent((payload: any) => {
        switch (payload.type) {
          case "checking-for-update":
            setStep("checking");
            setErrorMessage("");
            break;
          case "update-available":
            setStep("available");
            // Support both direct GitHub (version) and backend proxy (latest_version)
            setAvailableVersion(
              payload.info?.latest_version || payload.info?.version || null
            );
            break;
          case "update-not-available":
            setStep("up-to-date");
            setAvailableVersion(null);
            break;
          case "download-progress":
            setStep("downloading");
            setProgress(Math.round(payload.progress.percent || 0));
            break;
          case "update-downloaded":
            setStep("downloaded");
            setProgress(100);
            break;
          case "error":
            setStep("error");
            setErrorMessage(payload.error || "Unknown error");
            break;
          default:
            break;
        }
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleCheck = async () => {
    setStep("checking");
    setAvailableVersion(null);
    setProgress(0);
    setErrorMessage("");
    try {
      const res = await window.electronAPI.updates.check();
      if (!res.success) {
        setStep("error");
        setErrorMessage(res.error || "Failed to check for updates");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err?.message || String(err));
    }
  };

  const handleDownload = async () => {
    setStep("downloading");
    setProgress(0);
    try {
      const res = await window.electronAPI.updates.download();
      if (!res.success) {
        setStep("error");
        setErrorMessage(res.error || "Failed to download update");
      }
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err?.message || String(err));
    }
  };

  const handleInstall = async () => {
    setStep("installing");
    try {
      const res = await window.electronAPI.updates.install();
      if (!res.success) {
        if (res.error?.includes("Manual installation required")) {
          setStep("manual-install");
          setErrorMessage(
            "Please install the update manually from your Downloads folder."
          );
        } else {
          setStep("error");
          setErrorMessage(res.error || "Failed to install update");
        }
      }
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err?.message || String(err));
    }
  };

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
      case "manual-install":
        return {
          badge: "warning" as const,
          badgeText: "Manual Required",
          icon: <Icons.AlertTriangle className="w-4 h-4" />,
          description: "Auto-install not available on macOS",
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
            onClick={handleCheck}
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
            onClick={handleDownload}
            className={`${baseClasses} bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40`}
          >
            <Icons.Download className="w-5 h-5" />
            Download v{availableVersion}
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
            onClick={handleInstall}
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
      case "manual-install":
        return (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <div className="flex items-start gap-3">
                <Icons.AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Manual Installation Required
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Auto-install is not available on macOS (app not
                    code-signed). The update has been downloaded to your
                    Downloads folder.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleCheck}
              className={`${baseClasses} bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40`}
            >
              <Icons.RefreshCw className="w-5 h-5" />
              Check Again
            </button>
          </div>
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
