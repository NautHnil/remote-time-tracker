import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { Icons } from "../../Icons";
import { AlertDialog, useAlertDialog } from "../../dialogs/index";
import { Card, SectionHeader, StatusBadge } from "../ui";

export function SyncTab() {
  const [syncStatus, setSyncStatus] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const alertDialog = useAlertDialog();

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      const result = await window.electronAPI.sync.getStatus();
      setSyncStatus(result);
    } catch (error) {
      console.error("Error loading sync status:", error);
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

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return format(dateObj, "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <>
      <Card className="p-6">
        <SectionHeader
          icon={<Icons.RefreshCw className="w-5 h-5" />}
          title="Data Synchronization"
          description="Manage data sync between local and server"
        />

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Status
              </span>
              <StatusBadge
                status={syncStatus.isSyncing ? "warning" : "success"}
              >
                {syncStatus.isSyncing ? (
                  <>
                    <Icons.RefreshCw className="w-3 h-3 animate-spin" />
                    Syncing
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Ready
                  </>
                )}
              </StatusBadge>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {syncStatus.isSyncing ? "In Progress..." : "Idle"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Last Sync
              </span>
              <Icons.Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {formatDate(syncStatus.lastSyncTime)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Auto-Sync
              </span>
              <StatusBadge
                status={syncStatus.autoSyncEnabled ? "success" : "neutral"}
              >
                {syncStatus.autoSyncEnabled ? "Enabled" : "Disabled"}
              </StatusBadge>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {syncStatus.autoSyncEnabled ? "Active" : "Manual Only"}
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading || syncStatus.isSyncing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icons.RefreshCw
            className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Syncing Data..." : "Sync Now"}
        </button>
      </Card>

      <AlertDialog {...alertDialog.state} onClose={alertDialog.close} />
    </>
  );
}

export default SyncTab;
