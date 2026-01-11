/**
 * Organization Detail Page
 * Shows organization details, members, workspaces, invitations
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useOrganizationStore } from "../store/organizationStore";

// ============================================================================
// TYPES
// ============================================================================

type TabType =
  | "overview"
  | "members"
  | "workspaces"
  | "roles"
  | "invitations"
  | "settings";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, workspaceId?: number, roleId?: number) => void;
  isLoading: boolean;
  workspaces: { id: number; name: string }[];
  roles: { id: number; name: string }[];
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  isLoading: boolean;
}

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  isLoading: boolean;
}

// ============================================================================
// MODALS
// ============================================================================

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  workspaces,
  roles,
}) => {
  const [email, setEmail] = useState("");
  const [workspaceId, setWorkspaceId] = useState<number | undefined>();
  const [roleId, setRoleId] = useState<number | undefined>();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, workspaceId, roleId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite Member</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="user@example.com"
              required
            />
          </div>
          {workspaces.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace (Optional)
              </label>
              <select
                value={workspaceId || ""}
                onChange={(e) =>
                  setWorkspaceId(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Organization only</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {workspaceId && roles.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={roleId || ""}
                onChange={(e) =>
                  setRoleId(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Workspace</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(name, description);
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Role</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(name, description);
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Developer, Designer"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

const OrganizationDetailPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    currentOrganization,
    currentOrgMembers,
    currentOrgRoles,
    currentOrgWorkspaces,
    currentOrgInvitations,
    isLoadingOrg,
    isLoadingMembers,
    isLoadingRoles,
    isLoadingWorkspace,
    isLoadingInvitations,
    error,
    fetchOrganization,
    fetchOrgMembers,
    fetchOrgRoles,
    fetchOrgWorkspaces,
    fetchOrgInvitations,
    createInvitation,
    revokeInvitation,
    createWorkspace,
    createOrgRole,
    regenerateInviteCode,
    removeOrgMember,
    clearError,
  } = useOrganizationStore();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const id = parseInt(orgId || "0");
  const isOwner = currentOrganization?.owner_id === user?.id;
  const currentUserMember = currentOrgMembers.find(
    (m) => m.user_id === user?.id
  );
  const isAdmin = isOwner || currentUserMember?.role === "admin";

  useEffect(() => {
    if (id) {
      fetchOrganization(id);
      fetchOrgMembers(id);
      fetchOrgRoles(id);
      fetchOrgWorkspaces(id);
      fetchOrgInvitations(id);
    }
  }, [id]);

  const handleInviteMember = async (
    email: string,
    workspaceId?: number,
    roleId?: number
  ) => {
    setIsSubmitting(true);
    try {
      await createInvitation(id, {
        email,
        workspace_id: workspaceId,
        role_id: roleId,
      });
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWorkspace = async (name: string, description: string) => {
    setIsSubmitting(true);
    try {
      await createWorkspace(id, { name, description });
      setShowWorkspaceModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRole = async (name: string, description: string) => {
    setIsSubmitting(true);
    try {
      await createOrgRole(id, { name, description });
      setShowRoleModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (currentOrganization?.invite_code) {
      navigator.clipboard.writeText(currentOrganization.invite_code);
    }
  };

  const handleRegenerateCode = async () => {
    if (
      confirm(
        "Are you sure you want to regenerate the invite code? The old code will stop working."
      )
    ) {
      await regenerateInviteCode(id);
    }
  };

  if (isLoadingOrg && !currentOrganization) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Organization not found</p>
        <Link to="/organizations" className="text-blue-600 hover:underline">
          Back to organizations
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "members", label: `Members (${currentOrgMembers.length})` },
    { id: "workspaces", label: `Workspaces (${currentOrgWorkspaces.length})` },
    { id: "roles", label: `Roles (${currentOrgRoles.length})` },
    ...(isAdmin
      ? [
          {
            id: "invitations",
            label: `Invitations (${currentOrgInvitations.length})`,
          },
        ]
      : []),
    ...(isOwner ? [{ id: "settings", label: "Settings" }] : []),
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/organizations" className="text-gray-500 hover:text-gray-700">
          ← Back
        </Link>
        <div className="flex items-center gap-3">
          {currentOrganization.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {currentOrganization.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {currentOrganization.name}
            </h1>
            <p className="text-sm text-gray-500">@{currentOrganization.slug}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex justify-between">
          <span className="text-red-600">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-2 border-b-2 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-800 mb-4">About</h3>
            <p className="text-gray-600">
              {currentOrganization.description || "No description"}
            </p>
          </div>
          {isAdmin && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold text-gray-800 mb-4">Invite Code</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-md font-mono text-sm">
                  {currentOrganization.invite_code}
                </code>
                <button
                  onClick={handleCopyInviteCode}
                  className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
                >
                  Copy
                </button>
                {isOwner && (
                  <button
                    onClick={handleRegenerateCode}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div>
          {isAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Invite Member
              </button>
            </div>
          )}
          {isLoadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentOrgMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                            {member.user?.first_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.user?.first_name} {member.user?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                            member.role === "owner"
                              ? "bg-purple-100 text-purple-800"
                              : member.role === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {member.role !== "owner" &&
                            member.user_id !== user?.id && (
                              <button
                                onClick={() =>
                                  removeOrgMember(id, member.user_id)
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "workspaces" && (
        <div>
          {isAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Workspace
              </button>
            </div>
          )}
          {isLoadingWorkspace ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : currentOrgWorkspaces.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No workspaces yet</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentOrgWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspaces/${ws.id}`}
                  className="block p-6 bg-white rounded-lg border hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-800">{ws.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {ws.description || "No description"}
                  </p>
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span>{ws.member_count || 0} members</span>
                    <span>{ws.task_count || 0} tasks</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "roles" && (
        <div>
          {isAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowRoleModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Role
              </button>
            </div>
          )}
          {isLoadingRoles ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentOrgRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {role.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {role.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "invitations" && isAdmin && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send Invitation
            </button>
          </div>
          {isLoadingInvitations ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : currentOrgInvitations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentOrgInvitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {inv.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            inv.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : inv.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {inv.status === "pending" && (
                          <button
                            onClick={() => revokeInvitation(id, inv.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && isOwner && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold text-gray-800 mb-4">Danger Zone</h3>
          <div className="p-4 border border-red-200 rounded-md bg-red-50">
            <p className="text-sm text-gray-600 mb-4">
              Deleting this organization will permanently remove all workspaces,
              members, and data.
            </p>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete this organization? This action cannot be undone."
                  )
                ) {
                  // deleteOrganization(id);
                  navigate("/organizations");
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete Organization
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteMember}
        isLoading={isSubmitting}
        workspaces={currentOrgWorkspaces.map((ws) => ({
          id: ws.id,
          name: ws.name,
        }))}
        roles={currentOrgRoles.map((r) => ({ id: r.id, name: r.name }))}
      />
      <CreateWorkspaceModal
        isOpen={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
        onSubmit={handleCreateWorkspace}
        isLoading={isSubmitting}
      />
      <CreateRoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSubmit={handleCreateRole}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default OrganizationDetailPage;
