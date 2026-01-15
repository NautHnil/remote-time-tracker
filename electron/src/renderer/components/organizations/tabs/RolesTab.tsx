/**
 * Organization Roles Tab Component
 */

import { useState } from "react";
import { organizationService, type WorkspaceRole } from "../../../services";
import { Icons } from "../../Icons";

interface RolesTabProps {
  orgId: number;
  roles: WorkspaceRole[];
  onRefresh: () => void;
  canManage?: boolean;
}

export default function RolesTab({
  orgId,
  roles,
  onRefresh,
  canManage = true,
}: RolesTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    color: "#6366f1",
  });

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.display_name.trim()) {
      alert("Name and display name are required");
      return;
    }
    try {
      await organizationService.createRole(orgId, {
        name: newRole.name.toLowerCase().replace(/\s+/g, "_"),
        display_name: newRole.display_name,
        description: newRole.description,
        color: newRole.color,
      });
      setShowCreateModal(false);
      setNewRole({
        name: "",
        display_name: "",
        description: "",
        color: "#6366f1",
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to create role");
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!canManage) return;
    if (!confirm("Delete this role? This cannot be undone.")) return;
    try {
      await organizationService.deleteRole(orgId, roleId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete role");
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Badge className="w-16 h-16 text-gray-400 dark:text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-200 mb-2">
            No Roles
          </h3>
          <p className="text-gray-500 dark:text-dark-400">
            Create roles to assign to workspace members
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="glass stat-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color || "#6366f1" }}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-dark-100">
                      {role.display_name}
                    </h4>
                    <p className="text-xs text-gray-400 dark:text-dark-500">
                      @{role.name}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="btn p-1 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
              {role.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
                  {role.description}
                </p>
              )}
              {role.is_default && (
                <span className="mt-2 inline-block px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-100 mb-4">
              Create Role
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRole.display_name}
                  onChange={(e) =>
                    setNewRole({
                      ...newRole,
                      display_name: e.target.value,
                      name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  className="input-sm"
                  placeholder="Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  className="input-sm resize-none"
                  placeholder="Role description..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newRole.color}
                  onChange={(e) =>
                    setNewRole({ ...newRole, color: e.target.value })
                  }
                  className="w-full h-10 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-dark-500 transition-all"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleCreateRole} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
