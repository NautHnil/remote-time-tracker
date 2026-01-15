/**
 * MainLayout Component
 * Main application layout with sidebar, header, and content area
 */

import React from "react";
import { UserOrganization, UserWorkspace } from "../contexts/AuthContext";
import { getRouteConfig } from "../routes";
import Header from "./Header";
import Sidebar, { View } from "./Sidebar";

interface MainLayoutProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  currentOrg: UserOrganization | null;
  currentWorkspace: UserWorkspace | null;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  currentView,
  onViewChange,
  onLogout,
  currentOrg,
  currentWorkspace,
  children,
}) => {
  const pageInfo = getRouteConfig(currentView);

  // Build breadcrumbs
  const breadcrumbs: Array<{ label: string; onClick?: () => void }> = [];
  if (currentOrg) {
    breadcrumbs.push({ label: currentOrg.name });
  }
  if (currentWorkspace) {
    breadcrumbs.push({ label: currentWorkspace.name });
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-950 overflow-hidden">
      {/* Sidebar with Org Rail */}
      <Sidebar
        currentView={currentView}
        onViewChange={onViewChange}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <Header breadcrumbs={breadcrumbs} pageTitle={pageInfo.title} />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-dark-50 mb-1">
                {pageInfo.title}
              </h1>
              <p className="text-gray-500 dark:text-dark-400 text-sm lg:text-base">
                {pageInfo.description}
              </p>
            </div>

            {/* Content */}
            <div className="animate-fade-in">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
