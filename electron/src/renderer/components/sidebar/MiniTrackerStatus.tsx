/**
 * MiniTrackerStatus Component
 * Shows a mini time tracker status in the organization rail
 */

import React, { useEffect, useState } from "react";
import { formatTimeCompact } from "../../utils/timeFormat";
import { Icons } from "../Icons";

interface MiniTrackerStatusProps {
  onClick: () => void;
}

const MiniTrackerStatus: React.FC<MiniTrackerStatusProps> = ({ onClick }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll tracking status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.timeTracker.getStatus();
        setIsTracking(status?.isTracking || status?.status === "running");
        setElapsedTime(status?.elapsedTime || 0);
      } catch (error) {
        // Silently fail
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 group ${
        isTracking
          ? "bg-green-500/20 border border-green-500/30"
          : "bg-gray-200 dark:bg-dark-800/50 hover:bg-gray-300 dark:hover:bg-dark-700"
      }`}
      title={isTracking ? "Tracking..." : "Start Tracking"}
    >
      {isTracking ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-green-600 dark:text-green-400 mt-0.5">
            {formatTimeCompact(elapsedTime)}
          </span>
        </>
      ) : (
        <Icons.Play className="w-5 h-5 text-gray-500 dark:text-dark-400 group-hover:text-gray-700 dark:group-hover:text-dark-200" />
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100] border border-gray-200 dark:border-dark-700 shadow-xl">
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          {isTracking ? "Tracking in progress" : "Open Time Tracker"}
        </span>
      </div>
    </button>
  );
};

export default MiniTrackerStatus;
