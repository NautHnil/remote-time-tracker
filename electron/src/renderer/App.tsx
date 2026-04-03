/**
 * App.tsx
 * Main application component with routing and authentication
 */

import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
  JoinOrganizationDialog,
  LogoutConfirmDialog,
  QuitAppConfirmDialog,
  useLogoutConfirmDialog,
  useQuitAppConfirmDialog,
} from "./components/dialogs";
import { Icons } from "./components/Icons";
import {
  SettingsTabId,
  UpdateNotice,
  UpdateStep,
} from "./components/settings";
import LoginForm from "./components/LoginForm";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useDeeplink } from "./hooks";
import { MainLayout, View } from "./layout";
import { AppRouter } from "./routes";
import { presenceService } from "./services/presenceService";

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-dark-950">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4 shadow-glow animate-pulse">
        <Icons.Clock className="w-8 h-8 text-white" />
      </div>
      <div className="text-gray-700 dark:text-dark-200 text-lg font-medium">
        Loading...
      </div>
    </div>
  </div>
);

// ============================================================================
// APP CONTENT (Authenticated)
// ============================================================================

function AppContent() {
  const {
    user,
    loading: authLoading,
    logout,
    refreshUserData,
    currentOrgId,
    currentWorkspaceId,
    organizations,
    workspaces,
  } = useAuth();

  const [currentView, setCurrentView] = useState<View>("tracker");
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("general");
  const [updateVersion, setUpdateVersion] = useState("?");
  const [updateStep, setUpdateStep] = useState<UpdateStep>("idle");
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateErrorMessage, setUpdateErrorMessage] = useState("");
  const [isUpdateNoticeDismissed, setIsUpdateNoticeDismissed] = useState(false);

  // Logout confirmation dialog
  const logoutDialog = useLogoutConfirmDialog();

  // Quit app confirmation dialog
  const quitAppDialog = useQuitAppConfirmDialog();

  // Deeplink handler
  const { pendingDeeplink, clearDeeplink } = useDeeplink();
  const [joinOrgDialogOpen, setJoinOrgDialogOpen] = useState(false);
  const [joinOrgInviteCode, setJoinOrgInviteCode] = useState("");

  // Handle deeplink when received
  useEffect(() => {
    if (pendingDeeplink && pendingDeeplink.type === "join-organization") {
      setJoinOrgInviteCode(pendingDeeplink.inviteCode);
      setJoinOrgDialogOpen(true);
      clearDeeplink();
    }
  }, [pendingDeeplink, clearDeeplink]);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const setupUpdates = async () => {
      try {
        const v = await window.electronAPI.app.getVersion();
        setUpdateVersion(v);
      } catch (err) {
        console.error("Failed to get app version:", err);
      }

      unsub = window.electronAPI.updates.onEvent((payload: any) => {
        switch (payload.type) {
          case "checking-for-update":
            setUpdateStep("checking");
            setUpdateErrorMessage("");
            break;
          case "update-available":
            setUpdateStep("available");
            setAvailableVersion(
              payload.info?.latest_version || payload.info?.version || null,
            );
            setUpdateErrorMessage("");
            setIsUpdateNoticeDismissed(false);
            break;
          case "update-not-available":
            setUpdateStep("up-to-date");
            setAvailableVersion(null);
            setUpdateProgress(0);
            setUpdateErrorMessage("");
            break;
          case "download-progress":
            setUpdateStep("downloading");
            setUpdateProgress(Math.round(payload.progress.percent || 0));
            break;
          case "update-downloaded":
            setUpdateStep("downloaded");
            setUpdateProgress(100);
            setUpdateErrorMessage("");
            setIsUpdateNoticeDismissed(false);
            break;
          case "error":
            setUpdateStep("error");
            setUpdateErrorMessage(payload.error || "Unknown error");
            break;
          default:
            break;
        }
      });
    };

    setupUpdates();

    return () => {
      unsub?.();
    };
  }, []);

  // Track if we paused the tracker for logout/quit dialogs
  const [pausedForLogout, setPausedForLogout] = useState(false);
  const [pausedForQuit, setPausedForQuit] = useState(false);

  // Get current org/workspace for display
  const currentOrg = currentOrgId
    ? organizations.find((o) => o.id === currentOrgId) || null
    : null;
  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((w) => w.id === currentWorkspaceId) || null
    : null;

  // Handle join organization success
  const handleJoinOrgSuccess = useCallback(
    async (organization: any) => {
      console.log("✅ Successfully joined organization:", organization);
      // Refresh user data to update organizations list
      await refreshUserData();
      setJoinOrgDialogOpen(false);
      setJoinOrgInviteCode("");
    },
    [refreshUserData],
  );

  const handleJoinOrgClose = useCallback(() => {
    setJoinOrgDialogOpen(false);
    setJoinOrgInviteCode("");
  }, []);

  const openUpdateSettings = useCallback(() => {
    setCurrentView("settings");
    setSettingsTab("updates");
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setUpdateStep("checking");
    setAvailableVersion(null);
    setUpdateProgress(0);
    setUpdateErrorMessage("");

    try {
      const res = await window.electronAPI.updates.check();
      if (!res.success) {
        setUpdateStep("error");
        setUpdateErrorMessage(res.error || "Failed to check for updates");
      }
    } catch (err: any) {
      setUpdateStep("error");
      setUpdateErrorMessage(err?.message || String(err));
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateStep("download-pending");
    setUpdateProgress(0);
    setUpdateErrorMessage("");

    try {
      const res = await window.electronAPI.updates.download();
      if (!res.success) {
        setUpdateStep("error");
        setUpdateErrorMessage(res.error || "Failed to download update");
      }
    } catch (err: any) {
      setUpdateStep("error");
      setUpdateErrorMessage(err?.message || String(err));
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    setUpdateStep("installing");

    try {
      const res = await window.electronAPI.updates.install();
      if (!res.success) {
        if (res.error?.includes("Manual installation required")) {
          setUpdateStep("manual-install");
          setUpdateErrorMessage(
            "Please install the update manually from your Downloads folder.",
          );
        } else {
          setUpdateStep("error");
          setUpdateErrorMessage(res.error || "Failed to install update");
        }
      }
    } catch (err: any) {
      setUpdateStep("error");
      setUpdateErrorMessage(err?.message || String(err));
    }
  }, []);

  const handleUpdateNow = useCallback(async () => {
    setIsUpdateNoticeDismissed(false);
    openUpdateSettings();

    if (updateStep === "available") {
      await handleDownloadUpdate();
    }
  }, [handleDownloadUpdate, openUpdateSettings, updateStep]);

  // ============================================================================
  // LOGOUT HANDLERS
  // ============================================================================

  const handleLogoutRequest = useCallback(async () => {
    try {
      const status = await window.electronAPI.timeTracker.getStatus();

      if (status.isTracking && status.status === "running") {
        await window.electronAPI.timeTracker.pause();
        await presenceService.heartbeat("idle");
        setPausedForLogout(true);

        const pausedStatus = await window.electronAPI.timeTracker.getStatus();
        const isManual = pausedStatus.currentTimeLog?.isManualTask || false;
        const defaultTitle = isManual
          ? pausedStatus.currentTimeLog?.taskTitle || ""
          : pausedStatus.currentTimeLog?.taskTitle || "General Work";

        logoutDialog.show({
          isTracking: true,
          taskTitle: defaultTitle,
          elapsedTime: pausedStatus.elapsedTime,
          isManualTask: isManual,
        });
      } else {
        setPausedForLogout(false);
        const isManual = status.currentTimeLog?.isManualTask || false;
        const defaultTitle = isManual
          ? status.currentTimeLog?.taskTitle || ""
          : status.currentTimeLog?.taskTitle || "General Work";

        logoutDialog.show({
          isTracking: status.isTracking,
          taskTitle: defaultTitle,
          elapsedTime: status.elapsedTime,
          isManualTask: isManual,
        });
      }
    } catch (error) {
      console.error("Error checking tracking status:", error);
      setPausedForLogout(false);
      logoutDialog.show({ isTracking: false });
    }
  }, [logoutDialog]);

  const handleCancelLogout = useCallback(() => {
    logoutDialog.close();
    if (pausedForLogout) {
      window.electronAPI.timeTracker.resume().catch((error) => {
        console.error("Error resuming tracking:", error);
      });
      presenceService.heartbeat("working");
      setPausedForLogout(false);
    }
  }, [pausedForLogout, logoutDialog]);

  const executeLogout = useCallback(async () => {
    setPausedForLogout(false);
    await window.electronAPI.auth.clear();
    await presenceService.heartbeat("idle");
    logout();
    setCurrentView("tracker");
    logoutDialog.close();
  }, [logout, logoutDialog]);

  const handleStopAndLogout = useCallback(
    async (taskTitle: string) => {
      try {
        const nowMs = Date.now();
        const defaultTitle = `Work Session - ${format(
          nowMs,
          "MMM d, yyyy",
        )} at ${format(nowMs, "hh:mm a")}`;
        const finalTitle = taskTitle?.trim() || defaultTitle;

        console.log("🔄 Stopping tracking and syncing before logout...");
        await window.electronAPI.timeTracker.stopAndSync(finalTitle);
        await presenceService.heartbeat("idle");
        console.log("✅ Stop and sync completed, now logging out...");
        setPausedForLogout(false);
        await executeLogout();
      } catch (error) {
        console.error("Error stopping tracking:", error);
        try {
          await window.electronAPI.timeTracker.forceStop();
          setPausedForLogout(false);
          await executeLogout();
        } catch (forceError) {
          console.error("Error force stopping:", forceError);
        } finally {
          await presenceService.heartbeat("idle");
        }
      }
    },
    [executeLogout],
  );

  // ============================================================================
  // QUIT APP HANDLERS
  // ============================================================================

  const handleQuitAppRequest = useCallback(async () => {
    try {
      const status = await window.electronAPI.timeTracker.getStatus();

      if (status.isTracking && status.status === "running") {
        await window.electronAPI.timeTracker.pause();
        await presenceService.heartbeat("idle");
        setPausedForQuit(true);

        const pausedStatus = await window.electronAPI.timeTracker.getStatus();
        const isManual = pausedStatus.currentTimeLog?.isManualTask || false;
        const defaultTitle = isManual
          ? pausedStatus.currentTimeLog?.taskTitle || ""
          : pausedStatus.currentTimeLog?.taskTitle || "General Work";

        quitAppDialog.show({
          isTracking: true,
          taskTitle: defaultTitle,
          elapsedTime: pausedStatus.elapsedTime,
          isManualTask: isManual,
        });
      } else {
        setPausedForQuit(false);
        const isManual = status.currentTimeLog?.isManualTask || false;
        const defaultTitle = isManual
          ? status.currentTimeLog?.taskTitle || ""
          : status.currentTimeLog?.taskTitle || "General Work";

        quitAppDialog.show({
          isTracking: status.isTracking,
          taskTitle: defaultTitle,
          elapsedTime: status.elapsedTime,
          isManualTask: isManual,
        });
      }
    } catch (error) {
      console.error("Error checking tracking status:", error);
      setPausedForQuit(false);
      quitAppDialog.show({ isTracking: false });
    }
  }, [quitAppDialog]);

  const handleCancelQuit = useCallback(() => {
    quitAppDialog.close();
    if (pausedForQuit) {
      window.electronAPI.timeTracker.resume().catch((error) => {
        console.error("Error resuming tracking:", error);
      });
      presenceService.heartbeat("working");
      setPausedForQuit(false);
    }
  }, [pausedForQuit, quitAppDialog]);

  const executeQuitApp = useCallback(async () => {
    setPausedForQuit(false);
    quitAppDialog.close();
    await presenceService.heartbeat("idle");
    await window.electronAPI.app.quit();
  }, [quitAppDialog]);

  const handleStopAndQuit = useCallback(
    async (taskTitle: string) => {
      try {
        const nowMs = Date.now();
        const defaultTitle = `Work Session - ${format(
          nowMs,
          "MMM d, yyyy",
        )} at ${format(nowMs, "hh:mm a")}`;
        const finalTitle = taskTitle?.trim() || defaultTitle;

        console.log("🔄 Stopping tracking and syncing before quit...");
        await window.electronAPI.timeTracker.stopAndSync(finalTitle);
        await presenceService.heartbeat("idle");
        console.log("✅ Stop and sync completed, now quitting...");
        setPausedForQuit(false);
        await executeQuitApp();
      } catch (error) {
        console.error("Error stopping tracking:", error);
        try {
          await window.electronAPI.timeTracker.forceStop();
          setPausedForQuit(false);
          await executeQuitApp();
        } catch (forceError) {
          console.error("Error force stopping:", forceError);
        } finally {
          await presenceService.heartbeat("idle");
        }
      }
    },
    [executeQuitApp],
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Expose quit handler for main process IPC
  useEffect(() => {
    (
      window as unknown as {
        __handleQuitAppRequest?: typeof handleQuitAppRequest;
      }
    ).__handleQuitAppRequest = handleQuitAppRequest;

    return () => {
      delete (
        window as unknown as {
          __handleQuitAppRequest?: typeof handleQuitAppRequest;
        }
      ).__handleQuitAppRequest;
    };
  }, [handleQuitAppRequest]);

  useEffect(() => {
    if (!user) {
      return;
    }

    handleCheckUpdates();
  }, [user, handleCheckUpdates]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <LoginForm
        onLogin={async (accessToken, refreshToken, userId, email) => {
          await window.electronAPI.auth.setCredentials({
            accessToken,
            refreshToken,
            userId,
            email,
          });
          await refreshUserData();
        }}
      />
    );
  }

  const shouldShowUpdateNotice =
    !isUpdateNoticeDismissed &&
    (updateStep === "available" ||
      updateStep === "download-pending" ||
      updateStep === "downloading" ||
      updateStep === "downloaded" ||
      updateStep === "installing" ||
      updateStep === "error");

  return (
    <>
      {/* Dialogs */}
      <LogoutConfirmDialog
        isOpen={logoutDialog.state.isOpen}
        isTracking={logoutDialog.state.isTracking}
        taskTitle={logoutDialog.state.taskTitle}
        elapsedTime={logoutDialog.state.elapsedTime}
        isManualTask={logoutDialog.state.isManualTask}
        onConfirmLogout={executeLogout}
        onStopAndLogout={handleStopAndLogout}
        onCancel={handleCancelLogout}
      />

      <QuitAppConfirmDialog
        isOpen={quitAppDialog.state.isOpen}
        isTracking={quitAppDialog.state.isTracking}
        taskTitle={quitAppDialog.state.taskTitle}
        elapsedTime={quitAppDialog.state.elapsedTime}
        isManualTask={quitAppDialog.state.isManualTask}
        onConfirmQuit={executeQuitApp}
        onStopAndQuit={handleStopAndQuit}
        onCancel={handleCancelQuit}
      />

      {/* Join Organization Dialog (deeplink) */}
      <JoinOrganizationDialog
        open={joinOrgDialogOpen}
        inviteCode={joinOrgInviteCode}
        onClose={handleJoinOrgClose}
        onJoinSuccess={handleJoinOrgSuccess}
      />

      {/* Main Layout */}
      <MainLayout
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view !== "settings") {
            setSettingsTab("general");
          }
        }}
        onLogout={handleLogoutRequest}
        currentOrg={currentOrg}
        currentWorkspace={currentWorkspace}
      >
        <AppRouter
          currentView={currentView}
          onNavigateToTracker={() => setCurrentView("tracker")}
          settingsTab={settingsTab}
          onSettingsTabChange={setSettingsTab}
          updateState={{
            version: updateVersion,
            step: updateStep,
            availableVersion,
            progress: updateProgress,
            errorMessage: updateErrorMessage,
          }}
          onCheckUpdates={handleCheckUpdates}
          onDownloadUpdate={handleDownloadUpdate}
          onInstallUpdate={handleInstallUpdate}
        />
      </MainLayout>

      {shouldShowUpdateNotice && (
        <UpdateNotice
          step={updateStep}
          availableVersion={availableVersion}
          progress={updateProgress}
          errorMessage={updateErrorMessage}
          onClose={() => setIsUpdateNoticeDismissed(true)}
          onUpdateNow={handleUpdateNow}
        />
      )}
    </>
  );
}

// ============================================================================
// APP WRAPPER
// ============================================================================

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const credentials = await window.electronAPI.auth.getCredentials();
      if (credentials?.accessToken) {
        try {
          const { authService } = await import("./services/authService");
          const response = await authService.me();

          if (response.success && response.data) {
            setIsAuthenticated(true);
          } else {
            console.warn("User verification failed, clearing credentials");
            await window.electronAPI.auth.clear();
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Failed to verify user:", error);
          await window.electronAPI.auth.clear();
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider initialAuthenticated={isAuthenticated}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
