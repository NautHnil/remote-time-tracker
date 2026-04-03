import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icons } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Button, IconButton, Input, Select } from "../../components/ui";
import {
  AdminOrganization,
  AdminSystemLog,
  AdminUser,
  AdminWorkspace,
  adminService,
} from "../../services/adminService";

interface SystemLogDetailModalProps {
  systemLogId: number;
  onClose: () => void;
}

function SystemLogDetailModal({
  systemLogId,
  onClose,
}: SystemLogDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-system-log", systemLogId],
    queryFn: async () => {
      const response = await adminService.getSystemLog(systemLogId);
      return response.data;
    },
  });

  const systemLog = data;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy HH:mm:ss");
  };

  const copyToClipboard = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">System Log</h3>
              <p className="text-sm text-gray-500">
                {systemLog ? `${systemLog.source} / ${systemLog.level}` : "Loading..."}
              </p>
            </div>
            <IconButton onClick={onClose} variant="ghost">
              <Icons.Close className="h-5 w-5" />
            </IconButton>
          </div>

          {isLoading || !systemLog ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading log details...
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Message
                </label>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-900">
                  {systemLog.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Source" value={systemLog.source} />
                <InfoItem label="Level" value={systemLog.level} />
                <InfoItem label="Component" value={systemLog.component || "-"} />
                <InfoItem
                  label="Occurred At"
                  value={formatDate(systemLog.occurred_at)}
                />
                <InfoItem
                  label="Created At"
                  value={formatDate(systemLog.created_at)}
                />
                <InfoItem
                  label="App Version"
                  value={systemLog.app_version || "-"}
                />
              </div>

              <InfoItem
                label="User"
                value={
                  systemLog.user_email
                    ? `${systemLog.user_name || "Unknown"} (${systemLog.user_email})`
                    : "-"
                }
              />
              <InfoItem label="Organization" value={systemLog.org_name || "-"} />
              <InfoItem
                label="Workspace"
                value={systemLog.workspace_name || "-"}
              />
              <InfoItem
                label="Device UUID"
                value={systemLog.device_uuid || "-"}
              />
              <InfoItem label="Request ID" value={systemLog.request_id || "-"} />
              <InfoItem
                label="Session Local ID"
                value={systemLog.session_local_id || "-"}
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-500">
                    Details
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyToClipboard(prettyJson(systemLog.details))}
                  >
                    Copy
                  </Button>
                </div>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                  {prettyJson(systemLog.details)}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-500">
                    Stack Trace
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyToClipboard(systemLog.stack_trace || "")}
                  >
                    Copy
                  </Button>
                </div>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                  {systemLog.stack_trace || "No stack trace"}
                </pre>
              </div>
            </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500">{label}</label>
      <p className="mt-1 break-all text-sm text-gray-900">{value}</p>
    </div>
  );
}

