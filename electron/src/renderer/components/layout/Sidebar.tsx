/**
 * Modern Sidebar Layout - Slack/100ms inspired
 * Features:
 * - Organization rail on the far left
 * - Main navigation sidebar
 * - Workspace switcher
 * - User profile section
 * - Mini time tracker status
 */

import React, { useEffect, useRef, useState } from "react";
import {
  useAuth,
  UserOrganization,
  UserWorkspace,
} from "../../contexts/AuthContext";
import { formatTimeCompact } from "../../utils/timeFormat";
import { Icons } from "../Icons";

// ============================================================================
// TYPES
// ============================================================================

export type View =
  | "tracker"
  | "tasks"
  | "screenshots"
  | "stats"
  | "organizations"
  | "workspaces"
  | "settings";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
}

// ============================================================================
// MINI TRACKER STATUS (Bottom of Org Rail)
// ============================================================================

interface MiniTrackerStatusProps {
  onClick: () => void;
}

const MiniTrackerStatus: React.FC<MiniTrackerStatusProps> = ({ onClick }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll tracking status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.timeTracker.getStatus();
        setIsTracking(status?.isTracking || status?.status === "running");
        setElapsedTime(status?.elapsedTime || 0);
      } catch (error) {
        // Silently fail
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-200 group ${
        isTracking
          ? "bg-green-500/20 border border-green-500/30"
          : "bg-dark-800/50 hover:bg-dark-700"
      }`}
      title={isTracking ? "Tracking..." : "Start Tracking"}
    >
      {isTracking ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-green-400 mt-0.5">
            {formatTimeCompact(elapsedTime)}
          </span>
        </>
      ) : (
        <Icons.Play className="w-5 h-5 text-dark-400 group-hover:text-dark-200" />
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-3 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100] border border-dark-700 shadow-xl">
        <span className="text-xs font-medium text-white">
          {isTracking ? "Tracking in progress" : "Open Time Tracker"}
        </span>
      </div>
    </button>
  );
};

// ============================================================================
// ORGANIZATION RAIL (Far Left - Slack Style)
// ============================================================================

interface OrgRailProps {
  organizations: UserOrganization[];
  currentOrgId: number | null;
  onSelectOrg: (orgId: number) => void;
  onAddOrg: () => void;
  onTrackerClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const OrgRail: React.FC<OrgRailProps> = ({
  organizations,
  currentOrgId,
  onSelectOrg,
  onAddOrg,
  onTrackerClick,
  isCollapsed,
  onToggleCollapse,
}) => {
  // When collapsed, hide the entire org rail
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="w-[68px] bg-dark-950 border-r border-dark-800/50 flex flex-col items-center py-3 gap-2 flex-shrink-0 overflow-hidden">
      {/* Logo at top - decorative only */}
      <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg mb-2 flex-shrink-0">
        <Icons.Clock className="w-5 h-5 text-white" />
      </div>

      {/* Divider */}
      <div className="h-px bg-dark-700 mb-1 w-8" />

      {/* Organizations List */}
      <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden scrollbar-hide w-full px-1">
        {organizations.map((org) => {
          const isActive = org.id === currentOrgId;
          const initial = org.name.charAt(0).toUpperCase();

          return (
            <button
              key={org.id}
              onClick={() => onSelectOrg(org.id)}
              className={`relative group flex-shrink-0 rounded-2xl w-11 h-11 flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl"
                  : "bg-dark-800 hover:bg-dark-700 hover:rounded-xl"
              }`}
              title={org.name}
            >
              {/* Active Indicator */}
              <div
                className={`absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200 ${
                  isActive ? "h-8" : "h-0 group-hover:h-5"
                }`}
                style={{
                  transform: "translateX(-8px)",
                }}
              />

              {/* Org Initial or Logo */}
              <span
                className={`font-bold text-base ${
                  isActive ? "text-white" : "text-dark-300"
                }`}
              >
                {initial}
              </span>

              {/* Owner Badge */}
              {org.is_owner && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-dark-950">
                  <Icons.Star className="w-2.5 h-2.5 text-dark-900" />
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-dark-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-200 whitespace-nowrap z-[100] border border-dark-700 shadow-xl">
                <span className="text-sm font-medium text-white">
                  {org.name}
                </span>
                {org.is_owner && (
                  <span className="ml-2 text-xs text-yellow-400">Owner</span>
                )}
              </div>
            </button>
          );
        })}

        {/* Add Organization Button */}
        <button
          onClick={onAddOrg}
          className="flex-shrink-0 rounded-2xl w-11 h-11 bg-dark-800/50 hover:bg-dark-700 border-2 border-dashed border-dark-600 hover:border-dark-500 flex items-center justify-center transition-all duration-200 group"
          title="Add Organization"
        >
          <Icons.Plus className="w-4 h-4 text-dark-400 group-hover:text-dark-200" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-dark-700 mt-1 w-8" />

      {/* Mini Tracker Status at bottom */}
      <MiniTrackerStatus onClick={onTrackerClick} />

      {/* Collapse Button at the very bottom */}
      <button
        onClick={onToggleCollapse}
        className="w-9 h-9 rounded-lg bg-dark-800/50 hover:bg-dark-700 flex items-center justify-center transition-all duration-200 group mt-1"
        title="Hide organization panel"
      >
        <Icons.ChevronLeft className="w-4 h-4 text-dark-400 group-hover:text-dark-200" />
      </button>
    </div>
  );
};

// ============================================================================
// WORKSPACE SWITCHER DROPDOWN
// ============================================================================

interface WorkspaceSwitcherProps {
  workspaces: UserWorkspace[];
  currentWorkspaceId: number | null;
  currentOrgId: number | null;
  onSelectWorkspace: (workspaceId: number | null) => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspaceId,
  currentOrgId,
  onSelectWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter workspaces by current org
  const filteredWorkspaces = currentOrgId
    ? workspaces.filter((ws) => ws.organization_id === currentOrgId)
    : workspaces;

  const currentWorkspace = currentWorkspaceId
    ? workspaces.find((ws) => ws.id === currentWorkspaceId)
    : null;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (filteredWorkspaces.length === 0) {
    return (
      <div className="px-4 py-3 bg-dark-800/30 rounded-xl border border-dark-700/50">
        <div className="text-xs text-dark-400">No workspaces</div>
        <div className="text-sm text-dark-300 mt-0.5">
          Select an organization first
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-2 bg-dark-800/30 hover:bg-dark-800/50 rounded-lg border border-dark-700/50 hover:border-dark-600/50 transition-all duration-200 flex items-center gap-2"
      >
        {/* Workspace Icon */}
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/30 flex-shrink-0">
          <Icons.Workspace className="w-3.5 h-3.5 text-accent-400" />
        </div>

        {/* Workspace Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] text-dark-400 font-medium">Workspace</div>
          <div className="text-xs text-dark-100 font-semibold truncate">
            {currentWorkspace ? currentWorkspace.name : "Select workspace..."}
          </div>
        </div>

        {/* Chevron */}
        <Icons.ChevronDown
          className={`w-3.5 h-3.5 text-dark-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1.5 bg-dark-900 rounded-lg border border-dark-700/50 shadow-2xl z-50 max-h-[250px] overflow-y-auto">
          {/* Workspace List */}
          {filteredWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onSelectWorkspace(ws.id);
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 flex items-center gap-2 hover:bg-dark-800/50 transition-colors ${
                ws.id === currentWorkspaceId ? "bg-primary-500/10" : ""
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/20 flex-shrink-0">
                <span className="text-[10px] font-bold text-accent-400">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium text-dark-200 truncate">
                  {ws.name}
                </div>
                {ws.is_admin && (
                  <div className="text-[10px] text-dark-400">Admin</div>
                )}
              </div>
              {ws.id === currentWorkspaceId && (
                <Icons.Check className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
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
    permissions,
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
    : null;

  // Check if user has selected a workspace
  const filteredWorkspacesForOrg = currentOrgId
    ? workspaces.filter((ws) => ws.organization_id === currentOrgId)
    : workspaces;
  const hasSelectedWorkspace =
    currentWorkspaceId !== null &&
    filteredWorkspacesForOrg.some((ws) => ws.id === currentWorkspaceId);
  const hasAnyWorkspace = filteredWorkspacesForOrg.length > 0;

  // Navigation items
  const mainNavItems = [
    {
      id: "tracker" as View,
      icon: Icons.Clock,
      label: "Time Tracker",
      description: "Track your work sessions",
    },
    {
      id: "tasks" as View,
      icon: Icons.Task,
      label: "Tasks",
      description: "Manage your tasks",
    },
    {
      id: "screenshots" as View,
      icon: Icons.Camera,
      label: "Screenshots",
      description: "View captured screenshots",
    },
    {
      id: "stats" as View,
      icon: Icons.Chart,
      label: "Statistics",
      description: "Analyze productivity",
    },
  ];

  const adminNavItems = [
    {
      id: "organizations" as View,
      icon: Icons.Organization,
      label: "Organizations",
      description: "Manage organizations",
    },
    {
      id: "workspaces" as View,
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
        className={`bg-dark-900/70 backdrop-blur-xl border-r border-dark-800/30 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-14 overflow-visible" : "w-56 overflow-hidden"
        }`}
      >
        {/* Header - Organization Name */}
        <div
          className={`border-b border-dark-800/30 flex-shrink-0 ${
            isCollapsed ? "p-1.5" : "p-3"
          }`}
        >
          {isCollapsed ? (
            /* Collapsed: Show toggle buttons */
            <div className="flex flex-col gap-1.5 items-center">
              {/* Show org rail toggle when org rail is hidden */}
              {isOrgRailCollapsed && (
                <button
                  onClick={toggleOrgRailCollapsed}
                  className="w-full flex justify-center p-1.5 rounded-md hover:bg-dark-800/50 transition-colors group relative"
                  title="Show organizations"
                >
                  <Icons.Organization className="w-4 h-4 text-dark-400" />
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                    <span className="text-xs font-medium text-white">
                      Show organizations
                    </span>
                  </div>
                </button>
              )}
              <button
                onClick={toggleCollapsed}
                className="w-full flex justify-center p-1.5 rounded-md hover:bg-dark-800/50 transition-colors group relative"
                title="Expand sidebar"
              >
                <Icons.ChevronRight className="w-4 h-4 text-dark-400" />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                  <span className="text-xs font-medium text-white">
                    Expand sidebar
                  </span>
                </div>
              </button>
            </div>
          ) : (
            /* Expanded: Show org info and collapse button */
            <div className="flex items-center gap-2">
              {/* Show org rail toggle when org rail is hidden */}
              {isOrgRailCollapsed && (
                <button
                  onClick={toggleOrgRailCollapsed}
                  className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 aspect-square hover:scale-105 transition-transform"
                  title="Show organizations"
                >
                  <Icons.ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}
              {!isOrgRailCollapsed && (
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 aspect-square">
                  <Icons.Organization className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white truncate">
                  {currentOrg?.name || "Select Organization"}
                </h2>
                <p className="text-[10px] text-dark-400">
                  {currentOrg?.role === "owner"
                    ? "Owner"
                    : currentOrg?.role || ""}
                </p>
              </div>
              <button
                onClick={toggleCollapsed}
                className="p-1 rounded-md hover:bg-dark-800/50 transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <Icons.ChevronLeft className="w-4 h-4 text-dark-400" />
              </button>
            </div>
          )}
        </div>

        {/* Workspace Switcher - Hidden when collapsed, show mini indicator instead */}
        {!isCollapsed ? (
          <div className="p-2 border-b border-dark-800/30 flex-shrink-0">
            <WorkspaceSwitcher
              workspaces={workspaces}
              currentWorkspaceId={currentWorkspaceId}
              currentOrgId={currentOrgId}
              onSelectWorkspace={setCurrentWorkspace}
            />
          </div>
        ) : (
          /* Collapsed Workspace Indicator */
          <div className="p-1.5 border-b border-dark-800/30 flex-shrink-0">
            <button
              onClick={toggleCollapsed}
              className="w-full flex justify-center p-1.5 rounded-lg hover:bg-dark-800/50 transition-colors group relative"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/30 aspect-square">
                <Icons.Workspace className="w-3.5 h-3.5 text-accent-400" />
              </div>
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                <div className="text-[10px] text-dark-400">Workspace</div>
                <div className="text-xs font-medium text-white">
                  {currentWorkspaceId
                    ? workspaces.find((w) => w.id === currentWorkspaceId)?.name
                    : "Select workspace..."}
                </div>
              </div>
            </button>
          </div>
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
          <div className="mb-3">
            {!isCollapsed && (
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">
                  Main
                </span>
              </div>
            )}
            {hasSelectedWorkspace
              ? // Show main nav items when workspace is selected
                mainNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center rounded-md transition-all duration-200 group relative ${
                      isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
                    } ${
                      currentView === item.id
                        ? "bg-primary-500/15 text-primary-400"
                        : "text-dark-300 hover:bg-dark-800/50 hover:text-dark-100"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        currentView === item.id
                          ? "text-primary-400"
                          : "text-dark-400 group-hover:text-dark-300"
                      }`}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="font-medium text-xs truncate">
                          {item.label}
                        </span>
                        {currentView === item.id && (
                          <span className="ml-auto w-1 h-1 bg-primary-400 rounded-full flex-shrink-0" />
                        )}
                      </>
                    )}
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                        <span className="text-xs font-medium text-white">
                          {item.label}
                        </span>
                      </div>
                    )}
                  </button>
                ))
              : // Show message when no workspace is selected
                !isCollapsed && (
                  <div className="px-2 py-3">
                    <div className="bg-dark-800/30 rounded-lg p-3 border border-dark-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Icons.Workspace className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-400">
                          {hasAnyWorkspace
                            ? "Select Workspace"
                            : "No Workspace"}
                        </span>
                      </div>
                      <p className="text-[10px] text-dark-400 leading-relaxed">
                        {hasAnyWorkspace
                          ? "Please select a workspace from the dropdown above to access features."
                          : "Join or create a workspace to start tracking time and managing tasks."}
                      </p>
                      {!hasAnyWorkspace && (
                        <button
                          onClick={() => onViewChange("workspaces")}
                          className="mt-2 w-full text-[10px] px-2 py-1.5 bg-primary-500/20 text-primary-400 rounded-md hover:bg-primary-500/30 transition-colors font-medium"
                        >
                          Manage Workspaces
                        </button>
                      )}
                    </div>
                  </div>
                )}
          </div>

          {/* Admin Section */}
          <div>
            {!isCollapsed && (
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-semibold text-dark-500 uppercase tracking-wider">
                  Manager
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="h-px bg-dark-700/50 mx-1.5 my-1.5" />
            )}
            {adminNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center rounded-md transition-all duration-200 group relative ${
                  isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
                } ${
                  currentView === item.id
                    ? "bg-primary-500/15 text-primary-400"
                    : "text-dark-300 hover:bg-dark-800/50 hover:text-dark-100"
                }`}
              >
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    currentView === item.id
                      ? "text-primary-400"
                      : "text-dark-400 group-hover:text-dark-300"
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="font-medium text-xs truncate">
                      {item.label}
                    </span>
                    {currentView === item.id && (
                      <span className="ml-auto w-1 h-1 bg-primary-400 rounded-full flex-shrink-0" />
                    )}
                  </>
                )}
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                    <span className="text-xs font-medium text-white">
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer - User Profile & Settings */}
        <div
          className={`border-t border-dark-800/30 space-y-1.5 flex-shrink-0 ${
            isCollapsed ? "p-1.5" : "p-2"
          }`}
        >
          {/* Settings Button */}
          <button
            onClick={() => onViewChange("settings")}
            className={`w-full flex items-center rounded-md transition-all duration-200 group relative ${
              isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
            } ${
              currentView === "settings"
                ? "bg-primary-500/15 text-primary-400"
                : "text-dark-300 hover:bg-dark-800/50 hover:text-dark-100"
            }`}
          >
            <Icons.Settings className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-xs">Settings</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                <span className="text-xs font-medium text-white">Settings</span>
              </div>
            )}
          </button>

          {/* User Profile Card */}
          {isCollapsed ? (
            /* Collapsed User Avatar */
            <div className="relative group">
              <button
                onClick={onLogout}
                className="w-full flex justify-center p-1.5"
              >
                <div className="w-8 h-8 aspect-square bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-lg flex-shrink-0">
                  {user?.email.charAt(0).toUpperCase()}
                </div>
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1.5 bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-dark-700 shadow-xl">
                <div className="text-xs font-medium text-white">
                  {user?.first_name || user?.email.split("@")[0]}
                </div>
                <div className="text-[10px] text-dark-400">{user?.email}</div>
                <div className="text-[10px] text-red-400 mt-0.5">
                  Click to sign out
                </div>
              </div>
            </div>
          ) : (
            /* Expanded User Profile Card */
            <div className="bg-dark-800/30 rounded-lg p-2">
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className="w-8 h-8 aspect-square bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-lg flex-shrink-0">
                  {user?.email.charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-dark-100 truncate">
                    {user?.first_name || user?.email.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-dark-400 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mt-2">
                {permissions.isSystemAdmin && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    System Admin
                  </span>
                )}
                {permissions.isOrgOwner && !permissions.isSystemAdmin && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Org Owner
                  </span>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-dark-700/50 hover:bg-red-500/20 hover:text-red-400 text-dark-300 transition-all duration-200 text-xs font-medium"
              >
                <Icons.Logout className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
