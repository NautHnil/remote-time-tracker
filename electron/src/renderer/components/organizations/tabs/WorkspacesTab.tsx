/**
 * Organization Workspaces Tab Component
 */

import { useState } from "react";
import {
  organizationService,
  type CreateWorkspaceRequest,
  type Workspace,
  type WorkspaceRole,
} from "../../../services";
import { Icons } from "../../Icons";
import { CreateWorkspaceModal } from "../modals";

interface WorkspacesTabProps {
  orgId: number;
  workspaces: Workspace[];
  roles: WorkspaceRole[];
  onRefresh: () => void;
  canCreate?: boolean;
}

export default function WorkspacesTab({
  orgId,
  workspaces,
  roles: _roles,
  onRefresh,
  canCreate = false,
}: WorkspacesTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = async (data: CreateWorkspaceRequest) => {
    if (!canCreate) return;
    try {
      await organizationService.createWorkspace(orgId, data);
      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    }
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Create Workspace
          </button>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Folder className="w-16 h-16 text-gray-400 dark:text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-200 mb-2">
            No Workspaces
          </h3>
          <p className="text-gray-500 dark:text-dark-400">
            Create your first workspace to organize projects
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="glass stat-card rounded-xl p-5 hover:bg-gray-50 dark:hover:bg-dark-800/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: ws.color || "#6366f1" }}
                >
                  {ws.icon ? (
                    <span className="text-xl">{ws.icon}</span>
                  ) : (
                    <Icons.Folder className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-dark-100 truncate">
                    {ws.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-dark-400">
                    @{ws.slug}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-dark-500">
                    <span className="flex items-center gap-1">
                      <Icons.Users className="w-3 h-3" />
                      {ws.member_count || 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.Task className="w-3 h-3" />
                      {ws.task_count || 0} tasks
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    ws.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {ws.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
