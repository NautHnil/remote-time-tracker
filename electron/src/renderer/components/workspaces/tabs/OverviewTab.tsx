/**
 * Workspace Overview Tab Component
 */

import { format } from "date-fns";
import { type Workspace, type WorkspaceMember } from "../../../services";

interface OverviewTabProps {
  workspace: Workspace;
  members: WorkspaceMember[];
}

export default function OverviewTab({ workspace, members }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {members.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Members
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspace.task_count || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Tasks
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspace.is_billable ? `$${workspace.hourly_rate}/hr` : "N/A"}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">Rate</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <span
              className={`text-2xl ${
                workspace.is_active ? "text-green-400" : "text-red-400"
              }`}
            >
              {workspace.is_active ? "●" : "○"}
            </span>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Status
            </div>
          </div>
        </div>

        {/* Description */}
        {workspace.description && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-2">
              Description
            </h4>
            <p className="text-gray-500 dark:text-dark-400">
              {workspace.description}
            </p>
          </div>
        )}

        {/* Team Members */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-3">
            Team Members
          </h4>
          <div className="space-y-2">
            {members.slice(0, 6).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {member.user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 dark:text-dark-200 truncate">
                    {member.user?.first_name} {member.user?.last_name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-dark-500 truncate">
                    {member.user?.email}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{
                    backgroundColor: `${
                      member.workspace_role?.color || "#6366f1"
                    }20`,
                    color: member.workspace_role?.color || "#6366f1",
                  }}
                >
                  {member.workspace_role?.display_name ||
                    member.workspace_role?.name ||
                    member.role_name ||
                    "Member"}
                </span>
              </div>
            ))}
            {members.length > 6 && (
              <div className="text-center text-sm text-gray-400 dark:text-dark-500 py-2">
                +{members.length - 6} more members
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Info */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-3">
            Details
          </h4>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">Billable</span>
            <span
              className={
                workspace.is_billable
                  ? "text-green-400"
                  : "text-gray-400 dark:text-dark-500"
              }
            >
              {workspace.is_billable ? "Yes" : "No"}
            </span>
          </div>

          {workspace.is_billable && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-dark-400">
                Hourly Rate
              </span>
              <span className="text-gray-700 dark:text-dark-200">
                ${workspace.hourly_rate}/hr
              </span>
            </div>
          )}

          {workspace.start_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-dark-400">
                Start Date
              </span>
              <span className="text-gray-700 dark:text-dark-200">
                {format(new Date(workspace.start_date), "MMM d, yyyy")}
              </span>
            </div>
          )}

          {workspace.end_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-dark-400">End Date</span>
              <span className="text-gray-700 dark:text-dark-200">
                {format(new Date(workspace.end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">Created</span>
            <span className="text-gray-700 dark:text-dark-200">
              {format(new Date(workspace.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>

        {/* Admin */}
        {workspace.admin && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-3">
              Workspace Admin
            </h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-medium">
                {workspace.admin.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-dark-200">
                  {workspace.admin.first_name} {workspace.admin.last_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-dark-400">
                  {workspace.admin.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
