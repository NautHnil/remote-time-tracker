# TODO 11: Frontend Admin Layout

## Mục tiêu

Tạo layout và navigation cho admin panel trong frontend web.

## Yêu cầu

### 1. Layout Components

- Admin sidebar với navigation
- Admin header với user info và actions
- Breadcrumb navigation
- Responsive design (mobile/tablet/desktop)

### 2. Navigation Items

- Dashboard (tổng quan)
- Users (quản lý users)
- Organizations (quản lý organizations)
- Workspaces (quản lý workspaces)
- Tasks (quản lý tasks)
- Time Logs (quản lý time logs)
- Screenshots (quản lý screenshots)
- Statistics (báo cáo thống kê)
- Settings (cài đặt hệ thống)

### 3. Access Control

- Check system_role = "admin" trước khi render
- Redirect về login nếu không có quyền
- Show loading state khi checking auth

## Files cần tạo

```
frontend/src/layouts/AdminLayout.tsx
frontend/src/components/admin/AdminSidebar.tsx
frontend/src/components/admin/AdminHeader.tsx
frontend/src/components/admin/AdminBreadcrumb.tsx
frontend/src/hooks/useAdminAuth.ts
frontend/src/routes/adminRoutes.tsx
```

## Tasks chi tiết

### Task 11.1: Tạo Admin Layout

```tsx
// frontend/src/layouts/AdminLayout.tsx
import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import AdminBreadcrumb from "../components/admin/AdminBreadcrumb";

const AdminLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check if user is system admin
  const isSystemAdmin = user?.system_role === "admin" || user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <AdminSidebar
          isOpen={true}
          onToggle={() => setMobileSidebarOpen(false)}
          isMobile={true}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <AdminBreadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
```

### Task 11.2: Tạo Admin Sidebar

