import { format } from "date-fns";
import { useEffect, useState } from "react";
import { formatDurationFull } from "../utils/timeFormat";
import { PromptDialog, usePromptDialog } from "./dialogs/index";
import { Icons } from "./Icons";

interface TimeTrackerStatus {
  isTracking: boolean;
  status: "running" | "paused" | "stopped";
  elapsedTime: number;
  pausedTime: number;
  currentTimeLog?: {
    taskId?: number;
    taskLocalId?: string;
    taskTitle?: string;
    isManualTask?: boolean;
  };
}

interface Task {
  id: number;
  title: string;
  is_manual?: boolean;
  duration?: number;
  screenshot_count?: number;
  status?: string;
}

function ModernTimeTracker() {
  const [config, setConfig] = useState<any>({});
  const [status, setStatus] = useState<TimeTrackerStatus>({
    isTracking: false,
    status: "stopped",
    elapsedTime: 0,
    pausedTime: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>("General Work");
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Track full task info including is_manual
  const [serverScreenshotCount, setServerScreenshotCount] = useState<number>(0); // Server count (fixed when start)
  const [sessionStartLocalCount, setSessionStartLocalCount] =
    useState<number>(0); // Local count baseline when session starts
  const [currentLocalCount, setCurrentLocalCount] = useState<number>(0); // Current local count (updates every interval)
  const [todayTotalDuration, setTodayTotalDuration] = useState<number>(0);
  const promptDialog = usePromptDialog();

  useEffect(() => {
    loadConfig();
    loadStatus();
    loadTasks();
    loadServerScreenshotCount(); // Load server count once
    loadTodayTotalDuration();
    updateCurrentLocalCount(); // Initial load

    // Update status every second
    const statusInterval = setInterval(loadStatus, 1000);

    // Update today's total duration every 5 seconds
    const durationInterval = setInterval(loadTodayTotalDuration, 5000);

    // Update current local count every 3 seconds to track captures
    const localCountInterval = setInterval(updateCurrentLocalCount, 3000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(durationInterval);
      clearInterval(localCountInterval);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const result = await window.electronAPI.tasks.getAll();
      if (result.success) {
        setAvailableTasks(result.data || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadServerScreenshotCount = async () => {
    try {
      // Import screenshotService
      const { screenshotService } = await import(
        "../services/screenshotService"
      );

      // Get today's screenshot count from server
      const response = await screenshotService.getTodayCount();
      setServerScreenshotCount(response.data.count || 0);
    } catch (error) {
      console.error("Error loading server screenshot count:", error);
      // Fallback: If not authenticated or error, set to 0
      setServerScreenshotCount(0);
    }
  };

  const getLocalScreenshotCount = async (): Promise<number> => {
    try {
      const screenshots = await window.electronAPI.screenshots.getAll();

      const today = new Date().toISOString().split("T")[0];
      const todayScreenshots = screenshots.filter((s: any) => {
        const capturedDate = new Date(s.captured_at || s.capturedAt)
          .toISOString()
          .split("T")[0];
        return capturedDate === today;
      });

      return todayScreenshots.length;
    } catch (error) {
      console.error("Error loading local screenshot count:", error);
      return 0;
    }
  };

  const updateCurrentLocalCount = async () => {
    const count = await getLocalScreenshotCount();
    setCurrentLocalCount(count);
  };

  const loadTodayTotalDuration = async () => {
    try {
      const totalDuration =
        await window.electronAPI.timeLogs.getTodayTotalDuration();
      setTodayTotalDuration(totalDuration);
    } catch (error) {
      console.error("Error loading today's total duration:", error);
      setTodayTotalDuration(0);
    }
  };

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.config.get();
      setConfig(result);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const loadStatus = async () => {
    try {
      const result: TimeTrackerStatus =
        await window.electronAPI.timeTracker.getStatus();
      setStatus(result);

      // Restore selectedTask state if there's an active manual task session
      if (
        result.isTracking &&
        result.currentTimeLog?.isManualTask &&
        result.currentTimeLog?.taskId
      ) {
        // Find the task in available tasks
        const task = availableTasks.find(
          (t) => t.id === result.currentTimeLog?.taskId
        );
        if (task) {
          setSelectedTask(task);
          setSelectedTaskId(task.id);
          setCurrentTask(task.title);
        } else if (result.currentTimeLog.taskTitle) {
          // If task not found in list but we have title, create a placeholder
          setSelectedTask({
            id: result.currentTimeLog.taskId,
            title: result.currentTimeLog.taskTitle,
            is_manual: true,
          } as Task);
          setSelectedTaskId(result.currentTimeLog.taskId);
          setCurrentTask(result.currentTimeLog.taskTitle);
        }
      } else if (result.isTracking && !result.currentTimeLog?.isManualTask) {
        // Auto-track task - set current task name from taskTitle if available
        if (result.currentTimeLog?.taskTitle) {
          setCurrentTask(result.currentTimeLog.taskTitle);
        }
      }
    } catch (error) {
      console.error("Error loading status:", error);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);

      // Load server screenshot count (fixed for this session)
      await loadServerScreenshotCount();

      // Snapshot current local count as baseline (before new captures)
      const currentLocal = await getLocalScreenshotCount();
      setSessionStartLocalCount(currentLocal);
      setCurrentLocalCount(currentLocal);

      // Find and track the selected task
      const task = selectedTaskId
        ? availableTasks.find((t) => t.id === selectedTaskId)
        : null;
      setSelectedTask(task || null);

      // Start time tracking with optional taskId and isManualTask flag
      // If it's a manual task, we pass the task ID and mark it as manual
      await window.electronAPI.timeTracker.start(
        selectedTaskId || undefined,
        task?.is_manual ? task.title : undefined // Pass title for manual task
      );

      // Update current task name
      if (task) {
        setCurrentTask(task.title);
      } else {
        setCurrentTask("General Work");
      }

      await loadStatus();
      await loadTasks();
    } catch (error: any) {
      alert(error.message || "Failed to start tracking");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      await window.electronAPI.timeTracker.pause();
      await loadStatus();
    } catch (error: any) {
      alert(error.message || "Failed to pause tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await window.electronAPI.timeTracker.resume();
      await loadStatus();
    } catch (error: any) {
      alert(error.message || "Failed to resume tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    // Check if this is a manual task - if so, save directly without dialog
    const isManualTask =
      selectedTask?.is_manual || status.currentTimeLog?.isManualTask;

    // Get the task title from selectedTask or from currentTimeLog
    const manualTaskTitle =
      selectedTask?.title || status.currentTimeLog?.taskTitle;

    if (isManualTask && manualTaskTitle) {
      // For manual tasks, save directly with the task's title
      try {
        setLoading(true);

        // Stop tracking with the manual task's title
        await window.electronAPI.timeTracker.stop(manualTaskTitle);
        await loadStatus();
        await loadTasks(); // Reload to update stats

        // Reset screenshot counts for next session
        setSessionStartLocalCount(0);
        setCurrentLocalCount(0);

        setSelectedTaskId(null); // Clear selection
        setSelectedTask(null); // Clear selected task
      } catch (error: any) {
        alert(error.message || "Failed to stop tracking");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Pause timer immediately to freeze the time (for auto-track tasks)
    try {
      if (status.status === "running") {
        await window.electronAPI.timeTracker.pause();
        await loadStatus();
      }
    } catch (error) {
      console.error("Failed to pause before stopping:", error);
    }

    // Show dialog to save task title (only for auto-track tasks)
    promptDialog.show({
      title: "Save Task Title",
      message: "Enter a title for this work session (optional):",
      defaultValue: currentTask || "",
      onConfirm: async (taskTitle) => {
        try {
          setLoading(true);

          // Generate default title if empty
          const nowMs = Date.now();
          const defaultTitle = `Work Session - ${format(
            nowMs,
            "MMM d, yyyy"
          )} at ${format(nowMs, "hh:mm a")}`;
          const finalTitle = taskTitle?.trim() || defaultTitle;

          // Stop tracking with task title
          await window.electronAPI.timeTracker.stop(finalTitle);
          await loadStatus();
          await loadTasks(); // Reload to update stats

          // Reset screenshot counts for next session
          setSessionStartLocalCount(0);
          setCurrentLocalCount(0);

          setSelectedTaskId(null); // Clear selection
          setSelectedTask(null); // Clear selected task
          promptDialog.close();
        } catch (error: any) {
          alert(error.message || "Failed to stop tracking");
        } finally {
          setLoading(false);
        }
      },
      onCancel: async () => {
        // If user cancels, resume tracking
        try {
          // Get current status to check if paused
          const currentStatus =
            await window.electronAPI.timeTracker.getStatus();
          if (currentStatus.status === "paused") {
            await window.electronAPI.timeTracker.resume();
            await loadStatus();
          }
        } catch (error) {
          console.error("Failed to resume after cancel:", error);
        }
      },
    });
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const getProgress = () => {
    const target = 8 * 60 * 60 * 1000; // 8 hours
    return Math.min((status.elapsedTime / target) * 100, 100);
  };

  const formatHoursTracked = () => {
    // Total = all completed sessions today + current session (if running)
    let totalMs = todayTotalDuration;

    // If currently tracking, add the current session's elapsed time
    if (status.isTracking && status.status !== "stopped") {
      totalMs += status.elapsedTime;
    }

    const hours = Math.floor(totalMs / 1000 / 3600);
    const minutes = Math.floor(((totalMs / 1000) % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const calculateScreenshotCount = () => {
    // Total = server count (fixed) + session capture count
    // Session capture count = current local - baseline at start
    const sessionCaptureCount = Math.max(
      0,
      currentLocalCount - sessionStartLocalCount
    );
    return serverScreenshotCount + sessionCaptureCount;
  };

  const getEstimatedScreenshots = () => {
    // Calculate based on config interval (default 5 minutes = 300000ms)
    const interval = config.screenshotInterval || 300000;
    return status.isTracking ? Math.floor(status.elapsedTime / interval) : 0;
  };

  const getProductivityPercentage = () => {
    return status.status === "running" ? "100" : "0";
  };

  const getStatusTitle = () => {
    switch (status.status) {
      case "running":
        return "Tracking Active";
      case "paused":
        return "Paused";
      default:
        return "Ready to Track";
    }
  };

  const getStatusBadgeClass = () => {
    switch (status.status) {
      case "running":
        return "badge-success";
      case "paused":
        return "badge-warning";
      default:
        return "badge-primary";
    }
  };

  const getStatusDotClass = () => {
    switch (status.status) {
      case "running":
        return "status-active";
      case "paused":
        return "status-paused";
      default:
        return "status-inactive";
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Main Timer Card */}
      <div className="glass-dark rounded-3xl p-8 shadow-2xl stat-card border border-gray-200 dark:border-dark-700/50 relative overflow-hidden">
        {/* Background gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-50" />

        <div className="relative z-10">
          {/* Status Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`status-dot ${getStatusDotClass()}`} />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-100">
                  {getStatusTitle()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-dark-400">
                  {currentTask}
                </p>
              </div>
            </div>

            <div className={`badge ${getStatusBadgeClass()}`}>
              <Icons.Clock className="w-3 h-3 mr-1" />
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-7xl font-mono font-bold gradient-text mb-4 tracking-tight">
              {formatTime(status.elapsedTime)}
            </div>
            {status.pausedTime > 0 && (
              <div className="text-sm text-gray-500 dark:text-dark-400 flex items-center justify-center gap-2">
                <Icons.Pause className="w-4 h-4" />
                Paused: {formatTime(status.pausedTime)}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-500 dark:text-dark-400 mb-2">
              <span>Daily Progress</span>
              <span>{getProgress().toFixed(1)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {/* Task Selector - Only show when stopped */}
          {status.status === "stopped" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-2">
                Select Task (Optional)
              </label>
              <select
                value={selectedTaskId || ""}
                onChange={(e) =>
                  setSelectedTaskId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="input w-full"
              >
                <option value="">New Task (Auto-created)</option>
                {availableTasks
                  .filter(
                    (t) =>
                      t.is_manual &&
                      (t.status === undefined ||
                        t.status === "pending" ||
                        t.status === "new")
                  )
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                      {task.duration
                        ? ` (${Math.floor(task.duration / 3600)}h ${Math.floor(
                            (task.duration % 3600) / 60
                          )}m)`
                        : ""}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                Choose an existing manual task or leave empty to create a new
                one
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-4">
            {status.status === "stopped" ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="col-span-3 btn btn-success text-lg py-5 flex items-center justify-center gap-3 group"
              >
                <Icons.Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {loading ? "Starting..." : "Start Tracking"}
              </button>
            ) : (
              <>
                {status.status === "running" ? (
                  <button
                    onClick={handlePause}
                    disabled={loading}
                    className="col-span-1 btn btn-warning py-5 flex items-center justify-center gap-2 group"
                  >
                    <Icons.Pause className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">
                      {loading ? "..." : "Pause"}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    disabled={loading}
                    className="col-span-1 btn btn-primary py-5 flex items-center justify-center gap-2 group"
                  >
                    <Icons.Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">
                      {loading ? "..." : "Resume"}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="col-span-2 btn btn-danger py-5 flex items-center justify-center gap-2 group"
                >
                  <Icons.Stop className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {loading ? "Stopping..." : "Stop & Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <Icons.Calendar className="w-8 h-8 text-primary-400 group-hover:scale-110 transition-transform" />
            <span className="badge badge-primary">Today</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-dark-100 mb-1">
            {formatHoursTracked()}
          </div>
          <div className="text-xs text-gray-500 dark:text-dark-400">
            Time tracked
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <Icons.Camera className="w-8 h-8 text-accent-400 group-hover:scale-110 transition-transform" />
            <span className="badge badge-success">Live</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-dark-100 mb-1">
            {calculateScreenshotCount()}
          </div>
          <div className="text-xs text-gray-500 dark:text-dark-400">
            Screenshots today
            {status.isTracking && getEstimatedScreenshots() > 0 && (
              <span className="ml-1 text-gray-400 dark:text-dark-500">
                (Est: {getEstimatedScreenshots()})
              </span>
            )}
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <Icons.Lightning className="w-8 h-8 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="badge badge-warning">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-dark-100 mb-1">
            {getProductivityPercentage()}%
          </div>
          <div className="text-xs text-gray-500 dark:text-dark-400">
            Productivity
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-dark rounded-2xl p-6 stat-card border border-gray-200 dark:border-dark-700/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-500/10 rounded-xl">
            <Icons.Camera className="w-6 h-6 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-dark-100 mb-1">
              Auto Screenshot Monitoring
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-400 leading-relaxed">
              Screenshots are captured every{" "}
              {formatDurationFull(config.screenshotInterval || 300000)} while
              tracking. All data is encrypted and synced securely to your
              account.
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Task Title Dialog */}
      <PromptDialog {...promptDialog.state} onCancel={promptDialog.close} />
    </div>
  );
}

export default ModernTimeTracker;
