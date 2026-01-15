/**
 * Workspace Settings Tab Component
 */

import { useState } from "react";
import {
  workspaceService,
  type UpdateWorkspaceRequest,
  type Workspace,
} from "../../../services";

interface SettingsTabProps {
  workspace: Workspace;
  onUpdate: () => void;
}

export default function SettingsTab({ workspace, onUpdate }: SettingsTabProps) {
  const [form, setForm] = useState<UpdateWorkspaceRequest>({
    name: workspace.name,
    description: workspace.description || "",
    color: workspace.color || "#6366f1",
    icon: workspace.icon || "📁",
    is_billable: workspace.is_billable,
    hourly_rate: workspace.hourly_rate,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await workspaceService.update(workspace.id, form);
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
            Workspace Name
          </label>
          <input
            type="text"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-sm resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Color
            </label>
            <input
              type="color"
              value={form.color || "#6366f1"}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-10 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-dark-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Icon
            </label>
            <input
              type="text"
              value={form.icon || ""}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="input-sm text-center text-xl"
              maxLength={2}
            />
          </div>
        </div>

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
          Billing Settings
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-700 dark:text-dark-200">
              Billable Project
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Track billable hours for this workspace
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, is_billable: !form.is_billable })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_billable
                ? "bg-primary-500"
                : "bg-gray-300 dark:bg-dark-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.is_billable ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {form.is_billable && (
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={form.hourly_rate || 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  hourly_rate: parseFloat(e.target.value) || 0,
                })
              }
              className="input-sm"
              min="0"
              step="0.01"
            />
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-6 border border-red-500/30">
        <h3 className="font-medium text-red-400">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-dark-400 mt-1 mb-4">
          Delete this workspace. This action cannot be undone.
        </p>
        <button
          onClick={async () => {
            if (
              !confirm(
                "Are you sure? This will delete all tasks and data in this workspace."
              )
            )
              return;
            try {
              await workspaceService.delete(workspace.id);
              window.location.reload();
            } catch (err: any) {
              alert(err.message || "Failed to delete workspace");
            }
          }}
          className="btn text-red-400 border border-red-500/50 hover:bg-red-500/20"
        >
          Delete Workspace
        </button>
      </div>
    </div>
  );
}
