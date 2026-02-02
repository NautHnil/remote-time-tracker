/**
 * Organization Overview Tab Component
 */
import { useEffect, useState } from "react";

import { format } from "date-fns";
import {
  type Organization,
  type OrganizationMember,
  type Workspace,
} from "../../../services";
import { Icons } from "../../Icons";

interface OverviewTabProps {
  org: Organization;
  members: OrganizationMember[];
  workspaces: Workspace[];
  onCopyInviteCode: () => void;
}

export default function OverviewTab({
  org,
  members,
  workspaces,
  onCopyInviteCode,
}: OverviewTabProps) {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.config.get();
      console.log("Loaded config:", result);
      setConfig(result);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {members.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Members
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {workspaces.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Workspaces
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-3xl font-bold gradient-text">
              {org.max_members || "∞"}
            </div>
            <div className="text-sm text-gray-500 dark:text-dark-400">
              Max Members
            </div>
          </div>
        </div>

        {/* Description */}
        {org.description && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-2">
              Description
            </h4>
            <p className="text-gray-500 dark:text-dark-400">
              {org.description}
            </p>
          </div>
        )}

        {/* Recent Members */}
        <div className="glass rounded-xl p-5">
          <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-3">
            Recent Members
          </h4>
          <div className="space-y-2">
            {members.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/50"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {member.user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 dark:text-dark-200 truncate">
                    {member.user?.first_name} {member.user?.last_name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-dark-500 truncate">
                    {member.user?.email}
                  </div>
                </div>
                {member.role === "owner" && (
                  <Icons.Crown className="w-4 h-4 text-yellow-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Invite Code & Link - only show if invite_code is available */}
        {org.allow_invite_link && org.invite_code && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-3 flex items-center gap-2">
              <Icons.Link className="w-4 h-4" />
              Invite
            </h4>

            {/* Invite Code */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-dark-400 block mb-1">
                  Invite Code
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-900 px-3 py-2 rounded-lg text-primary-500 dark:text-primary-400 text-sm font-mono truncate">
                    {org.invite_code}
                  </code>
                  <button
                    onClick={onCopyInviteCode}
                    className="btn btn-ghost p-2 flex-shrink-0"
                    title="Copy invite code"
                  >
                    <Icons.Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Invite Link */}
              <div>
                <label className="text-xs text-gray-500 dark:text-dark-400 block mb-1">
                  Invite Link
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-900 px-3 py-2 rounded-lg text-primary-500 dark:text-primary-400 text-xs font-mono truncate">
                    {`${import.meta.env.VITE_INVITE_WEBSITE_DOMAIN}/join/${org.invite_code}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${import.meta.env.VITE_INVITE_WEBSITE_DOMAIN}/join/${org.invite_code}`,
                      );
                      alert("Invite link copied to clipboard!");
                    }}
                    className="btn btn-ghost p-2 flex-shrink-0"
                    title="Copy invite link"
                  >
                    <Icons.Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-dark-500 mt-3">
              Share this code or link with others to invite them to your
              organization.
            </p>
          </div>
        )}

        {/* Invite enabled but not shared with members */}
        {org.allow_invite_link && !org.invite_code && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-2 flex items-center gap-2">
              <Icons.Link className="w-4 h-4 text-gray-400 dark:text-dark-500" />
              Invite
            </h4>
            <p className="text-sm text-gray-500 dark:text-dark-400">
              Invite sharing is restricted to admins only.
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-500 mt-1">
              Contact your organization admin if you need to invite others.
            </p>
          </div>
        )}

        {/* Invite disabled */}
        {!org.allow_invite_link && (
          <div className="glass rounded-xl p-5">
            <h4 className="font-medium text-gray-700 dark:text-dark-200 mb-2 flex items-center gap-2">
              <Icons.Link className="w-4 h-4 text-gray-400 dark:text-dark-500" />
              Invite
            </h4>
            <p className="text-sm text-gray-500 dark:text-dark-400">
              Invite links are disabled for this organization.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">Status</span>
            <span className={org.is_active ? "text-green-400" : "text-red-400"}>
              {org.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">Created</span>
            <span className="text-gray-700 dark:text-dark-200">
              {format(new Date(org.created_at), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">
              Allow Invite Link
            </span>
            <span
              className={
                org.allow_invite_link
                  ? "text-green-400"
                  : "text-gray-400 dark:text-dark-500"
              }
            >
              {org.allow_invite_link ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-dark-400">
              Share Invite Code
            </span>
            <span
              className={
                org.share_invite_code
                  ? "text-green-400"
                  : "text-gray-400 dark:text-dark-500"
              }
            >
              {org.share_invite_code ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
