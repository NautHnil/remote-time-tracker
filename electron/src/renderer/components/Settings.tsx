import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { formatDurationFull, formatDurationMinimal } from "../utils/timeFormat";
import {
  AlertDialog,
  ConfirmDialog,
  PromptDialog,
  useAlertDialog,
  useConfirmDialog,
  usePromptDialog,
} from "./Dialogs";
import { Icons } from "./Icons";

function Settings() {
  const [config, setConfig] = useState<any>({});
  const [syncStatus, setSyncStatus] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [storageSize, setStorageSize] = useState<number>(0);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Dialog hooks
  const confirmDialog = useConfirmDialog();
  const promptDialog = usePromptDialog();
  const alertDialog = useAlertDialog();

  useEffect(() => {
    loadConfig();
    loadSyncStatus();
    loadStorageSize();
    const interval = setInterval(() => {
      loadSyncStatus();
      loadStorageSize();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.config.get();
      setConfig(result);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const result = await window.electronAPI.sync.getStatus();
      setSyncStatus(result);
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const loadStorageSize = async () => {
    try {
      const result = await window.electronAPI.storage.getSize();
      if (result.success) {
        setStorageSize(result.totalSize);
      }
    } catch (error) {
      console.error("Error loading storage size:", error);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.sync.trigger();
      alertDialog.show({
        title: result.success ? "Sync Completed" : "Sync Failed",
        message:
          `Time Logs: ${result.timeLogsSynced}\n` +
          `Screenshots: ${result.screenshotsSynced}\n` +
          `${
            result.errors.length > 0
              ? "Errors: " + result.errors.join(", ")
              : ""
          }`,
        type: result.success ? "success" : "error",
      });
      await loadSyncStatus();
    } catch (error: any) {
      alertDialog.show({
        title: "Sync Failed",
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      await window.electronAPI.config.set(key, value);
      await loadConfig();
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return format(dateObj, "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleCleanupSynced = async () => {
    confirmDialog.show({
      title: "Delete Synced Screenshots",
      message:
        "This will delete all synced screenshots from local storage.\nThey are already backed up on the server.\n\nContinue?",
      onConfirm: async () => {
        confirmDialog.close();
        try {
          setCleaningUp(true);
          const result = await window.electronAPI.storage.cleanupSynced(0);
          if (result.success) {
            alertDialog.show({
              title: "Success",
              message: "Cleanup completed successfully!",
              type: "success",
            });
            await loadStorageSize();
          } else {
            alertDialog.show({
              title: "Failed",
              message: "Cleanup failed: " + result.error,
              type: "error",
            });
          }
        } catch (error: any) {
          alertDialog.show({
            title: "Failed",
            message: "Cleanup failed: " + error.message,
            type: "error",
          });
        } finally {
          setCleaningUp(false);
        }
      },
    });
  };

  const handleDeleteOld = async () => {
    promptDialog.show({
      title: "Delete Old Screenshots",
      message: "Delete screenshots older than how many days?",
      defaultValue: "30",
      inputType: "number",
      validation: (value: string) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return "Please enter a valid number of days (minimum 1)";
        }
        return null;
      },
      onConfirm: async (days: string) => {
        promptDialog.close();

        const daysNum = parseInt(days);

        confirmDialog.show({
          title: "Confirm Delete",
          message: `This will permanently delete all SYNCED screenshots older than ${daysNum} days.\n\nUnsynced screenshots will be kept to avoid data loss.\n\nContinue?`,
          confirmText: "Delete",
          variant: "danger",
          onConfirm: async () => {
            confirmDialog.close();
            try {
              setCleaningUp(true);
              const result = await window.electronAPI.storage.deleteOld(
                daysNum
              );
              if (result.success) {
                const freedMB = (
                  (result.freedBytes || 0) /
                  1024 /
                  1024
                ).toFixed(2);
                alertDialog.show({
                  title: "Success",
                  message:
                    `Old screenshots deleted successfully!\n\n` +
                    `Deleted: ${result.deletedCount || 0} files\n` +
                    `Freed: ${freedMB} MB`,
                  type: "success",
                });
                await loadStorageSize();
              } else {
                alertDialog.show({
                  title: "Failed",
                  message:
                    "Delete failed: " + (result.error || "Unknown error"),
                  type: "error",
                });
              }
            } catch (error: any) {
              console.error("Delete old screenshots error:", error);
              alertDialog.show({
                title: "Failed",
                message: "Delete failed: " + error.message,
                type: "error",
              });
            } finally {
              setCleaningUp(false);
            }
          },
        });
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-6">
        {/* Sync Status */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Sync Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status:</span>
              <span
                className={
                  syncStatus.isSyncing ? "text-yellow-400" : "text-green-400"
                }
              >
                {syncStatus.isSyncing ? "🔄 Syncing..." : "✅ Idle"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Last Sync:</span>
              <span className="text-white">
                {formatDate(syncStatus.lastSyncTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Auto-Sync:</span>
              <span className="text-white">
                {syncStatus.autoSyncEnabled ? "✅ Enabled" : "❌ Disabled"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={loading || syncStatus.isSyncing}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            {loading ? "Syncing..." : "Sync Now"}
          </button>
        </div>

        {/* Configuration */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                API URL
              </label>
              <input
                type="text"
                value={config.apiUrl || ""}
                onChange={(e) => updateConfig("apiUrl", e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Screenshot Interval (ms)
              </label>
              <input
                type="number"
                value={config.screenshotInterval || 300000}
                onChange={(e) =>
                  updateConfig("screenshotInterval", parseInt(e.target.value))
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current:{" "}
                {formatDurationMinimal(config.screenshotInterval || 300000)}{" "}
                (Default: {formatDurationFull(300000)})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Sync Interval (ms)
              </label>
              <input
                type="number"
                value={config.syncInterval || 60000}
                onChange={(e) =>
                  updateConfig("syncInterval", parseInt(e.target.value))
                }
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {formatDurationMinimal(config.syncInterval || 60000)}{" "}
                (Default: {formatDurationFull(60000)})
              </p>
            </div>
          </div>
        </div>

        {/* Storage Management */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Storage Management</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Local Storage Used</p>
                <p className="text-sm text-gray-400">
                  Screenshot files on disk
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {formatBytes(storageSize)}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCleanupSynced}
                disabled={cleaningUp}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Icons.Trash className="w-5 h-5" />
                {cleaningUp ? "Cleaning..." : "Delete All Synced Screenshots"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Removes all synced screenshots from local storage.
                <br />
                They are already backed up on the server.
              </p>

              <button
                onClick={handleDeleteOld}
                disabled={cleaningUp}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Icons.Clock className="w-5 h-5" />
                {cleaningUp ? "Deleting..." : "Delete Old Screenshots"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Permanently delete SYNCED screenshots older than specified days.
                <br />
                Unsynced screenshots are kept to prevent data loss.
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Information</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">
              • Screenshots are captured automatically while time tracking is
              active
            </p>
            <p className="text-gray-400">
              • Data is stored locally and synced to the backend automatically
            </p>
            <p className="text-gray-400">
              • Synced screenshots are automatically deleted after sync to save
              disk space
            </p>
            <p className="text-gray-400">
              • The app works offline and syncs when connection is restored
            </p>
          </div>
        </div>

        {/* Updates */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Updates</h3>
          <UpdateSection />
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog {...confirmDialog.state} onCancel={confirmDialog.close} />

      <PromptDialog {...promptDialog.state} onCancel={promptDialog.close} />

      <AlertDialog {...alertDialog.state} onClose={alertDialog.close} />
    </div>
  );
}

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

function UpdateSection() {
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

      // Subscribe to update events
      unsub = window.electronAPI.updates.onEvent((payload: any) => {
        switch (payload.type) {
          case "checking-for-update":
            setStep("checking");
            setErrorMessage("");
            break;
          case "update-available":
            setStep("available");
            setAvailableVersion(payload.info?.version || null);
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
      // Start download - don't await, let events update the UI
      const res = await window.electronAPI.updates.download();
      // Only handle error here, success is handled by 'update-downloaded' event
      if (!res.success) {
        setStep("error");
        setErrorMessage(res.error || "Failed to download update");
      }
      // Note: On success, the 'update-downloaded' event will set step to 'downloaded'
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
        // Check if it's the macOS manual install case
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
      // On success, app will restart automatically
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err?.message || String(err));
    }
  };

  const getStatusText = (): string => {
    switch (step) {
      case "idle":
        return "Click to check for updates";
      case "checking":
        return "Checking for updates...";
      case "available":
        return `New version v${availableVersion} available`;
      case "downloading":
        return `Downloading... ${progress}%`;
      case "downloaded":
        return "Download complete. Ready to install.";
      case "installing":
        return "Installing and restarting...";
      case "up-to-date":
        return "You're up to date!";
      case "manual-install":
        return "Manual installation required";
      case "error":
        return `Error: ${errorMessage}`;
      default:
        return "";
    }
  };

  const getStatusColor = (): string => {
    switch (step) {
      case "idle":
        return "text-gray-400";
      case "checking":
      case "downloading":
      case "installing":
        return "text-yellow-400";
      case "available":
        return "text-blue-400";
      case "downloaded":
        return "text-green-400";
      case "up-to-date":
        return "text-green-400";
      case "manual-install":
        return "text-orange-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const renderActionButton = () => {
    switch (step) {
      case "idle":
      case "up-to-date":
      case "error":
        return (
          <button
            onClick={handleCheck}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Icons.RefreshCw className="w-5 h-5" />
            Check for updates
          </button>
        );
      case "checking":
        return (
          <button
            disabled
            className="w-full bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Icons.RefreshCw className="w-5 h-5 animate-spin" />
            Checking...
          </button>
        );
      case "available":
        return (
          <button
            onClick={handleDownload}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Icons.Download className="w-5 h-5" />
            Download v{availableVersion}
          </button>
        );
      case "downloading":
        return (
          <button
            disabled
            className="w-full bg-green-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Icons.Download className="w-5 h-5 animate-pulse" />
            Downloading... {progress}%
          </button>
        );
      case "downloaded":
        return (
          <button
            onClick={handleInstall}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Icons.RefreshCw className="w-5 h-5" />
            Install & Restart
          </button>
        );
      case "installing":
        return (
          <button
            disabled
            className="w-full bg-indigo-800 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Icons.RefreshCw className="w-5 h-5 animate-spin" />
            Installing...
          </button>
        );
      case "manual-install":
        return (
          <div className="space-y-2">
            <div className="p-3 bg-orange-900/30 border border-orange-600 rounded-lg">
              <p className="text-orange-400 text-sm">
                ⚠️ Auto-install is not available on macOS (app not code-signed).
              </p>
              <p className="text-gray-400 text-xs mt-1">
                The update has been downloaded. Please check your Downloads
                folder and install manually.
              </p>
            </div>
            <button
              onClick={handleCheck}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Icons.RefreshCw className="w-5 h-5" />
              Check again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Version Info */}
      <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
        <div>
          <p className="text-white font-medium">Current Version</p>
          <p className="text-gray-400 text-sm">v{version}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">Status</p>
          <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
        </div>
      </div>

      {/* Progress Bar (only show during download) */}
      {step === "downloading" && (
        <div>
          <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {progress}% downloaded
          </p>
        </div>
      )}

      {/* Action Button */}
      {renderActionButton()}

      {/* Info text based on step */}
      <div className="text-xs text-gray-500 text-center">
        {step === "idle" && "Check if a newer version is available"}
        {step === "available" && "Click Download to get the latest version"}
        {step === "downloaded" && "Click Install & Restart to apply the update"}
        {step === "up-to-date" && "You have the latest version installed"}
        {step === "manual-install" &&
          "Downloads folder has been opened. Install the update manually."}
        {step === "error" && "Try again or check your internet connection"}
      </div>
    </div>
  );
}

export default Settings;
