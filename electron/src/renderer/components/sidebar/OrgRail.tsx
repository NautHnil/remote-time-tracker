/**
 * OrgRail Component
 * Organization rail on the far left side (Slack-style)
 */

import React from "react";
import { UserOrganization } from "../../contexts/AuthContext";
import { Icons } from "../Icons";
import MiniTrackerStatus from "./MiniTrackerStatus";

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
    <div className="w-[68px] bg-gray-100 dark:bg-dark-950 border-r border-gray-200 dark:border-dark-800/50 flex flex-col items-center py-3 gap-2 flex-shrink-0 overflow-hidden">
      {/* Logo at top - decorative only */}
      <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg mb-2 flex-shrink-0">
        <Icons.Clock className="w-5 h-5 text-white" />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-300 dark:bg-dark-700 mb-1 w-8" />

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
                  : "bg-gray-200 dark:bg-dark-800 hover:bg-gray-300 dark:hover:bg-dark-700 hover:rounded-xl"
              }`}
              title={org.name}
            >
              {/* Active Indicator */}
              <div
                className={`absolute left-0 w-1 rounded-r-full bg-primary-600 dark:bg-white transition-all duration-200 ${
                  isActive ? "h-8" : "h-0 group-hover:h-5"
                }`}
                style={{
                  transform: "translateX(-8px)",
                }}
              />

              {/* Org Initial or Logo */}
              <span
                className={`font-bold text-base ${
                  isActive ? "text-white" : "text-gray-600 dark:text-dark-300"
                }`}
              >
                {initial}
              </span>

              {/* Owner Badge */}
              {org.is_owner && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-gray-100 dark:border-dark-950">
                  <Icons.Star className="w-2.5 h-2.5 text-dark-900" />
                </div>
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-2 bg-white dark:bg-dark-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-200 whitespace-nowrap z-[100] border border-gray-200 dark:border-dark-700 shadow-xl">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {org.name}
                </span>
                {org.is_owner && (
                  <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                    Owner
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Add Organization Button */}
        <button
          onClick={onAddOrg}
          className="flex-shrink-0 rounded-2xl w-11 h-11 bg-gray-200/50 dark:bg-dark-800/50 hover:bg-gray-300 dark:hover:bg-dark-700 border-2 border-dashed border-gray-400 dark:border-dark-600 hover:border-gray-500 dark:hover:border-dark-500 flex items-center justify-center transition-all duration-200 group"
          title="Add Organization"
        >
          <Icons.Plus className="w-4 h-4 text-gray-500 dark:text-dark-400 group-hover:text-gray-700 dark:group-hover:text-dark-200" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-300 dark:bg-dark-700 mt-1 w-8" />

      {/* Mini Tracker Status at bottom */}
      <MiniTrackerStatus onClick={onTrackerClick} />

      {/* Collapse Button at the very bottom */}
      <button
        onClick={onToggleCollapse}
        className="w-9 h-9 rounded-lg bg-gray-200/50 dark:bg-dark-800/50 hover:bg-gray-300 dark:hover:bg-dark-700 flex items-center justify-center transition-all duration-200 group mt-1"
        title="Hide organization panel"
      >
        <Icons.ChevronLeft className="w-4 h-4 text-gray-500 dark:text-dark-400 group-hover:text-gray-700 dark:group-hover:text-dark-200" />
      </button>
    </div>
  );
};

export default OrgRail;
