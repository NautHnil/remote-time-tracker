/**
 * WorkspaceSwitcher Component
 * Dropdown component for switching between workspaces
 */

import React, { useEffect, useRef, useState } from "react";
import { UserWorkspace } from "../../contexts/AuthContext";
import { Icons } from "../Icons";

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
      <div className="px-4 py-3 bg-gray-100 dark:bg-dark-800/30 rounded-xl border border-gray-200 dark:border-dark-700/50">
        <div className="text-xs text-gray-500 dark:text-dark-400">
          No workspaces
        </div>
        <div className="text-sm text-gray-600 dark:text-dark-300 mt-0.5">
          Select an organization first
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-2 bg-gray-100 dark:bg-dark-800/30 hover:bg-gray-200 dark:hover:bg-dark-800/50 rounded-lg border border-gray-200 dark:border-dark-700/50 hover:border-gray-300 dark:hover:border-dark-600/50 transition-all duration-200 flex items-center gap-2"
      >
        {/* Workspace Icon */}
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/30 flex-shrink-0">
          <Icons.Workspace className="w-3.5 h-3.5 text-accent-600 dark:text-accent-400" />
        </div>

        {/* Workspace Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] text-gray-500 dark:text-dark-400 font-medium">
            Workspace
          </div>
          <div className="text-xs text-gray-800 dark:text-dark-100 font-semibold truncate">
            {currentWorkspace ? currentWorkspace.name : "Select workspace..."}
          </div>
        </div>

        {/* Chevron */}
        <Icons.ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 dark:text-dark-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1.5 bg-white dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-700/50 shadow-2xl z-50 max-h-[250px] overflow-y-auto">
          {/* Workspace List */}
          {filteredWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onSelectWorkspace(ws.id);
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-dark-800/50 transition-colors ${
                ws.id === currentWorkspaceId
                  ? "bg-primary-50 dark:bg-primary-500/10"
                  : ""
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center border border-accent-500/20 flex-shrink-0">
                <span className="text-[10px] font-bold text-accent-600 dark:text-accent-400">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium text-gray-700 dark:text-dark-200 truncate">
                  {ws.name}
                </div>
                {ws.is_admin && (
                  <div className="text-[10px] text-gray-500 dark:text-dark-400">
                    Admin
                  </div>
                )}
              </div>
              {ws.id === currentWorkspaceId && (
                <Icons.Check className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
