/**
 * Server Health Check Hook
 * Real-time server status monitoring using polling
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { commonService } from "../services/commonService";

export interface ServerHealthStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  serverTime: string | null;
  serverIp: string | null;
  message: string;
  isChecking: boolean;
}

interface UseServerHealthOptions {
  /** Polling interval in milliseconds (default: 10000 = 10s) */
  interval?: number;
  /** Whether to start checking immediately (default: true) */
  immediate?: boolean;
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
}

export function useServerHealth(options: UseServerHealthOptions = {}) {
  const { interval = 10000, immediate = true, enablePolling = true } = options;

  const [status, setStatus] = useState<ServerHealthStatus>({
    isOnline: false,
    lastChecked: null,
    serverTime: null,
    serverIp: null,
    message: "Checking server status...",
    isChecking: true,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkHealth = useCallback(async () => {
    if (!isMountedRef.current) return;

    setStatus((prev) => ({ ...prev, isChecking: true }));

    try {
      const response = await commonService.healthCheck();

      if (!isMountedRef.current) return;

      if (response.success && response.data?.status === "ok") {
        setStatus({
          isOnline: true,
          lastChecked: new Date(),
          serverTime: response.data.time,
          serverIp: response.data.ip,
          message: response.data.message || "Server is running",
          isChecking: false,
        });
      } else {
        setStatus({
          isOnline: false,
          lastChecked: new Date(),
          serverTime: null,
          serverIp: null,
          message: response.message || "Unexpected response from server",
          isChecking: false,
        });
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;

      setStatus({
        isOnline: false,
        lastChecked: new Date(),
        serverTime: null,
        serverIp: null,
        message:
          error.code === "ECONNABORTED"
            ? "Server connection timeout"
            : error.code === "ERR_NETWORK"
            ? "Cannot connect to server"
            : error.message || "Server is offline",
        isChecking: false,
      });
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    checkHealth();
  }, [checkHealth]);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enablePolling && interval > 0) {
      intervalRef.current = setInterval(checkHealth, interval);
    }
  }, [checkHealth, interval, enablePolling]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial check
    if (immediate) {
      checkHealth();
    }

    // Start polling
    if (enablePolling) {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [immediate, enablePolling, startPolling, stopPolling, checkHealth]);

  return {
    ...status,
    refresh,
    startPolling,
    stopPolling,
  };
}

export default useServerHealth;
