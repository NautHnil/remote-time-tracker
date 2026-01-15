/**
 * Header Component
 * Top header bar with theme toggle, notifications, and search
 */

import React from "react";
import { Icons } from "../components/Icons";
import { useTheme } from "../contexts/ThemeContext";

interface HeaderProps {
  /** Breadcrumb items to display */
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  /** Current page title */
  pageTitle: string;
}

/**
 * ThemeToggleIconButton
 * Compact theme toggle button for header
 */
const ThemeToggleIconButton: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Icons.Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Icons.Moon className="w-5 h-5 text-indigo-500" />
      )}
    </button>
  );
};

/**
 * NotificationButton
 * Notification bell button with badge
 */
const NotificationButton: React.FC = () => {
  return (
    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors relative">
      <Icons.Bell className="w-5 h-5 text-gray-500 dark:text-dark-400" />
      {/* Notification badge */}
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
    </button>
  );
};

/**
 * QuickSearchButton
 * Quick search button with keyboard shortcut hint
 */
const QuickSearchButton: React.FC = () => {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700/50 hover:border-gray-300 dark:hover:border-dark-600/50 transition-colors">
      <Icons.Search className="w-4 h-4 text-gray-500 dark:text-dark-400" />
      <span className="text-sm text-gray-500 dark:text-dark-400">
        Search...
      </span>
      <kbd className="text-xs text-gray-400 dark:text-dark-500 bg-gray-200 dark:bg-dark-700/50 px-1.5 py-0.5 rounded">
        ⌘K
      </kbd>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ breadcrumbs = [], pageTitle }) => {
  return (
    <header className="flex-shrink-0 h-14 bg-white/50 dark:bg-dark-900/50 backdrop-blur-xl border-b border-gray-200 dark:border-dark-800/30 flex items-center px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200 transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-gray-500 dark:text-dark-400">
                {crumb.label}
              </span>
            )}
            <Icons.ChevronRight className="w-4 h-4 text-gray-400 dark:text-dark-600" />
          </React.Fragment>
        ))}
        <span className="text-gray-800 dark:text-dark-100 font-medium">
          {pageTitle}
        </span>
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggleIconButton />

        {/* Notifications */}
        <NotificationButton />

        {/* Quick search */}
        <QuickSearchButton />
      </div>
    </header>
  );
};

export default Header;
export { NotificationButton, QuickSearchButton, ThemeToggleIconButton };
