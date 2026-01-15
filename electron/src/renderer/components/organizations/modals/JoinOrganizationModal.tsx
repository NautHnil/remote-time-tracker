/**
 * Join Organization Modal Component
 */

import { useState } from "react";

interface JoinOrganizationModalProps {
  onClose: () => void;
  onSubmit: (inviteCode: string) => void;
}

export default function JoinOrganizationModal({
  onClose,
  onSubmit,
}: JoinOrganizationModalProps) {
  const [inviteCode, setInviteCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      alert("Invite code is required");
      return;
    }
    onSubmit(inviteCode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-100 mb-4">
          Join Organization
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="input-sm font-mono"
              placeholder="Enter invite code..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