function prettyJson(input?: string) {
  if (!input) return "No details";
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

function levelBadgeClass(level: string) {
  switch (level) {
    case "error":
      return "bg-red-100 text-red-700";
    case "warn":
      return "bg-amber-100 text-amber-700";
    case "debug":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export default function AdminSystemLogsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [deviceUUID, setDeviceUUID] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("occurred_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [retentionDays, setRetentionDays] = useState("30");
  const [viewingLog, setViewingLog] = useState<AdminSystemLog | null>(null);

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await adminService.cleanupSystemLogs(
        retentionDays ? Number(retentionDays) : undefined,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-logs"] });
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-system-logs",
      page,
      pageSize,
      search,
      sourceFilter,
      levelFilter,
      deviceUUID,
      selectedUserId,
      selectedOrgId,
      selectedWorkspaceId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const response = await adminService.getSystemLogs({
        page,
        page_size: pageSize,
        search: search || undefined,
        source: sourceFilter || undefined,
        level: levelFilter || undefined,
        device_uuid: deviceUUID || undefined,
        user_id: selectedUserId ? Number(selectedUserId) : undefined,
        org_id: selectedOrgId ? Number(selectedOrgId) : undefined,
        workspace_id: selectedWorkspaceId
          ? Number(selectedWorkspaceId)
          : undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate
          ? new Date(`${endDate}T23:59:59`).toISOString()
          : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      return response.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-options"],
    queryFn: async () => {
      const response = await adminService.getUsers({ page: 1, page_size: 200 });
      return response.data.users;
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs-options"],
    queryFn: async () => {
      const response = await adminService.getOrganizations({
        page: 1,
        page_size: 200,
      });
      return response.data.organizations;
    },
  });

  const { data: workspacesData } = useQuery({
    queryKey: ["admin-workspaces-options", selectedOrgId],
    queryFn: async () => {
      const response = await adminService.getWorkspaces({
        page: 1,
        page_size: 200,
        org_id: selectedOrgId ? Number(selectedOrgId) : undefined,
      });
      return response.data.workspaces;
    },
  });

  const { data: policy } = useQuery({
    queryKey: ["admin-system-log-policy"],
    queryFn: async () => {
      const response = await adminService.getSystemLogPolicy();
      return response.data;
    },
  });

  const systemLogs = data?.system_logs || [];
  const pagination = data?.pagination || {
    page,
    page_size: pageSize,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };
  const users = usersData || [];
  const organizations = orgsData || [];
  const workspaces = workspacesData || [];

  useEffect(() => {
    if (!policy) return;
    setRetentionDays(String(policy.retention_days));
  }, [policy]);

  const summary = useMemo(() => {
    const counts = {
      total: systemLogs.length,
      errors: 0,
      warns: 0,
      electron: 0,
      backend: 0,
    };

    for (const log of systemLogs) {
      if (log.level === "error") counts.errors++;
      if (log.level === "warn") counts.warns++;
      if (log.source.startsWith("electron")) counts.electron++;
      if (log.source.startsWith("backend")) counts.backend++;
    }

    return counts;
  }, [systemLogs]);

  const exportJson = async () => {
    const response = await adminService.getSystemLogs({
      page: 1,
      page_size: 1000,
      search: search || undefined,
      source: sourceFilter || undefined,
      level: levelFilter || undefined,
      device_uuid: deviceUUID || undefined,
      user_id: selectedUserId ? Number(selectedUserId) : undefined,
      org_id: selectedOrgId ? Number(selectedOrgId) : undefined,
      workspace_id: selectedWorkspaceId ? Number(selectedWorkspaceId) : undefined,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    });

    const blob = new Blob([JSON.stringify(response.data.system_logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = async () => {
    const response = await adminService.getSystemLogs({
      page: 1,
      page_size: 1000,
      search: search || undefined,
      source: sourceFilter || undefined,
      level: levelFilter || undefined,
      device_uuid: deviceUUID || undefined,
      user_id: selectedUserId ? Number(selectedUserId) : undefined,
      org_id: selectedOrgId ? Number(selectedOrgId) : undefined,
      workspace_id: selectedWorkspaceId ? Number(selectedWorkspaceId) : undefined,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    });

    const rows = response.data.system_logs;
    const headers = [
      "id",
      "occurred_at",
      "level",
      "source",
      "component",
      "message",
      "user_email",
      "org_name",
      "workspace_name",
      "device_uuid",
      "request_id",
      "session_local_id",
      "app_version",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.id,
          row.occurred_at,
          row.level,
          row.source,
          row.component,
          row.message,
          row.user_email,
          row.org_name,
          row.workspace_name,
          row.device_uuid,
          row.request_id,
          row.session_local_id,
          row.app_version,
        ]
          .map(escapeCsvValue)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-logs-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
            <p className="mt-1 text-sm text-gray-500">
              Debug logs from Electron clients and backend services.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setSourceFilter("");
              setLevelFilter("");
              setDeviceUUID("");
              setSelectedUserId("");
              setSelectedOrgId("");
              setSelectedWorkspaceId("");
              setStartDate("");
              setEndDate("");
              setSortBy("occurred_at");
              setSortOrder("desc");
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Search message, component, request ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Icons.Search className="h-4 w-4" />}
          />

          <Select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All sources</option>
            <option value="electron-main">Electron Main</option>
            <option value="electron-renderer">Electron Renderer</option>
            <option value="backend-api">Backend API</option>
            <option value="backend-app">Backend App</option>
          </Select>

          <Select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </Select>

          <Input
            placeholder="Device UUID"
            value={deviceUUID}
            onChange={(e) => {
              setDeviceUUID(e.target.value);
              setPage(1);
            }}
          />

          <Select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All users</option>
            {users.map((user: AdminUser) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.email})
              </option>
            ))}
          </Select>

          <Select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedWorkspaceId("");
              setPage(1);
            }}
          >
            <option value="">All organizations</option>
            {organizations.map((org: AdminOrganization) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>

          <Select
            value={selectedWorkspaceId}
            onChange={(e) => {
              setSelectedWorkspaceId(e.target.value);
              setPage(1);
            }}
            disabled={!selectedOrgId}
          >
            <option value="">All workspaces</option>
            {workspaces.map((workspace: AdminWorkspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="occurred_at">Sort by occurred time</option>
            <option value="created_at">Sort by created time</option>
            <option value="level">Sort by level</option>
            <option value="source">Sort by source</option>
          </Select>

          <Select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "asc" | "desc");
              setPage(1);
            }}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Visible Logs" value={summary.total} tone="slate" />
        <SummaryCard label="Errors" value={summary.errors} tone="red" />
        <SummaryCard label="Warnings" value={summary.warns} tone="amber" />
        <SummaryCard label="Electron" value={summary.electron} tone="blue" />
        <SummaryCard label="Backend" value={summary.backend} tone="emerald" />
      </div>

      {policy && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Retention Policy
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                System logs are retained for {policy.retention_days} days
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Automatic cleanup runs every {policy.cleanup_interval_human}.
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Policy is persisted in database and survives backend restarts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <PolicyBadge
                label="Retention"
                value={`${policy.retention_days} days`}
              />
              <PolicyBadge
                label="Interval"
                value={policy.cleanup_interval_human}
              />
              <PolicyBadge label="Raw" value={policy.cleanup_interval} />
              <Link to="/admin/system-settings">
                <Button variant="secondary">Manage Settings</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            className="w-28"
          />
          <Button
            variant="secondary"
            onClick={() => void cleanupMutation.mutateAsync()}
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? "Cleaning..." : "Run Cleanup"}
          </Button>
        </div>
        <Button variant="outline" onClick={() => void exportCsv()}>
          Export CSV
        </Button>
        <Button variant="outline" onClick={() => void exportJson()}>
          Export JSON
        </Button>
      </div>

      {cleanupMutation.data && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Cleanup completed: removed {cleanupMutation.data.deleted_count} logs
          older than {cleanupMutation.data.retention_days} days.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load system logs.
          </div>
        ) : systemLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No system logs found for the current filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Workspace
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {systemLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {format(new Date(log.occurred_at), "MMM d, HH:mm:ss")}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${levelBadgeClass(
                            log.level,
                          )}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">
                          {log.source}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.component || "-"}
                        </div>
                      </td>
                      <td className="max-w-xl px-4 py-4 text-sm text-gray-700">
                        <div className="line-clamp-2 font-medium text-gray-900">
                          {log.message}
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                          {log.request_id || log.device_uuid || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {log.user_email ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {log.user_name || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user_email}
                            </div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div>{log.workspace_name || "-"}</div>
                        <div className="text-xs text-gray-500">
                          {log.org_name || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingLog(log)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="px-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.total_pages}
                  totalItems={pagination.total_items}
                  pageSize={pagination.page_size}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {viewingLog && (
        <SystemLogDetailModal
          systemLogId={viewingLog.id}
          onClose={() => setViewingLog(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "amber" | "blue" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function PolicyBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 px-4 py-3 ring-1 ring-blue-100">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
