/**
 * UserProfile Component
 * User profile card with avatar and logout button
 */

import React from "react";
import { Icons } from "../Icons";

interface User {
  email: string;
  first_name?: string;
  last_name?: string;
}

interface UserProfileProps {
  user: User | null;
  isCollapsed: boolean;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  user,
  isCollapsed,
  onLogout,
}) => {
  if (!user) return null;

  const displayName = user.first_name || user.email.split("@")[0];
  const initial = user.email.charAt(0).toUpperCase();

  if (isCollapsed) {
    return (
      <div className="relative group">
        <button onClick={onLogout} className="w-full flex justify-center p-1.5">
          <div className="w-8 h-8 aspect-square bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-lg flex-shrink-0">
            {initial}
          </div>
        </button>
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-md invisible group-hover:visible opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[200] border border-gray-200 dark:border-dark-700 shadow-xl">
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            {displayName}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-dark-400">
            {user.email}
          </div>
          <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
            Click to sign out
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-dark-800/30 rounded-lg p-2">
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className="w-8 h-8 aspect-square bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-lg flex-shrink-0">
          {initial}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-dark-100 truncate">
            {displayName}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-dark-400 truncate">
            {user.email}
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-200 dark:bg-dark-700/50 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 text-gray-600 dark:text-dark-300 transition-all duration-200 text-xs font-medium"
      >
        <Icons.Logout className="w-3.5 h-3.5" />
        Sign Out
      </button>
    </div>
  );
};

export default UserProfile;
