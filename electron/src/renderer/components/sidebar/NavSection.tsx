/**
 * NavSection Component
 * Navigation section with items for the sidebar
 */

import React from "react";
import { Icons } from "../Icons";
import { NavItem, View } from "./types";

interface NavSectionProps {
  title: string;
  items: NavItem[];
  currentView: View;
  onViewChange: (view: View) => void;
  isCollapsed: boolean;
  showDivider?: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({
  title,
  items,
  currentView,
  onViewChange,
  isCollapsed,
  showDivider = false,
}) => {
  return (
    <div className="mb-3">
      {/* Section Title */}
      {!isCollapsed && (
        <div className="px-2 py-1.5">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-dark-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}

      {/* Divider for collapsed state */}
      {isCollapsed && showDivider && (
        <div className="h-px bg-gray-200 dark:bg-dark-700/50 mx-1.5 my-1.5" />
      )}

      {/* Nav Items */}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`w-full flex items-center rounded-md transition-all duration-200 group relative ${
            isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
          } ${
            currentView === item.id
              ? "bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400"
              : "text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800/50 hover:text-gray-800 dark:hover:text-dark-100"
          }`}
        >
          <item.icon
            className={`w-4 h-4 flex-shrink-0 ${
              currentView === item.id
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-500 dark:text-dark-400 group-hover:text-gray-600 dark:group-hover:text-dark-300"
            }`}
          />
          {!isCollapsed && (
            <>
              <span className="font-medium text-xs truncate">{item.label}</span>
              {currentView === item.id && (
                <span className="ml-auto w-1 h-1 bg-primary-500 dark:bg-primary-400 rounded-full flex-shrink-0" />
              )}
            </>
          )}
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

interface NoWorkspaceMessageProps {
  hasAnyWorkspace: boolean;
  onViewChange: (view: View) => void;
}

export const NoWorkspaceMessage: React.FC<NoWorkspaceMessageProps> = ({
  hasAnyWorkspace,
  onViewChange,
}) => {
  return (
    <div className="px-2 py-3">
      <div className="bg-gray-100 dark:bg-dark-800/30 rounded-lg p-3 border border-gray-200 dark:border-dark-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Workspace className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
            {hasAnyWorkspace ? "Select Workspace" : "No Workspace Access"}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-dark-400 leading-relaxed">
          {hasAnyWorkspace
            ? "Please select a workspace from the dropdown above to access features."
            : "You need to be assigned to a workspace by an organization admin or owner to access time tracking features."}
        </p>
        {hasAnyWorkspace && (
          <button
            onClick={() => onViewChange("workspaces")}
            className="mt-2 w-full text-[10px] px-2 py-1.5 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-md hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors font-medium"
          >
            View Workspaces
          </button>
        )}
      </div>
    </div>
  );
};

export default NavSection;
