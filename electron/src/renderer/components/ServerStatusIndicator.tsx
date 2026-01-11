/**
 * Server Status Indicator Component
 * Displays real-time server connection status for Electron app
 */

import { useServerHealth } from "../hooks/useServerHealth";
import { Icons } from "./Icons";

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
            ? "text-yellow-400"
            : isOnline
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {isChecking ? "Checking..." : isOnline ? "Server Online" : "Offline"}
      </span>

      {/* Details */}
      {showDetails && (
        <div className="flex items-center gap-2 text-xs text-dark-400">
          {lastChecked && <span>• Last: {formatLastChecked(lastChecked)}</span>}
          <button
            onClick={refresh}
            className="text-primary-400 hover:text-primary-300 hover:underline"
            disabled={isChecking}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Refresh button with tooltip */}
      {!showDetails && (
        <div className="group relative">
          <button
            onClick={refresh}
            className="text-dark-500 hover:text-dark-300 transition-colors"
            title="Refresh status"
            disabled={isChecking}
          >
            <Icons.Refresh
              className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
            />
          </button>

          {/* Tooltip */}
          <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-dark-800 rounded whitespace-nowrap z-50 border border-dark-700">
            {message}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-dark-800" />
          </div>
        </div>
      )}
    </div>
  );
}
