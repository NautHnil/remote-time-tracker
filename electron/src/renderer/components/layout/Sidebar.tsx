/**
 * Modern Sidebar Layout - Slack/100ms inspired
 * Features:
 * - Organization rail on the far left
 * - Main navigation sidebar
 * - Workspace switcher
 * - User profile section
 * - Mini time tracker status
 */

import React, { useState } from "react";
import { useAuth, UserWorkspace } from "../../contexts/AuthContext";
import { Icons } from "../Icons";
import {
  NavItem,
  NavSection,
  NoWorkspaceMessage,
  OrgRail,
  SettingsButton,
  SidebarHeader,
  UserProfile,
  View,
  WorkspaceSwitcher,
} from "./sidebar-components";

// Re-export View type for external usage
export type { View } from "./sidebar-components";

// ============================================================================
// TYPES
// ============================================================================

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
}

// ============================================================================
// COLLAPSED WORKSPACE INDICATOR
// ============================================================================

interface CollapsedWorkspaceIndicatorProps {
  currentWorkspaceId: number | null;
  workspaces: UserWorkspace[];
  onExpand: () => void;
}

const CollapsedWorkspaceIndicator: React.FC<
  CollapsedWorkspaceIndicatorProps
> = ({ currentWorkspaceId, workspaces, onExpand }) => {
  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((w) => w.id === currentWorkspaceId)
    : null;

  return (
    <div className="p-1.5 border-b border-gray-200 dark:border-dark-800/30 flex-shrink-0">
      <button
        onClick={onExpand}
        className="w-full flex justify-center p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors group relative"
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/30 aspect-square">
          <Icons.Workspace className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
        </div>
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
          <div className="text-[10px] text-gray-500 dark:text-dark-400">
            Workspace
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            {currentWorkspace?.name || "Select workspace..."}
          </div>
        </div>
      </button>
    </div>
  );
};

