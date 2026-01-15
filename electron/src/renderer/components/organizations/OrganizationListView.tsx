import { OrganizationListItem } from "../../services/organizationService";
import { Icons } from "../Icons";
import OrganizationCard from "./OrganizationCard";

interface OrganizationListViewProps {
  organizations: OrganizationListItem[];
  loading: boolean;
  error: string | null;
  onSelectOrg: (orgId: number) => void;
  onShowCreateModal: () => void;
  onShowJoinModal: () => void;
}

export function OrganizationListView({
  organizations,
  loading,
  error,
  onSelectOrg,
  onShowCreateModal,
  onShowJoinModal,
}: OrganizationListViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-dark rounded-xl p-4 border border-gray-200 dark:border-dark-800/50">
        <div className="flex flex-wrap gap-3 justify-between">
          <div></div>
          <div className="flex gap-3">
            <button
              onClick={onShowJoinModal}
              className="btn btn-ghost flex items-center gap-2"
            >
              <Icons.Link className="w-4 h-4" />
              Join
            </button>
            <button
              onClick={onShowCreateModal}
              className="btn btn-primary flex items-center gap-2"
            >
              <Icons.Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      </div>

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
      {!loading && organizations.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Icons.Organization className="w-16 h-16 text-gray-400 dark:text-dark-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-dark-200 mb-2">
            No Organizations
          </h3>
          <p className="text-gray-500 dark:text-dark-400 mb-6">
            Create your first organization or join an existing one
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={onShowJoinModal} className="btn btn-ghost">
              Join Organization
            </button>
            <button onClick={onShowCreateModal} className="btn btn-primary">
              Create Organization
            </button>
          </div>
        </div>
      )}

      {/* Organization List */}
      {!loading && organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              org={org}
              onClick={() => onSelectOrg(org.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
