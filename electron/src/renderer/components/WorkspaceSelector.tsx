/**
 * Workspace Selector Component
 * Allows user to select their active workspace/organization context
 */

import React, { useEffect, useState } from "react";
import {
  organizationService,
  workspaceService,
  type OrganizationListItem,
  type WorkspaceListItem,
} from "../services";

interface WorkspaceSelectorProps {
  onSelect?: (workspaceId: number | null, orgId: number | null) => void;
  className?: string;
  showLabel?: boolean;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  onSelect,
  className = "",
  showLabel = true,
}) => {
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    []
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOrganizations();
    loadWorkspaces();

    // Load saved selection from localStorage
    try {
      const savedOrgId = localStorage.getItem("selected_org_id");
      const savedWorkspaceId = localStorage.getItem("selected_workspace_id");
      if (savedOrgId) setSelectedOrgId(parseInt(savedOrgId));
      if (savedWorkspaceId) setSelectedWorkspaceId(parseInt(savedWorkspaceId));
    } catch (e) {
      console.error("Failed to load saved selection:", e);
    }
  }, []);

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      const orgs = await organizationService.getMyOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const wss = await workspaceService.getMyWorkspaces();
      setWorkspaces(wss);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value ? parseInt(e.target.value) : null;
    setSelectedOrgId(orgId);
    setSelectedWorkspaceId(null);

    // Save to localStorage
    if (orgId) {
      localStorage.setItem("selected_org_id", orgId.toString());
    } else {
      localStorage.removeItem("selected_org_id");
    }
    localStorage.removeItem("selected_workspace_id");

    if (onSelect) {
      onSelect(null, orgId);
    }
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const workspaceId = e.target.value ? parseInt(e.target.value) : null;
    setSelectedWorkspaceId(workspaceId);

    // Save to localStorage
    if (workspaceId) {
      localStorage.setItem("selected_workspace_id", workspaceId.toString());
    } else {
      localStorage.removeItem("selected_workspace_id");
    }

    if (onSelect) {
      onSelect(workspaceId, selectedOrgId);
    }
  };

  const filteredWorkspaces = selectedOrgId
    ? workspaces.filter((ws) => ws.organization_id === selectedOrgId)
    : workspaces;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </span>
      </div>
    );
  }

  // If no organizations, return null (user not part of any org)
  if (organizations.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Organization Selector */}
      <div className="flex flex-col gap-1">
        {showLabel && (
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Organization
          </label>
        )}
        <select
          value={selectedOrgId || ""}
          onChange={handleOrgChange}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Workspace Selector */}
      {filteredWorkspaces.length > 0 && (
        <div className="flex flex-col gap-1">
          {showLabel && (
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Workspace
            </label>
          )}
          <select
            value={selectedWorkspaceId || ""}
            onChange={handleWorkspaceChange}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              Select a workspace...
            </option>
            {filteredWorkspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.organization_name})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector;
