/**
 * Organization Card Component
 * Display card for organization list view
 */

import { type OrganizationListItem } from "../../services";
import { Icons } from "../Icons";
import RoleBadge from "./RoleBadge";

interface OrganizationCardProps {
  org: OrganizationListItem;
  onClick: () => void;
}

export default function OrganizationCard({
  org,
  onClick,
}: OrganizationCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass stat-card rounded-xl p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-dark-100 truncate group-hover:text-primary-400 transition-colors">
            {org.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-dark-400">
            @{org.slug}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-dark-500">
            <span className="flex items-center gap-1">
              <Icons.Users className="w-3 h-3" />
              {org.member_count} members
            </span>
            <span className="flex items-center gap-1">
              <Icons.Folder className="w-3 h-3" />
              {org.workspace_count} workspaces
            </span>
          </div>
        </div>
        <RoleBadge role={org.role} />
      </div>
    </div>
  );
}
