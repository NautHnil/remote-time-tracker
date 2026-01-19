/**
 * AppRouter Component
 * Handles rendering the correct page based on current view
 */

import React from "react";
import ModernTimeTracker from "../components/ModernTimeTracker";
import { OrganizationsView } from "../components/organizations";
import ScreenshotViewer from "../components/ScreenshotViewer";
import { Settings } from "../components/settings";
import StatisticsView from "../components/StatisticsView";
import TasksView from "../components/TasksView";
import { WorkspacesView } from "../components/workspaces";
import { useAuth } from "../contexts/AuthContext";
import { View } from "../layout";

interface AppRouterProps {
  currentView: View;
  onNavigateToTracker: () => void;
}

// Views that require a workspace to be selected
const workspaceRequiredViews: View[] = [
  "tracker",
  "tasks",
  "screenshots",
  "stats",
];

/**
 * AppRouter - Renders the appropriate page component based on current view
 * This provides a centralized place to manage all page routing
 *
 * When user has no workspace assigned:
 * - Views that require workspace (tracker, tasks, screenshots, stats) will redirect to OrganizationsView
 * - This ensures users without workspace access see the organization view instead
 */
const AppRouter: React.FC<AppRouterProps> = ({
  currentView,
  onNavigateToTracker,
}) => {
  const { workspaces, currentOrgId, currentWorkspaceId } = useAuth();

  // Check if user has any workspace in the current organization
  const filteredWorkspacesForOrg = currentOrgId
    ? workspaces.filter((ws) => ws.organization_id === currentOrgId)
    : workspaces;
  const hasWorkspace = filteredWorkspacesForOrg.length > 0;
  const hasSelectedWorkspace =
    currentWorkspaceId !== null &&
    filteredWorkspacesForOrg.some((ws) => ws.id === currentWorkspaceId);

  // If view requires workspace but user has none, show OrganizationsView
  if (
    workspaceRequiredViews.includes(currentView) &&
    (!hasWorkspace || !hasSelectedWorkspace)
  ) {
    return <OrganizationsView />;
  }

  switch (currentView) {
    case "tracker":
      return <ModernTimeTracker />;
    case "tasks":
      return <TasksView onNavigateToTracker={onNavigateToTracker} />;
    case "screenshots":
      return <ScreenshotViewer />;
    case "stats":
      return <StatisticsView />;
    case "organizations":
      return <OrganizationsView />;
    case "workspaces":
      return <WorkspacesView />;
    case "settings":
      return <Settings />;
    default:
      return <OrganizationsView />;
  }
};

export default AppRouter;
