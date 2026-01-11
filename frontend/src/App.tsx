import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import OrganizationDetailPage from "./pages/OrganizationDetailPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import ScreenshotsPage from "./pages/ScreenshotsPage";
import StatisticsPage from "./pages/StatisticsPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import TasksPage from "./pages/TasksPage";
import TimeLogsPage from "./pages/TimeLogsPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const { isAuthenticated, isAdmin } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated || !isAdmin() ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="timelogs" element={<TimeLogsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="screenshots" element={<ScreenshotsPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route
              path="organizations/:orgId"
              element={<OrganizationDetailPage />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
