import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
  LogoutConfirmDialog,
  QuitAppConfirmDialog,
  useLogoutConfirmDialog,
  useQuitAppConfirmDialog,
} from "./components/Dialogs";
import { Icons } from "./components/Icons";
import { Sidebar, View } from "./components/layout";
import LoginForm from "./components/LoginForm";
import ModernTimeTracker from "./components/ModernTimeTracker";
import OrganizationsView from "./components/OrganizationsView";
import ScreenshotViewer from "./components/ScreenshotViewer";
import Settings from "./components/Settings";
import StatisticsView from "./components/StatisticsView";
import TasksView from "./components/TasksView";
import WorkspacesView from "./components/WorkspacesView";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Main app content with auth context
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

  // Logout confirmation dialog
  const logoutDialog = useLogoutConfirmDialog();

  // Quit app confirmation dialog
  const quitAppDialog = useQuitAppConfirmDialog();

  // Track if we paused the tracker for logout/quit dialogs
  const [pausedForLogout, setPausedForLogout] = useState(false);
  const [pausedForQuit, setPausedForQuit] = useState(false);

  // Get current org/workspace for display
  const currentOrg = currentOrgId
    ? organizations.find((o) => o.id === currentOrgId)
    : null;
  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((w) => w.id === currentWorkspaceId)
    : null;

  // Check tracking status and show logout dialog
  // If tracking is active, pause it first before showing dialog
  const handleLogoutRequest = useCallback(async () => {
    try {
      const status = await window.electronAPI.timeTracker.getStatus();

      // If tracking is running (not paused), pause it first
      if (status.isTracking && status.status === "running") {
        await window.electronAPI.timeTracker.pause();
        setPausedForLogout(true);

        // Get updated status after pause
        const pausedStatus = await window.electronAPI.timeTracker.getStatus();

        // Determine default task title (similar to ModernTimeTracker logic)
        // For manual tasks: use the task's title
        // For auto-track tasks: use taskTitle from currentTimeLog or "General Work"
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

        // Determine default task title
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
      logoutDialog.show({
        isTracking: false,
      });
    }
  }, [logoutDialog]);

  // Handle cancel logout - resume tracking if we paused it
  const handleCancelLogout = useCallback(() => {
    // Close dialog immediately
    logoutDialog.close();

    // Resume tracking in background (don't await)
    if (pausedForLogout) {
      window.electronAPI.timeTracker.resume().catch((error) => {
        console.error("Error resuming tracking:", error);
      });
      setPausedForLogout(false);
    }
  }, [pausedForLogout, logoutDialog]);

  // Execute logout after confirmation
  const executeLogout = useCallback(async () => {
    setPausedForLogout(false);
    await window.electronAPI.auth.clear();
    logout();
    setCurrentView("tracker");
    logoutDialog.close();
  }, [logout, logoutDialog]);

  // Stop tracking and then logout
  const handleStopAndLogout = useCallback(
    async (taskTitle: string) => {
      try {
        // Generate default title if empty
        const nowMs = Date.now();
        const defaultTitle = `Work Session - ${format(
          nowMs,
          "MMM d, yyyy"
        )} at ${format(nowMs, "hh:mm a")}`;
        const finalTitle = taskTitle?.trim() || defaultTitle;

        // Stop the current tracking session with task title and wait for sync
        console.log("🔄 Stopping tracking and syncing before logout...");
        await window.electronAPI.timeTracker.stopAndSync(finalTitle);
        console.log("✅ Stop and sync completed, now logging out...");
        setPausedForLogout(false);
        // Then logout
        await executeLogout();
      } catch (error) {
        console.error("Error stopping tracking:", error);
        // Try force stop if normal stop fails
        try {
          await window.electronAPI.timeTracker.forceStop();
          setPausedForLogout(false);
          await executeLogout();
        } catch (forceError) {
          console.error("Error force stopping:", forceError);
        }
      }
    },
    [executeLogout]
  );

  // Handle quit app request from renderer (if needed)
  // If tracking is active, pause it first before showing dialog
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuitAppRequest = useCallback(async () => {
    try {
      const status = await window.electronAPI.timeTracker.getStatus();

      // If tracking is running (not paused), pause it first
      if (status.isTracking && status.status === "running") {
        await window.electronAPI.timeTracker.pause();
        setPausedForQuit(true);

        // Get updated status after pause
        const pausedStatus = await window.electronAPI.timeTracker.getStatus();

        // Determine default task title (similar to ModernTimeTracker logic)
        // For manual tasks: use the task's title
        // For auto-track tasks: use taskTitle from currentTimeLog or "General Work"
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

        // Determine default task title
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
      quitAppDialog.show({
        isTracking: false,
      });
    }
  }, [quitAppDialog]);

  // Handle cancel quit - resume tracking if we paused it
  const handleCancelQuit = useCallback(() => {
    // Close dialog immediately
    quitAppDialog.close();

    // Resume tracking in background (don't await)
    if (pausedForQuit) {
      window.electronAPI.timeTracker.resume().catch((error) => {
        console.error("Error resuming tracking:", error);
      });
      setPausedForQuit(false);
    }
  }, [pausedForQuit, quitAppDialog]);

  // Execute quit after confirmation
  const executeQuitApp = useCallback(async () => {
    setPausedForQuit(false);
    quitAppDialog.close();
    await window.electronAPI.app.quit();
  }, [quitAppDialog]);

  // Stop tracking and then quit
  const handleStopAndQuit = useCallback(
    async (taskTitle: string) => {
      try {
        // Generate default title if empty
        const nowMs = Date.now();
        const defaultTitle = `Work Session - ${format(
          nowMs,
          "MMM d, yyyy"
        )} at ${format(nowMs, "hh:mm a")}`;
        const finalTitle = taskTitle?.trim() || defaultTitle;

        // Stop tracking with task title and wait for sync to complete before quit
        console.log("🔄 Stopping tracking and syncing before quit...");
        await window.electronAPI.timeTracker.stopAndSync(finalTitle);
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
        }
      }
    },
    [executeQuitApp]
  );

  // Listen for quit request from main process
  useEffect(() => {
    // This could be used for IPC events from main process
    // For example, when user clicks "Quit" from system tray
  }, []);

  // Get page title and description
  const getPageInfo = () => {
    const viewTitles: Record<View, { title: string; description: string }> = {
      tracker: {
        title: "Time Tracker",
        description: "Track your time and monitor your productivity",
      },
      tasks: {
        title: "Tasks",
        description: "Manage your tasks and track time spent",
      },
      screenshots: {
        title: "Screenshots",
        description: "View captured screenshots and activity",
      },
      stats: {
        title: "Statistics",
        description: "Analyze your productivity statistics",
      },
      organizations: {
        title: "Organizations",
        description: "Manage your organizations and teams",
      },
      workspaces: {
        title: "Workspaces",
        description: "View and manage your project workspaces",
      },
      settings: {
        title: "Settings",
        description: "Configure your preferences",
      },
    };
    return viewTitles[currentView];
  };

  if (authLoading) {
    return (
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
          // Refresh user data after login
          await refreshUserData();
        }}
      />
    );
  }

  const pageInfo = getPageInfo();

  return (
    <>
      {/* Logout Confirmation Dialog */}
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

      {/* Quit App Confirmation Dialog */}
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

      <div className="flex h-screen bg-gray-100 dark:bg-dark-950 overflow-hidden">
        {/* Sidebar with Org Rail */}
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogoutRequest}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top Header Bar */}
          <header className="flex-shrink-0 h-14 bg-white/50 dark:bg-dark-900/50 backdrop-blur-xl border-b border-gray-200 dark:border-dark-800/30 flex items-center px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              {currentOrg && (
                <>
                  <span className="text-gray-500 dark:text-dark-400">
                    {currentOrg.name}
                  </span>
                  <Icons.ChevronRight className="w-4 h-4 text-gray-400 dark:text-dark-600" />
                </>
              )}
              {currentWorkspace && (
                <>
                  <span className="text-gray-500 dark:text-dark-400">
                    {currentWorkspace.name}
                  </span>
                  <Icons.ChevronRight className="w-4 h-4 text-gray-400 dark:text-dark-600" />
                </>
              )}
              <span className="text-gray-800 dark:text-dark-100 font-medium">
                {pageInfo.title}
              </span>
            </div>

            {/* Right side actions */}
            <div className="ml-auto flex items-center gap-3">
              {/* Notifications (placeholder) */}
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors relative">
                <Icons.Bell className="w-5 h-5 text-gray-500 dark:text-dark-400" />
                {/* Notification badge */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Quick search (placeholder) */}
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700/50 hover:border-gray-300 dark:hover:border-dark-600/50 transition-colors">
                <Icons.Search className="w-4 h-4 text-gray-500 dark:text-dark-400" />
                <span className="text-sm text-gray-500 dark:text-dark-400">
                  Search...
                </span>
                <kbd className="text-xs text-gray-400 dark:text-dark-500 bg-gray-200 dark:bg-dark-700/50 px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-dark-50 mb-1">
                  {pageInfo.title}
                </h1>
                <p className="text-gray-500 dark:text-dark-400 text-sm lg:text-base">
                  {pageInfo.description}
                </p>
              </div>

              {/* Content */}
              <div className="animate-fade-in">
                {currentView === "tracker" && <ModernTimeTracker />}
                {currentView === "tasks" && (
                  <TasksView
                    onNavigateToTracker={() => setCurrentView("tracker")}
                  />
                )}
                {currentView === "screenshots" && <ScreenshotViewer />}
                {currentView === "stats" && <StatisticsView />}
                {currentView === "organizations" && <OrganizationsView />}
                {currentView === "workspaces" && <WorkspacesView />}
                {currentView === "settings" && <Settings />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// Wrapper component with AuthProvider
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
        // Verify token với server - check user còn tồn tại không
        try {
          const { authService } = await import("./services/authService");
          const response = await authService.me();

          if (response.success && response.data) {
            // Token valid và user còn tồn tại
            setIsAuthenticated(true);
          } else {
            // Token invalid hoặc user không tồn tại
            console.warn("User verification failed, clearing credentials");
            await window.electronAPI.auth.clear();
            setIsAuthenticated(false);
          }
        } catch (error) {
          // API call thất bại (401, 404, network error, etc.)
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
    return (
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
  }

  return (
    <AuthProvider initialAuthenticated={isAuthenticated}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
