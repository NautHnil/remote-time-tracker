import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "../../components/ui";
import { adminService, AdminSystemConfig } from "../../services/adminService";

function categoryLabel(category: string) {
  switch (category) {
    case "logging":
      return "Logging";
    default:
      return category;
  }
}

function categoryTone(category: string) {
  switch (category) {
    case "logging":
      return "border-blue-100 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function fieldHelp(config: AdminSystemConfig) {
  switch (config.value_type) {
    case "duration":
      return "Use Go duration format like 30m, 6h, 24h.";
    case "int":
      return "Use a positive integer value.";
    default:
      return "Enter the configuration value.";
  }
}

export default function AdminSystemSettingsPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-system-configs"],
    queryFn: async () => {
      const response = await adminService.getSystemConfigs();
      return response.data.configs;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string;
    }) => {
      const response = await adminService.updateSystemConfig(key, { value });
      return response.data;
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(
        ["admin-system-configs"],
        (existing: AdminSystemConfig[] | undefined) =>
          (existing || []).map((config) =>
            config.key === updatedConfig.key ? updatedConfig : config,
          ),
      );
      setDrafts((current) => ({
        ...current,
        [updatedConfig.key]: updatedConfig.value,
      }));
      void queryClient.invalidateQueries({ queryKey: ["admin-system-log-policy"] });
    },
  });

  useEffect(() => {
    if (!data) return;
    const nextDrafts: Record<string, string> = {};
    for (const config of data) {
      nextDrafts[config.key] = config.value;
    }
    setDrafts(nextDrafts);
  }, [data]);

  const groupedConfigs = useMemo(() => {
    const groups = new Map<string, AdminSystemConfig[]>();
    for (const config of data || []) {
      const existing = groups.get(config.category) || [];
      existing.push(config);
      groups.set(config.category, existing);
    }
    return Array.from(groups.entries());
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Persisted backend settings stored in <code>system_configs</code>.
            </p>
          </div>
          <Link to="/admin/system-logs">
            <Button variant="secondary">Open System Logs</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
          Loading system settings...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-8 text-center text-red-600 shadow-sm ring-1 ring-gray-100">
          Failed to load system settings.
        </div>
      ) : groupedConfigs.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
          No configurable system settings are available.
        </div>
      ) : (
        groupedConfigs.map(([category, configs]) => (
          <section
            key={category}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${categoryTone(
                    category,
                  )}`}
                >
                  {categoryLabel(category)}
                </span>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  {categoryLabel(category)} Settings
                </h2>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {configs.map((config) => {
                const draftValue = drafts[config.key] ?? config.value;
                const isDirty = draftValue !== config.value;
                const isSaving =
                  updateConfigMutation.isPending &&
                  updateConfigMutation.variables?.key === config.key;

                return (
                  <div
                    key={config.key}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {config.label}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {config.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase text-slate-600">
                        {config.value_type}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Input
                        type={config.value_type === "int" ? "number" : "text"}
                        min={config.value_type === "int" ? "1" : undefined}
                        value={draftValue}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [config.key]: event.target.value,
                          }))
                        }
                        placeholder={config.default}
                      />

                      <p className="text-xs text-slate-500">{fieldHelp(config)}</p>

                      <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                        <div>
                          <span className="font-medium text-slate-700">Key:</span>{" "}
                          {config.key}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Default:</span>{" "}
                          {config.default}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">Current:</span>{" "}
                          {config.value}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Updated:
                          </span>{" "}
                          {config.updated_at
                            ? format(new Date(config.updated_at), "MMM d, yyyy HH:mm")
                            : "Using default"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() =>
                            void updateConfigMutation.mutateAsync({
                              key: config.key,
                              value: draftValue,
                            })
                          }
                          disabled={!isDirty || isSaving}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [config.key]: config.value,
                            }))
                          }
                          disabled={!isDirty}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
