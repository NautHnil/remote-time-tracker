import { useEffect, useState } from "react";
import { Icons } from "../../Icons";
import {
  AlertDialog,
  ConfirmDialog,
  PromptDialog,
  useAlertDialog,
  useConfirmDialog,
  usePromptDialog,
} from "../../dialogs/index";
import { Card, SectionHeader, StatCard } from "../ui";

interface ScreenshotPathInfo {
  path: string;
  isCustom: boolean;
  defaultPath: string;
}

export function StorageTab() {
  const [storageSize, setStorageSize] = useState<number>(0);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [screenshotPath, setScreenshotPath] =
    useState<ScreenshotPathInfo | null>(null);
  const [changingPath, setChangingPath] = useState(false);

  const confirmDialog = useConfirmDialog();
  const promptDialog = usePromptDialog();
  const alertDialog = useAlertDialog();

  useEffect(() => {
    loadStorageSize();
    loadScreenshotPath();
    const interval = setInterval(loadStorageSize, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const loadScreenshotPath = async () => {
    try {
      const result = await window.electronAPI.storage.getScreenshotPath();
      if (result.success && result.path) {
        setScreenshotPath({
          path: result.path,
          isCustom: result.isCustom || false,
          defaultPath: result.defaultPath || "",
        });
      }
    } catch (error) {
      console.error("Error loading screenshot path:", error);
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

  const handleChangeScreenshotFolder = async () => {
    try {
      setChangingPath(true);
      const result = await window.electronAPI.storage.selectScreenshotFolder();

      if (result.canceled) {
        return;
      }

      if (result.success && result.path) {
        confirmDialog.show({
          title: "Change Screenshot Folder",
          message: `Change screenshot save location to:\n\n${result.path}\n\nNote: Existing screenshots will remain in the old location.`,
          confirmText: "Change",
          onConfirm: async () => {
            confirmDialog.close();
            try {
              const setResult =
                await window.electronAPI.storage.setScreenshotPath(
                  result.path!
                );
              if (setResult.success) {
                await loadScreenshotPath();
                alertDialog.show({
                  title: "Success",
                  message: "Screenshot folder changed successfully!",
                  type: "success",
                });
              } else {
                alertDialog.show({
                  title: "Failed",
                  message:
                    "Failed to change folder: " +
                    (setResult.error || "Unknown error"),
                  type: "error",
                });
              }
            } catch (error: any) {
              alertDialog.show({
                title: "Failed",
                message: "Failed to change folder: " + error.message,
                type: "error",
              });
            }
          },
        });
      } else if (result.error) {
        alertDialog.show({
          title: "Error",
          message: "Failed to select folder: " + result.error,
          type: "error",
        });
      }
    } catch (error: any) {
      alertDialog.show({
        title: "Error",
        message: "Failed to open folder dialog: " + error.message,
        type: "error",
      });
    } finally {
      setChangingPath(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!screenshotPath?.isCustom) return;

    confirmDialog.show({
      title: "Reset to Default",
      message: `Reset screenshot folder to default location?\n\n${screenshotPath.defaultPath}\n\nNote: Existing screenshots will remain in the current location.`,
      confirmText: "Reset",
      onConfirm: async () => {
        confirmDialog.close();
        try {
          const result = await window.electronAPI.storage.setScreenshotPath(
            null
          );
          if (result.success) {
            await loadScreenshotPath();
            alertDialog.show({
              title: "Success",
              message: "Screenshot folder reset to default!",
              type: "success",
            });
          } else {
            alertDialog.show({
              title: "Failed",
              message:
                "Failed to reset folder: " + (result.error || "Unknown error"),
              type: "error",
            });
          }
        } catch (error: any) {
          alertDialog.show({
            title: "Failed",
            message: "Failed to reset folder: " + error.message,
            type: "error",
          });
        }
      },
    });
  };

  const handleOpenFolder = async () => {
    try {
      await window.electronAPI.storage.openScreenshotFolder();
    } catch (error: any) {
      alertDialog.show({
        title: "Error",
        message: "Failed to open folder: " + error.message,
        type: "error",
      });
    }
  };

  return (
    <>
      <Card className="p-6">
        <SectionHeader
          icon={<Icons.Database className="w-5 h-5" />}
          title="Storage Management"
          description="Monitor and manage local storage usage"
        />

        <div className="mb-6">
          <StatCard
            label="Local Storage Used"
            value={formatBytes(storageSize)}
            icon={<Icons.HardDrive className="w-6 h-6" />}
            color="blue"
          />
        </div>

        {/* Screenshot Folder Location */}
        <div className="mb-6 p-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icons.Folder className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Screenshot Save Location
                </h4>
                {screenshotPath?.isCustom && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    Custom
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Screenshots are saved to this folder on your computer.
              </p>

              {/* Path Display */}
              <div className="mt-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Icons.Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <code className="text-xs text-gray-700 dark:text-gray-300 break-all font-mono">
                    {screenshotPath?.path || "Loading..."}
                  </code>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleOpenFolder}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <Icons.ExternalLink className="w-3.5 h-3.5" />
                  Open Folder
                </button>
                <button
                  onClick={handleChangeScreenshotFolder}
                  disabled={changingPath}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Icons.FolderOpen className="w-3.5 h-3.5" />
                  {changingPath ? "Selecting..." : "Change Location"}
                </button>
                {screenshotPath?.isCustom && (
                  <button
                    onClick={handleResetToDefault}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Icons.RotateCcw className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Icons.Trash className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete Synced Screenshots
                </h4>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Remove all synced screenshots from local storage. They are
                  already backed up on the server.
                </p>
                <button
                  onClick={handleCleanupSynced}
                  disabled={cleaningUp}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Icons.Trash className="w-4 h-4" />
                  {cleaningUp ? "Cleaning..." : "Clean Up"}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                <Icons.Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete Old Screenshots
                </h4>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Permanently delete synced screenshots older than specified
                  days. Unsynced screenshots are kept to prevent data loss.
                </p>
                <button
                  onClick={handleDeleteOld}
                  disabled={cleaningUp}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Icons.Clock className="w-4 h-4" />
                  {cleaningUp ? "Deleting..." : "Delete Old"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog {...confirmDialog.state} onCancel={confirmDialog.close} />
      <PromptDialog {...promptDialog.state} onCancel={promptDialog.close} />
      <AlertDialog {...alertDialog.state} onClose={alertDialog.close} />
    </>
  );
}

export default StorageTab;
