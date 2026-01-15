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
import { View } from "../layout";

interface AppRouterProps {
  currentView: View;
  onNavigateToTracker: () => void;
}

/**
 * AppRouter - Renders the appropriate page component based on current view
 * This provides a centralized place to manage all page routing
 */
const AppRouter: React.FC<AppRouterProps> = ({
  currentView,
  onNavigateToTracker,
}) => {
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
      return <ModernTimeTracker />;
  }
};

export default AppRouter;
