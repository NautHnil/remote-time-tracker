/**
 * Route Configuration
 * Centralized route definitions for the application
 */

import { View } from "../components/layout";

export interface RouteConfig {
  id: View;
  title: string;
  description: string;
  requiresWorkspace?: boolean;
}

export const routes: Record<View, RouteConfig> = {
  tracker: {
    id: "tracker",
    title: "Time Tracker",
    description: "Track your time and monitor your productivity",
    requiresWorkspace: true,
  },
  tasks: {
    id: "tasks",
    title: "Tasks",
    description: "Manage your tasks and track time spent",
    requiresWorkspace: true,
  },
  screenshots: {
    id: "screenshots",
    title: "Screenshots",
    description: "View captured screenshots and activity",
    requiresWorkspace: true,
  },
  stats: {
    id: "stats",
    title: "Statistics",
    description: "Analyze your productivity statistics",
    requiresWorkspace: true,
  },
  organizations: {
    id: "organizations",
    title: "Organizations",
    description: "Manage your organizations and teams",
    requiresWorkspace: false,
  },
  workspaces: {
    id: "workspaces",
    title: "Workspaces",
    description: "View and manage your project workspaces",
    requiresWorkspace: false,
  },
  settings: {
    id: "settings",
    title: "Settings",
    description: "Manage your application preferences and configuration",
    requiresWorkspace: false,
  },
};

export const getRouteConfig = (view: View): RouteConfig => {
  return routes[view];
};
