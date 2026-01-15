import { OrganizationListItem, WorkspaceListItem } from "../../services";
import { Icons } from "../Icons";
import WorkspaceCard from "./WorkspaceCard";

interface WorkspaceListViewProps {
  workspaces: WorkspaceListItem[];
  organizations: OrganizationListItem[];
  filterOrgId: number | null;
  loading: boolean;
  error: string | null;
  onSelectWorkspace: (workspaceId: number) => void;
  onSetFilterOrgId: (orgId: number | null) => void;
  onRefresh: () => void;
}

export function WorkspaceListView({
  workspaces,
  organizations,
  filterOrgId,
  loading,
  error,
  onSelectWorkspace,
  onSetFilterOrgId,
  onRefresh,
}: WorkspaceListViewProps) {
  // Filter workspaces by organization
  const filteredWorkspaces = filterOrgId
    ? workspaces.filter((ws) => ws.organization_id === filterOrgId)
    : workspaces;

  // Group workspaces by organization for display
  const groupedWorkspaces = filteredWorkspaces.reduce((acc, ws) => {
    const orgName = ws.organization_name || "Unknown";
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(ws);
    return acc;
  }, {} as Record<string, WorkspaceListItem[]>);

  // Calculate stats
  const totalWorkspaces = filteredWorkspaces.length;
  const activeWorkspaces = filteredWorkspaces.filter(
    (ws) => ws.is_active !== false
  ).length;
  const adminWorkspaces = filteredWorkspaces.filter((ws) => ws.is_admin).length;
  const totalTasks = filteredWorkspaces.reduce(
    (sum, ws) => sum + (ws.task_count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-dark rounded-xl p-4 border border-gray-200 dark:border-dark-800/50">
        <div className="flex flex-wrap gap-3 justify-between">
          <div></div>
          <div className="flex items-center gap-3">
            <select
              value={filterOrgId || ""}
              onChange={(e) =>
                onSetFilterOrgId(
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              className="input-sm !w-auto"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              onClick={onRefresh}
              className="btn btn-ghost p-2"
              title="Refresh"
            >
              <Icons.Refresh className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && workspaces.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass stat-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Icons.Workspace className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                  {totalWorkspaces}
                </div>
                <div className="text-xs text-gray-500 dark:text-dark-400">
                  Total Workspaces
                </div>
              </div>
            </div>
          </div>
          <div className="glass stat-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Icons.Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                  {activeWorkspaces}
                </div>
                <div className="text-xs text-gray-500 dark:text-dark-400">
                  Active
                </div>
              </div>
            </div>
          </div>
          <div className="glass stat-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Icons.Badge className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                  {adminWorkspaces}
                </div>
                <div className="text-xs text-gray-500 dark:text-dark-400">
                  Admin Role
                </div>
              </div>
            </div>
          </div>
          <div className="glass stat-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Icons.Task className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                  {totalTasks}
                </div>
                <div className="text-xs text-gray-500 dark:text-dark-400">
                  Total Tasks
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-error p-4 rounded-xl flex items-center gap-3">
          <Icons.Warning className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && workspaces.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Workspace className="w-16 h-16 text-gray-400 dark:text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-200 mb-2">
            No Workspaces
          </h3>
          <p className="text-gray-500 dark:text-dark-400">
            You are not a member of any workspaces yet.
          </p>
          <p className="text-gray-400 dark:text-dark-500 text-sm mt-2">
            Ask your organization admin to add you to a workspace.
          </p>
        </div>
      )}

      {/* Workspace List - Grouped by Organization */}
      {!loading && Object.keys(groupedWorkspaces).length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedWorkspaces).map(([orgName, orgWorkspaces]) => (
            <div key={orgName}>
              <div className="flex items-center gap-2 mb-4">
                <Icons.Organization className="w-4 h-4 text-gray-400 dark:text-dark-400" />
                <h3 className="text-sm font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wide">
                  {orgName}
                </h3>
                <span className="text-xs text-gray-400 dark:text-dark-500">
                  ({orgWorkspaces.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgWorkspaces.map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onClick={() => onSelectWorkspace(ws.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
