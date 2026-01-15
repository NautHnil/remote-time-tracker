/**
 * Create Workspace Modal Component
 */

import { useState } from "react";
import { type CreateWorkspaceRequest } from "../../../services";

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSubmit: (data: CreateWorkspaceRequest) => void;
}

export default function CreateWorkspaceModal({
  onClose,
  onSubmit,
}: CreateWorkspaceModalProps) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    color: "#6366f1",
    icon: "📁",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      alert("Name and slug are required");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-100 mb-4">
          Create Workspace
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="input-sm"
              placeholder="My Workspace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                })
              }
              className="input-sm"
              placeholder="my-workspace"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="input-sm resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
                Color
              </label>
              <input
                type="color"
                value={form.color}
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
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input-sm text-center text-xl"
                maxLength={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
