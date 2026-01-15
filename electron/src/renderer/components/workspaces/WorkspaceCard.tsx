/**
 * Workspace Card Component
 * Display card for workspace list view
 */

import { type WorkspaceListItem } from "../../services";
import { Icons } from "../Icons";

interface WorkspaceCardProps {
  workspace: WorkspaceListItem;
  onClick: () => void;
}

export default function WorkspaceCard({
  workspace,
  onClick,
}: WorkspaceCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass stat-card rounded-xl p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl"
          style={{ backgroundColor: workspace.color || "#6366f1" }}
        >
          {workspace.icon || <Icons.Folder className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-dark-100 truncate group-hover:text-primary-400 transition-colors">
            {workspace.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-dark-400">
            @{workspace.slug}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-dark-500">
            <span className="flex items-center gap-1">
              <Icons.Users className="w-3 h-3" />
              {workspace.member_count} members
            </span>
            <span className="flex items-center gap-1">
              <Icons.Task className="w-3 h-3" />
              {workspace.task_count} tasks
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {workspace.is_admin && (
            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              Admin
            </span>
          )}
          {(workspace.role_name || !workspace.is_admin) && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {workspace.role_name || "Member"}
            </span>
          )}
        </div>
      </div>
      {workspace.description && (
        <p className="mt-3 text-sm text-gray-500 dark:text-dark-400 line-clamp-2">
          {workspace.description}
        </p>
      )}
    </div>
  );
}
