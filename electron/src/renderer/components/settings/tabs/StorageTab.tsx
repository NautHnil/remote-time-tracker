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

export function StorageTab() {
  const [storageSize, setStorageSize] = useState<number>(0);
  const [cleaningUp, setCleaningUp] = useState(false);

  const confirmDialog = useConfirmDialog();
  const promptDialog = usePromptDialog();
  const alertDialog = useAlertDialog();

  useEffect(() => {
    loadStorageSize();
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