```tsx
// frontend/src/components/admin/AdminSidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PhotoIcon,
  ChartBarIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  {
    name: "Organizations",
    href: "/admin/organizations",
    icon: BuildingOfficeIcon,
  },
  { name: "Workspaces", href: "/admin/workspaces", icon: FolderIcon },
  { name: "Tasks", href: "/admin/tasks", icon: ClipboardDocumentListIcon },
  { name: "Time Logs", href: "/admin/timelogs", icon: ClockIcon },
  { name: "Screenshots", href: "/admin/screenshots", icon: PhotoIcon },
  { name: "Statistics", href: "/admin/statistics", icon: ChartBarIcon },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onToggle,
  isMobile,
}) => {
  return (
    <div
      className={`
        bg-gray-900 text-white flex flex-col transition-all duration-300
        ${isOpen ? "w-64" : "w-20"}
        ${isMobile ? "w-64" : ""}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {(isOpen || isMobile) && (
          <span className="text-xl font-bold text-blue-400">Admin Panel</span>
        )}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isOpen ? (
              <ChevronLeftIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === "/admin"}
            className={({ isActive }) => `
              flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2
              transition-colors duration-200
              ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }
            `}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {(isOpen || isMobile) && <span className="ml-3">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Version Info */}
      {(isOpen || isMobile) && (
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          <div>Remote Time Tracker</div>
          <div>Admin v1.0.0</div>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;
```

### Task 11.3: Tạo Admin Header

```tsx
// frontend/src/components/admin/AdminHeader.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  Bars3Icon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

interface AdminHeaderProps {
  onMobileMenuClick: () => void;
  sidebarOpen: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  onMobileMenuClick,
  sidebarOpen,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
        >
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        </button>

        {/* Page title */}
        <h1 className="ml-4 text-lg font-semibold text-gray-800 hidden sm:block">
          System Administration
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
          <BellIcon className="h-6 w-6 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-red-600"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
```

### Task 11.4: Tạo Admin Breadcrumb

```tsx
// frontend/src/components/admin/AdminBreadcrumb.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

const breadcrumbNameMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Users",
  "/admin/organizations": "Organizations",
  "/admin/workspaces": "Workspaces",
  "/admin/tasks": "Tasks",
  "/admin/timelogs": "Time Logs",
  "/admin/screenshots": "Screenshots",
  "/admin/statistics": "Statistics",
  "/admin/settings": "Settings",
};

const AdminBreadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Build breadcrumb items
  const breadcrumbs = pathnames.map((_, index) => {
    const url = `/${pathnames.slice(0, index + 1).join("/")}`;
    const name = breadcrumbNameMap[url] || pathnames[index];
    const isLast = index === pathnames.length - 1;

    return { url, name, isLast };
  });

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            to="/admin"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HomeIcon className="h-5 w-5" />
          </Link>
        </li>

        {breadcrumbs.slice(1).map((crumb) => (
          <li key={crumb.url} className="flex items-center">
            <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
            {crumb.isLast ? (
              <span className="text-sm font-medium text-gray-700">
                {crumb.name}
              </span>
            ) : (
              <Link
                to={crumb.url}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default AdminBreadcrumb;
```

### Task 11.5: Tạo Admin Routes

```tsx
// frontend/src/routes/adminRoutes.tsx
import React, { lazy, Suspense } from "react";
import { RouteObject } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

// Lazy load admin pages
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(() => import("../pages/admin/AdminUsersPage"));
const AdminOrganizationsPage = lazy(
  () => import("../pages/admin/AdminOrganizationsPage"),
);
const AdminWorkspacesPage = lazy(
  () => import("../pages/admin/AdminWorkspacesPage"),
);
const AdminTasksPage = lazy(() => import("../pages/admin/AdminTasksPage"));
const AdminTimeLogsPage = lazy(
  () => import("../pages/admin/AdminTimeLogsPage"),
);
const AdminScreenshotsPage = lazy(
  () => import("../pages/admin/AdminScreenshotsPage"),
);
const AdminStatisticsPage = lazy(
  () => import("../pages/admin/AdminStatisticsPage"),
);

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

export const adminRoutes: RouteObject = {
  path: "/admin",
  element: <AdminLayout />,
  children: [
    {
      index: true,
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminDashboard />
        </Suspense>
      ),
    },
    {
      path: "users",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminUsersPage />
        </Suspense>
      ),
    },
    {
      path: "organizations",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminOrganizationsPage />
        </Suspense>
      ),
    },
    {
      path: "workspaces",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminWorkspacesPage />
        </Suspense>
      ),
    },
    {
      path: "tasks",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminTasksPage />
        </Suspense>
      ),
    },
    {
      path: "timelogs",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminTimeLogsPage />
        </Suspense>
      ),
    },
    {
      path: "screenshots",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminScreenshotsPage />
        </Suspense>
      ),
    },
    {
      path: "statistics",
      element: (
        <Suspense fallback={<PageLoader />}>
          <AdminStatisticsPage />
        </Suspense>
      ),
    },
  ],
};
```

### Task 11.6: Tạo Admin Auth Hook

```tsx
// frontend/src/hooks/useAdminAuth.ts
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface UseAdminAuthReturn {
  isAdmin: boolean;
  isLoading: boolean;
  user: any;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/login");
        return;
      }

      const adminCheck =
        user?.system_role === "admin" || user?.role === "admin";
      setIsAdmin(adminCheck);

      if (!adminCheck) {
        navigate("/");
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return {
    isAdmin,
    isLoading,
    user,
  };
};
```

## Acceptance Criteria

- [ ] Admin layout render đúng với sidebar và header
- [ ] Sidebar collapse/expand hoạt động đúng
- [ ] Mobile responsive với hamburger menu
- [ ] Navigation active state hiển thị đúng
- [ ] Breadcrumb hiển thị đúng path
- [ ] Non-admin users được redirect về home
- [ ] Unauthenticated users được redirect về login
- [ ] Lazy loading pages hoạt động

## Dependencies

- Không có dependency

## Estimated Time

- 3-4 giờ

## Testing

1. Kiểm tra với admin user - có thể truy cập tất cả routes
2. Kiểm tra với normal user - redirect về home
3. Kiểm tra không login - redirect về login
4. Kiểm tra responsive trên mobile/tablet
5. Kiểm tra sidebar collapse/expand
6. Kiểm tra breadcrumb navigation
