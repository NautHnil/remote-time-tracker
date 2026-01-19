/**
 * JoinOrganizationDialog.tsx
 * Dialog for joining an organization via invite code (deeplink)
 */

import { useCallback, useEffect, useState } from "react";
import { Icons } from "../Icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";

interface JoinOrganizationDialogProps {
  open: boolean;
  inviteCode: string;
  onClose: () => void;
  onJoinSuccess?: (organization: any) => void;
}

export function JoinOrganizationDialog({
  open,
  inviteCode,
  onClose,
  onJoinSuccess,
}: JoinOrganizationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // Fetch organization info when dialog opens
  useEffect(() => {
    if (open && inviteCode) {
      fetchOrganizationInfo();
    }
  }, [open, inviteCode]);

  const fetchOrganizationInfo = async () => {
    setFetchingInfo(true);
    setError(null);

    try {
      const config = await window.electronAPI.config.get();
      const credentials = await window.electronAPI.auth.getCredentials();

      const response = await fetch(
        `${config.apiUrl}/api/v1/organizations/invite/${inviteCode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(credentials?.accessToken && {
              Authorization: `Bearer ${credentials.accessToken}`,
            }),
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid invite code");
      }

      setOrganizationInfo(data);
    } catch (err: any) {
      console.error("Failed to fetch organization info:", err);
      setError(err.message || "Failed to fetch organization info");
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleJoin = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const config = await window.electronAPI.config.get();
      const credentials = await window.electronAPI.auth.getCredentials();

      if (!credentials?.accessToken) {
        setError("Please login first to join an organization");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${config.apiUrl}/api/v1/organizations/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${credentials.accessToken}`,
          },
          body: JSON.stringify({ invite_code: inviteCode }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join organization");
      }

      console.log("✅ Successfully joined organization:", data);
      onJoinSuccess?.(data);
      onClose();
    } catch (err: any) {
      console.error("Failed to join organization:", err);
      setError(err.message || "Failed to join organization");
    } finally {
      setLoading(false);
    }
  }, [inviteCode, onClose, onJoinSuccess]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full">
              <Icons.Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <DialogTitle>Join Organization</DialogTitle>
              <DialogDescription>
                You've been invited to join an organization
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {fetchingInfo ? (
            <div className="flex items-center justify-center py-8">
              <Icons.Spinner className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Icons.AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : organizationInfo ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Icons.Building className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-dark-50">
                      {organizationInfo.name}
                    </h3>
                    {organizationInfo.description && (
                      <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                        {organizationInfo.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-400">
                <Icons.Users className="w-4 h-4" />
                <span>
                  {organizationInfo.member_count || 0} member
                  {(organizationInfo.member_count || 0) !== 1 ? "s" : ""}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-dark-300">
                By joining this organization, you'll be able to collaborate with
                team members and access shared workspaces.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-dark-400">
              <p>Invite code: {inviteCode}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-200 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleJoin}
            disabled={loading || fetchingInfo || !!error}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Icons.Spinner className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Icons.UserPlus className="w-4 h-4" />
                Join Organization
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default JoinOrganizationDialog;
