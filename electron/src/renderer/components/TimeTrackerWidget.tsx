import { useEffect, useState } from "react";
import { presenceService } from "../services/presenceService";

interface TimeTrackerStatus {
  isTracking: boolean;
  status: "running" | "paused" | "stopped";
  elapsedTime: number;
  pausedTime: number;
}

function TimeTrackerWidget() {
  const [status, setStatus] = useState<TimeTrackerStatus>({
    isTracking: false,
    status: "stopped",
    elapsedTime: 0,
    pausedTime: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const result = await window.electronAPI.timeTracker.getStatus();
      setStatus(result);
    } catch (error) {
      console.error("Error loading status:", error);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await window.electronAPI.timeTracker.start();
      await presenceService.heartbeat("working");
      await loadStatus();
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
      await presenceService.heartbeat("idle");
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
      await presenceService.heartbeat("working");
      await loadStatus();
    } catch (error: any) {
      alert(error.message || "Failed to resume tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      await window.electronAPI.timeTracker.stop();
      await presenceService.heartbeat("idle");
      await loadStatus();
    } catch (error: any) {
      alert(error.message || "Failed to stop tracking");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(secs).padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "running":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case "running":
        return "Tracking...";
      case "paused":
        return "Paused";
      default:
        return "Not Tracking";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
      {/* Status Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div
          className={`w-4 h-4 rounded-full ${getStatusColor()} mr-3 animate-pulse`}
        />
        <span className="text-xl font-semibold text-gray-600 dark:text-gray-300">
          {getStatusText()}
        </span>
      </div>

      {/* Time Display */}
      <div className="text-center mb-8">
        <div className="text-6xl font-mono font-bold text-gray-900 dark:text-white mb-2">
          {formatTime(status.elapsedTime)}
        </div>
        {status.pausedTime > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Paused: {formatTime(status.pausedTime)}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 justify-center">
        {!status.isTracking ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 text-lg"
          >
            {loading ? "Starting..." : "▶️ Start"}
          </button>
        ) : (
          <>
            {status.status === "running" ? (
              <button
                onClick={handlePause}
                disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 text-lg"
              >
                {loading ? "Pausing..." : "⏸️ Pause"}
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 text-lg"
              >
                {loading ? "Resuming..." : "▶️ Resume"}
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-semibold py-4 px-8 rounded-xl transition duration-200 text-lg"
            >
              {loading ? "Stopping..." : "⏹️ Stop"}
            </button>
          </>
        )}
      </div>

      {/* Info */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Screenshots are being captured automatically while tracking</p>
      </div>
    </div>
  );
}

export default TimeTrackerWidget;
