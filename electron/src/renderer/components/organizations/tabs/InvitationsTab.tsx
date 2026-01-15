/**
 * Organization Invitations Tab Component
 */

import { useState } from "react";
import { organizationService, type Invitation } from "../../../services";
import { Icons } from "../../Icons";

interface InvitationsTabProps {
  orgId: number;
  invitations: Invitation[];
  onRefresh: () => void;
  canManage?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400";
    case "accepted":
      return "bg-green-500/20 text-green-400";
    case "expired":
      return "bg-dark-500/20 text-dark-400";
    case "revoked":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-dark-500/20 text-dark-400";
  }
};

export default function InvitationsTab({
  orgId,
  invitations,
  onRefresh,
  canManage = true,
}: InvitationsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: "", role: "member" });

  const handleCreateInvitation = async () => {
    if (!newInvite.email.trim()) {
      alert("Email is required");
      return;
    }
    try {
      await organizationService.createInvitation(orgId, {
        email: newInvite.email,
        role: newInvite.role,
      });
      setShowCreateModal(false);
      setNewInvite({ email: "", role: "member" });
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to send invitation");
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!canManage) return;
    if (!confirm("Revoke this invitation?")) return;
    try {
      await organizationService.revokeInvitation(orgId, invitationId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to revoke invitation");
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
            <Icons.Mail className="w-4 h-4" />
            Send Invitation
          </button>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Mail className="w-16 h-16 text-gray-400 dark:text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-200 mb-2">
            No Invitations
          </h3>
          <p className="text-gray-500 dark:text-dark-400">
            Send invitations to add new members
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-dark-800">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-dark-800/30"
              >
                <Icons.Mail className="w-8 h-8 text-gray-400 dark:text-dark-500" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-dark-100 truncate">
                    {inv.email}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-dark-400">
                    Role: {inv.role}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                    inv.status
                  )}`}
                >
                  {inv.status}
                </span>
                {canManage && inv.status === "pending" && (
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="btn btn-ghost p-2 text-red-400 hover:bg-red-500/20"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-100 mb-4">
              Send Invitation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newInvite.email}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, email: e.target.value })
                  }
                  className="input-sm"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                  Role
                </label>
                <select
                  value={newInvite.role}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, role: e.target.value })
                  }
                  className="input-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvitation}
                className="btn btn-primary"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
