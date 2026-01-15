/**
 * SettingsButton Component
 * Settings navigation button for the sidebar
 */

import React from "react";
import { Icons } from "../Icons";
import { View } from "./types";

interface SettingsButtonProps {
  currentView: View;
  isCollapsed: boolean;
  onViewChange: (view: View) => void;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({
  currentView,
  isCollapsed,
  onViewChange,
}) => {
  return (
    <button
      onClick={() => onViewChange("settings")}
      className={`w-full flex items-center rounded-md transition-all duration-200 group relative ${
        isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-2"
      } ${
        currentView === "settings"
          ? "bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400"
          : "text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800/50 hover:text-gray-800 dark:hover:text-dark-100"
      }`}
    >
      <Icons.Settings className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && <span className="font-medium text-xs">Settings</span>}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
          <span className="text-xs font-medium text-gray-900 dark:text-white">
            Settings
          </span>
        </div>
      )}
    </button>
  );
};

export default SettingsButton;
