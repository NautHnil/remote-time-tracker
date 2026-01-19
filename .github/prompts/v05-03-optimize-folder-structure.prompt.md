# V05-03: Tối ưu cấu trúc thư mục Frontend Web Admin

## Mục tiêu

Tổ chức lại cấu trúc thư mục frontend cho web admin một cách chuyên nghiệp, dễ bảo trì.

## Cấu trúc đề xuất

```
frontend/src/
├── components/
│   ├── common/               # Shared components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Pagination.tsx
│   │   ├── Loading.tsx
│   │   └── index.ts
│   └── features/             # Feature-specific components
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── workspaces/
│   │   ├── tasks/
│   │   ├── timelogs/
│   │   ├── screenshots/
│   │   └── statistics/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── index.ts
├── layout/               # Layouts
│   ├── AdminLayout.tsx
│   └── index.ts
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── UsersPage.tsx
│   ├── OrganizationsPage.tsx
│   ├── WorkspacesPage.tsx
│   ├── TasksPage.tsx
│   ├── TimeLogsPage.tsx
│   ├── ScreenshotsPage.tsx
│   ├── StatisticsPage.tsx
│   └── index.ts
├── services/
│   ├── api.ts                # Base API config
│   ├── authService.ts
│   ├── userService.ts
│   ├── organizationService.ts
│   ├── workspaceService.ts
│   ├── taskService.ts
│   ├── timelogService.ts
│   ├── screenshotService.ts
│   ├── statisticsService.ts
│   └── index.ts
├── store/
│   ├── authStore.ts
│   └── index.ts
├── types/
│   ├── api.ts
│   ├── user.ts
│   ├── organization.ts
│   ├── workspace.ts
│   ├── task.ts
│   ├── timelog.ts
│   ├── screenshot.ts
│   └── index.ts
├── utils/
│   ├── format.ts
│   ├── validation.ts
│   ├── constants.ts
│   └── index.ts
├── hooks/
│   ├── useAuth.ts
│   ├── usePagination.ts
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Checklist thực hiện

- [ ] Di chuyển files vào đúng vị trí
- [ ] Cập nhật import paths
- [ ] Tạo barrel exports (index.ts)
- [ ] Xóa thư mục rỗng
- [ ] Kiểm tra không lỗi compile

## Status: [x] Completed

### Kết quả thực hiện:

- Tạo folder `layouts/` chứa AdminLayout
- Tạo barrel exports: components/index.ts, store/index.ts, types/index.ts, utils/index.ts, layouts/index.ts
- Cấu trúc thư mục đã được tối ưu theo chuẩn
