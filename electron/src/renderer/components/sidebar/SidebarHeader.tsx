/**
 * SidebarHeader Component
 * Header section of the sidebar showing organization info
 */

import React from "react";
import { UserOrganization } from "../../contexts/AuthContext";
import { Icons } from "../Icons";

interface SidebarHeaderProps {
  currentOrg: UserOrganization | undefined;
  isCollapsed: boolean;
  isOrgRailCollapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleOrgRailCollapsed: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  currentOrg,
  isCollapsed,
  isOrgRailCollapsed,
  onToggleCollapsed,
  onToggleOrgRailCollapsed,
}) => {
  if (isCollapsed) {
    return (
      <div className="flex flex-col gap-1.5 items-center">
        {/* Show org rail toggle when org rail is hidden */}
        {isOrgRailCollapsed && (
          <button
            onClick={onToggleOrgRailCollapsed}
            className="w-full flex justify-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors group relative"
            title="Show organizations"
          >
            <Icons.Organization className="w-4 h-4 text-gray-500 dark:text-dark-400" />
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                Show organizations
              </span>
            </div>
          </button>
        )}
        <button
          onClick={onToggleCollapsed}
          className="w-full flex justify-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors group relative"
          title="Expand sidebar"
        >
          <Icons.ChevronRight className="w-4 h-4 text-gray-500 dark:text-dark-400" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              Expand sidebar
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Show org rail toggle when org rail is hidden */}
      {isOrgRailCollapsed && (
        <button
          onClick={onToggleOrgRailCollapsed}
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
        <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {currentOrg?.name || "Select Organization"}
        </h2>
        <p className="text-[10px] text-gray-500 dark:text-dark-400">
          {currentOrg?.role === "owner" ? "Owner" : currentOrg?.role || ""}
        </p>
      </div>
      <button
        onClick={onToggleCollapsed}
        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors flex-shrink-0"
        title="Collapse sidebar"
      >
        <Icons.ChevronLeft className="w-4 h-4 text-gray-500 dark:text-dark-400" />
      </button>
    </div>
  );
};

export default SidebarHeader;