// ============================================================================
// MAIN SIDEBAR
// ============================================================================

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onLogout,
}) => {
  const {
    user,
    organizations,
    workspaces,
    currentOrgId,
    currentWorkspaceId,
    setCurrentOrg,
    setCurrentWorkspace,
  } = useAuth();

  // Collapsed state - persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Org rail collapsed state - persisted in localStorage
  const [isOrgRailCollapsed, setIsOrgRailCollapsed] = useState(() => {
    try {
      return localStorage.getItem("org_rail_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(newValue));
      } catch {
        // Ignore
      }
      return newValue;
    });
  };

  // Toggle org rail collapsed state
  const toggleOrgRailCollapsed = () => {
    setIsOrgRailCollapsed((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem("org_rail_collapsed", String(newValue));
      } catch {
        // Ignore
      }
      return newValue;
    });
  };

  // Get current organization
  const currentOrg = currentOrgId
    ? organizations.find((o) => o.id === currentOrgId)
    : undefined;

  // Check if user has selected a workspace
  const filteredWorkspacesForOrg = currentOrgId
    ? workspaces.filter((ws) => ws.organization_id === currentOrgId)
    : workspaces;
  const hasSelectedWorkspace =
    currentWorkspaceId !== null &&
    filteredWorkspacesForOrg.some((ws) => ws.id === currentWorkspaceId);
  const hasAnyWorkspace = filteredWorkspacesForOrg.length > 0;

  // Navigation items
  const mainNavItems: NavItem[] = [
    {
      id: "tracker",
      icon: Icons.Clock,
      label: "Time Tracker",
      description: "Track your work sessions",
    },
    {
      id: "tasks",
      icon: Icons.Task,
      label: "Tasks",
      description: "Manage your tasks",
    },
    {
      id: "screenshots",
      icon: Icons.Camera,
      label: "Screenshots",
      description: "View captured screenshots",
    },
    {
      id: "stats",
      icon: Icons.Chart,
      label: "Statistics",
      description: "Analyze productivity",
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      id: "organizations",
      icon: Icons.Organization,
      label: "Organizations",
      description: "Manage organizations",
    },
    {
      id: "workspaces",
      icon: Icons.Workspace,
      label: "Workspaces",
      description: "Manage workspaces",
    },
  ];

  return (
    <div className="flex h-full z-10 relative">
      {/* Organization Rail */}
      <OrgRail
        organizations={organizations}
        currentOrgId={currentOrgId}
        onSelectOrg={setCurrentOrg}
        onAddOrg={() => onViewChange("organizations")}
        onTrackerClick={() => onViewChange("tracker")}
        isCollapsed={isOrgRailCollapsed}
        onToggleCollapse={toggleOrgRailCollapsed}
      />

      {/* Main Sidebar - Collapsible */}
      <aside
        className={`bg-white/70 dark:bg-dark-900/70 backdrop-blur-xl border-r border-gray-200 dark:border-dark-800/30 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-14 overflow-visible" : "w-56 overflow-hidden"
        }`}
      >
        {/* Header - Organization Name */}
        <div
          className={`border-b border-gray-200 dark:border-dark-800/30 flex-shrink-0 ${
            isCollapsed ? "p-1.5" : "p-3"
          }`}
        >
          <SidebarHeader
            currentOrg={currentOrg}
            isCollapsed={isCollapsed}
            isOrgRailCollapsed={isOrgRailCollapsed}
            onToggleCollapsed={toggleCollapsed}
            onToggleOrgRailCollapsed={toggleOrgRailCollapsed}
          />
        </div>

        {/* Workspace Switcher - Hidden when collapsed, show mini indicator instead */}
        {!isCollapsed ? (
          <div className="p-2 border-b border-gray-200 dark:border-dark-800/30 flex-shrink-0">
            <WorkspaceSwitcher
              workspaces={workspaces}
              currentWorkspaceId={currentWorkspaceId}
              currentOrgId={currentOrgId}
              onSelectWorkspace={setCurrentWorkspace}
            />
          </div>
        ) : (
          <CollapsedWorkspaceIndicator
            currentWorkspaceId={currentWorkspaceId}
            workspaces={workspaces}
            onExpand={toggleCollapsed}
          />
        )}

        {/* Main Navigation */}
        <nav
          className={`flex-1 space-y-0.5 ${
            isCollapsed
              ? "p-1.5 overflow-visible"
              : "p-2 overflow-y-auto overflow-x-hidden"
          }`}
        >
          {/* Main Section */}
          {hasSelectedWorkspace ? (
            <NavSection
              title="Main"
              items={mainNavItems}
              currentView={currentView}
              onViewChange={onViewChange}
              isCollapsed={isCollapsed}
            />
          ) : (
            !isCollapsed && (
              <div className="mb-3">
                <div className="px-2 py-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-dark-500 uppercase tracking-wider">
                    Main
                  </span>
                </div>
                <NoWorkspaceMessage
                  hasAnyWorkspace={hasAnyWorkspace}
                  onViewChange={onViewChange}
                />
              </div>
            )
          )}

          {/* Admin Section */}
          <NavSection
            title="Manager"
            items={adminNavItems}
            currentView={currentView}
            onViewChange={onViewChange}
            isCollapsed={isCollapsed}
            showDivider={true}
          />
        </nav>

        {/* Footer - User Profile & Settings */}
        <div
          className={`border-t border-gray-200 dark:border-dark-800/30 space-y-1.5 flex-shrink-0 ${
            isCollapsed ? "p-1.5" : "p-2"
          }`}
        >
          {/* Settings Button */}
          <SettingsButton
            currentView={currentView}
            isCollapsed={isCollapsed}
            onViewChange={onViewChange}
          />

          {/* User Profile Card */}
          <UserProfile
            user={user}
            isCollapsed={isCollapsed}
            onLogout={onLogout}
          />
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
