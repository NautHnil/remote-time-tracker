/**
 * useDeeplink.ts
 * Hook to handle deeplink events from Electron main process
 */

import { useCallback, useEffect, useState } from "react";

export interface DeeplinkData {
  type: "join-organization";
  inviteCode: string;
}

export function useDeeplink() {
  const [pendingDeeplink, setPendingDeeplink] = useState<DeeplinkData | null>(
    null,
  );

  useEffect(() => {
    // Subscribe to deeplink events from main process
    const unsubscribe = window.electronAPI.deeplink.onJoinOrganization(
      (inviteCode: string) => {
        console.log("📨 Received join organization deeplink:", inviteCode);
        setPendingDeeplink({
          type: "join-organization",
          inviteCode,
        });
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const clearDeeplink = useCallback(() => {
    setPendingDeeplink(null);
  }, []);

  return {
    pendingDeeplink,
    clearDeeplink,
  };
}

export default useDeeplink;
