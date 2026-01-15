/**
 * Add Workspace Member Modal Component
 */

import { useState } from "react";
import { type WorkspaceRole } from "../../../services";
import { Icons } from "../../Icons";

interface AddMemberModalProps {
  orgMembers: any[];
  roles: WorkspaceRole[];
  onClose: () => void;
  onAdd: (userId: number, roleId: number) => void;
}

export default function AddMemberModal({
  orgMembers,
  roles,
  onClose,
  onAdd,
}: AddMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(
    roles[0]?.id || 0
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-100 mb-4">
          Add Member to Workspace
        </h3>

        {orgMembers.length === 0 ? (
          <div className="text-center py-8">
            <Icons.Users className="w-12 h-12 text-gray-400 dark:text-dark-500 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-dark-400">
              No available organization members to add
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                Select Member
              </label>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                className="input-sm"
              >
                <option value="">Choose a member...</option>
                {orgMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.first_name} {m.user?.last_name} ({m.user?.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                className="input-sm"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name || role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          {orgMembers.length > 0 && (
            <button
              onClick={() =>
                selectedUserId && onAdd(selectedUserId, selectedRoleId)
              }
              disabled={!selectedUserId}
              className="btn btn-primary"
            >
              Add Member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
