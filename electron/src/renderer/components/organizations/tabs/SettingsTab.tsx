/**
 * Organization Settings Tab Component
 */

import { useState } from "react";
import { organizationService, type Organization } from "../../../services";
import { Icons } from "../../Icons";

interface SettingsTabProps {
  org: Organization;
  onUpdate: () => void;
  onRegenerateInviteCode: () => void;
  canDelete?: boolean;
}

export default function SettingsTab({
  org,
  onUpdate,
  onRegenerateInviteCode,
  canDelete = false,
}: SettingsTabProps) {
  const [form, setForm] = useState({
    name: org.name,
    description: org.description || "",
    allow_invite_link: org.allow_invite_link,
    share_invite_code: org.share_invite_code || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await organizationService.update(org.id, form);
      onUpdate();
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-gray-700 dark:text-dark-200">
          General Settings
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
            Organization Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-sm resize-none"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-700 dark:text-dark-200">
              Allow Invite Link
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Let users join with invite code
            </div>
          </div>
          <button
            onClick={() =>
              setForm({ ...form, allow_invite_link: !form.allow_invite_link })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.allow_invite_link
                ? "bg-primary-500"
                : "bg-gray-300 dark:bg-dark-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.allow_invite_link ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {form.allow_invite_link && (
          <div className="flex items-center justify-between ml-4 pl-4 border-l-2 border-gray-200 dark:border-dark-700">
            <div>
              <div className="font-medium text-gray-700 dark:text-dark-200">
                Share Invite Code with Members
              </div>
              <div className="text-sm text-gray-500 dark:text-dark-400">
                Allow all members to see and share the invite code
              </div>
            </div>
            <button
              onClick={() =>
                setForm({ ...form, share_invite_code: !form.share_invite_code })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.share_invite_code
                  ? "bg-primary-500"
                  : "bg-gray-300 dark:bg-dark-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.share_invite_code ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary w-full"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-medium text-gray-700 dark:text-dark-200">
          Invite Code
        </h3>
        <p className="text-sm text-gray-500 dark:text-dark-400">
          Regenerating will invalidate the current invite code.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-100 dark:bg-dark-900 px-3 py-2 rounded-lg text-primary-500 dark:text-primary-400 font-mono">
            {org.invite_code}
          </code>
          <button
            onClick={onRegenerateInviteCode}
            className="btn btn-ghost flex items-center gap-2"
          >
            <Icons.Refresh className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>

      {canDelete && (
        <div className="glass rounded-xl p-6 border border-red-500/30">
          <h3 className="font-medium text-red-400">Danger Zone</h3>
          <p className="text-sm text-gray-500 dark:text-dark-400 mt-1 mb-4">
            Permanently delete this organization. This action cannot be undone.
          </p>
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Are you absolutely sure? This will delete all workspaces and data."
                )
              )
                return;
              try {
                await organizationService.delete(org.id);
                window.location.reload();
              } catch (err: any) {
                alert(err.message || "Failed to delete organization");
              }
            }}
            className="btn text-red-400 border border-red-500/50 hover:bg-red-500/20"
          >
            Delete Organization
          </button>
        </div>
      )}
    </div>
  );
}
