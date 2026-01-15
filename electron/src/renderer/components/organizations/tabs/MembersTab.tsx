/**
 * Organization Members Tab Component
 */

import { useState } from "react";
import {
  organizationService,
  type OrganizationMember,
} from "../../../services";
import { Icons } from "../../Icons";

interface MembersTabProps {
  orgId: number;
  members: OrganizationMember[];
  onRefresh: () => void;
  canManage?: boolean;
}

export default function MembersTab({
  orgId,
  members,
  onRefresh,
  canManage = false,
}: MembersTabProps) {
  const [updating, setUpdating] = useState<number | null>(null);

  const handleUpdateRole = async (userId: number, newRole: string) => {
    if (!canManage) return;
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      setUpdating(userId);
      await organizationService.updateMember(orgId, userId, { role: newRole });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update member");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!canManage) return;
    if (!confirm("Remove this member from the organization?")) return;
    try {
      setUpdating(userId);
      await organizationService.removeMember(orgId, userId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between">
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
                  value={member.role}
                  onChange={(e) =>
                    handleUpdateRole(member.user_id, e.target.value)
                  }
                  disabled={
                    updating === member.user_id || member.role === "owner"
                  }
                  className="input-sm !w-auto !py-1 disabled:opacity-50"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    member.role === "owner"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : member.role === "admin"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {member.role}
                </span>
              )}
              {canManage && member.role !== "owner" && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  disabled={updating === member.user_id}
                  className="btn p-2 text-red-400 hover:bg-red-500/20"
                  title="Remove member"
                >
                  <Icons.UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
