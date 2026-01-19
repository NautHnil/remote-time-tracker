import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout, AdminProtectedRoute } from "./components/admin";
import JoinOrganizationPage from "./pages/JoinOrganizationPage";
import {
  AdminDashboardPage,
  AdminLoginPage,
  AdminOrganizationsPage,
  AdminScreenshotsPage,
  AdminStatisticsPage,
  AdminTasksPage,
  AdminTimeLogsPage,
  AdminUsersPage,
  AdminWorkspacesPage,
} from "./pages/admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - Join organization via invite link */}
        <Route path="/join/:inviteCode" element={<JoinOrganizationPage />} />

        {/* Legacy login redirect to admin login */}
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />

        {/* Admin Login - Always accessible */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin Panel Routes - Protected */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="organizations" element={<AdminOrganizationsPage />} />
          <Route path="workspaces" element={<AdminWorkspacesPage />} />
          <Route path="tasks" element={<AdminTasksPage />} />
          <Route path="timelogs" element={<AdminTimeLogsPage />} />
          <Route path="screenshots" element={<AdminScreenshotsPage />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
        </Route>

        {/* Default redirect to admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
