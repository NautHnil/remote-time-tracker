/**
 * Admin Protected Route Component
 * HOC for protecting admin routes
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { organizationService } from "../../services";
import { useAuthStore } from "../../store/authStore";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();
  const isSystemAdmin = user?.system_role === "admin" || user?.role === "admin";

  const { data: hasOwnedOrg, isLoading: isCheckingCmsAccess } = useQuery({
    queryKey: ["cms-access", user?.id],
    enabled: isAuthenticated && !!user && !isSystemAdmin,
    retry: false,
    queryFn: async () => {
      const organizations = await organizationService.getMyOrganizations();
      return organizations.some(
        (org) => org.is_owner || org.role === "owner",
      );
    },
  });

  React.useEffect(() => {
    if (!isSystemAdmin && hasOwnedOrg === false) {
      logout();
    }
  }, [hasOwnedOrg, isSystemAdmin, logout]);

  // Show loading state
  if (isLoading || isCheckingCmsAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isSystemAdmin && hasOwnedOrg === false) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
