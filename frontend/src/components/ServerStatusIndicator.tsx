/**
 * Server Status Indicator Component
 * Displays real-time server connection status
 */

import { useServerHealth } from "../hooks/useServerHealth";

interface ServerStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function ServerStatusIndicator({
  className = "",
  showDetails = false,
}: ServerStatusIndicatorProps) {
  const { isOnline, isChecking, message, lastChecked, refresh } =
    useServerHealth({
      interval: 15000, // Check every 15 seconds
      immediate: true,
    });

  const formatLastChecked = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Dot */}
      <div className="relative flex items-center">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            isChecking
              ? "bg-yellow-400 animate-pulse"
              : isOnline
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />
        {/* Ping effect for online status */}
        {isOnline && !isChecking && (
          <span className="absolute inline-flex w-2.5 h-2.5 rounded-full bg-green-400 opacity-75 animate-ping" />
        )}
      </div>

      {/* Status Text */}
      <span
        className={`text-xs font-medium ${
          isChecking
            ? "text-yellow-600"
            : isOnline
            ? "text-green-600"
            : "text-red-600"
        }`}
      >
        {isChecking ? "Checking..." : isOnline ? "Server Online" : "Offline"}
      </span>

      {/* Details */}
      {showDetails && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {lastChecked && <span>• Last: {formatLastChecked(lastChecked)}</span>}
          <button
            onClick={refresh}
            className="text-primary-600 hover:text-primary-700 hover:underline"
            disabled={isChecking}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Tooltip on hover */}
      {!showDetails && (
        <div className="group relative">
          <button
            onClick={refresh}
            className="text-gray-400 hover:text-gray-600"
            title="Refresh status"
            disabled={isChecking}
          >
            <svg
              className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Tooltip */}
          <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-10">
            {message}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}
