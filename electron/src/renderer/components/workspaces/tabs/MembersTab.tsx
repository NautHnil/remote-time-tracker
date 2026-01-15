/**
 * Workspace Members Tab Component
 */

import { useState } from "react";
import {
  organizationService,
  workspaceService,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../../../services";
import { Icons } from "../../Icons";
import AddMemberModal from "../modals/AddMemberModal";

interface MembersTabProps {
  workspaceId: number;
  organizationId: number;
  members: WorkspaceMember[];
  roles: WorkspaceRole[];
  canManage?: boolean;
  onRefresh: () => void;
}

export default function MembersTab({
  workspaceId,
  organizationId,
  members,
  roles,
  canManage = false,
  onRefresh,
}: MembersTabProps) {
  const [updating, setUpdating] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  const handleUpdateRole = async (userId: number, newRoleId: number) => {
    if (!canManage) return;
    console.log(
      "[WorkspaceMembersTab] Updating role for user:",
      userId,
      "to roleId:",
      newRoleId
    );
    try {
      setUpdating(userId);
      const result = await workspaceService.updateMember(workspaceId, userId, {
        workspace_role_id: newRoleId,
      });
      console.log("[WorkspaceMembersTab] Update result:", result);
      onRefresh();
    } catch (err: any) {
      console.error("[WorkspaceMembersTab] Update failed:", err);
      alert(err.message || "Failed to update member");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!canManage) return;
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      setUpdating(userId);
      await workspaceService.removeMember(workspaceId, userId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setUpdating(null);
    }
  };

  const handleLoadOrgMembers = async () => {
    try {
      const data = await organizationService.getMembers(organizationId);
      // Filter out members already in workspace
      const existingIds = new Set(members.map((m) => m.user_id));
      setOrgMembers(data.filter((m) => !existingIds.has(m.user_id)));
    } catch (err: any) {
      console.error("Failed to load org members:", err);
    }
  };

  const handleAddMember = async (userId: number, roleId: number) => {
    if (!canManage) return;
    try {
      await workspaceService.addMember(workspaceId, {
        user_id: userId,
        workspace_role_id: roleId,
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add member");
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              handleLoadOrgMembers();
              setShowAddModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Icons.UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-dark-800">
          <h3 className="font-medium text-gray-700 dark:text-dark-200">
            Members ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-800">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-800/30"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-medium">
                {member.user?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-dark-100 truncate">
                  {member.user?.first_name} {member.user?.last_name}
                </div>
                <div className="text-sm text-gray-500 dark:text-dark-400 truncate">
                  {member.user?.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={member.workspace_role_id || ""}
                    onChange={(e) =>
                      handleUpdateRole(member.user_id, parseInt(e.target.value))
                    }
                    disabled={updating === member.user_id}
                    className="input-sm !w-auto !py-1"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="px-2 py-1 text-xs rounded-full"
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
                )}
                {canManage && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={updating === member.user_id}
                    className="btn p-2 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          orgMembers={orgMembers}
          roles={roles}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMember}
        />
      )}
    </div>
  );
}
