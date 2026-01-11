import { useEffect, useState } from "react";
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

  // Get current org/workspace for display
  const currentOrg = currentOrgId
    ? organizations.find((o) => o.id === currentOrgId)
    : null;
  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((w) => w.id === currentWorkspaceId)
    : null;

  const handleLogout = async () => {
    await window.electronAPI.auth.clear();
    logout();
    setCurrentView("tracker");
  };

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
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4 shadow-glow animate-pulse">
            <Icons.Clock className="w-8 h-8 text-white" />
          </div>
          <div className="text-dark-200 text-lg font-medium">Loading...</div>
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
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar with Org Rail */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="flex-shrink-0 h-14 bg-dark-900/50 backdrop-blur-xl border-b border-dark-800/30 flex items-center px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            {currentOrg && (
              <>
                <span className="text-dark-400">{currentOrg.name}</span>
                <Icons.ChevronRight className="w-4 h-4 text-dark-600" />
              </>
            )}
            {currentWorkspace && (
              <>
                <span className="text-dark-400">{currentWorkspace.name}</span>
                <Icons.ChevronRight className="w-4 h-4 text-dark-600" />
              </>
            )}
            <span className="text-dark-100 font-medium">{pageInfo.title}</span>
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* Notifications (placeholder) */}
            <button className="p-2 rounded-lg hover:bg-dark-800/50 transition-colors relative">
              <Icons.Bell className="w-5 h-5 text-dark-400" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Quick search (placeholder) */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/50 hover:border-dark-600/50 transition-colors">
              <Icons.Search className="w-4 h-4 text-dark-400" />
              <span className="text-sm text-dark-400">Search...</span>
              <kbd className="text-xs text-dark-500 bg-dark-700/50 px-1.5 py-0.5 rounded">
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
              <h1 className="text-2xl lg:text-3xl font-bold text-dark-50 mb-1">
                {pageInfo.title}
              </h1>
              <p className="text-dark-400 text-sm lg:text-base">
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
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4 shadow-glow animate-pulse">
            <Icons.Clock className="w-8 h-8 text-white" />
          </div>
          <div className="text-dark-200 text-lg font-medium">Loading...</div>
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
