# V05-02: Clear toàn bộ code liên quan Electron từ Frontend

## Mục tiêu

Xóa tất cả code liên quan đến desktop app Electron khỏi frontend web admin, chỉ giữ lại code cho web admin.

## Phạm vi xóa

### 1. Pages không cần thiết (cho web admin)

Các pages dành cho user thường (không phải admin):

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TasksPage.tsx`
- `frontend/src/pages/TaskDetailPage.tsx`
- `frontend/src/pages/ScreenshotsPage.tsx`
- `frontend/src/pages/TimeLogsPage.tsx`
- `frontend/src/pages/StatisticsPage.tsx`
- `frontend/src/pages/OrganizationsPage.tsx`
- `frontend/src/pages/OrganizationDetailPage.tsx`
- `frontend/src/pages/JoinOrganizationPage.tsx` (giữ lại vì cần để user join organization)
- `frontend/src/pages/LoginPage.tsx` (giữ lại AdminLoginPage)

### 2. Components không cần thiết

- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Navbar.tsx`
- Các components không dùng cho admin

### 3. Code cần kiểm tra và xóa

- Electron-specific imports
- IPC communication code
- Desktop-only features
- Preload scripts references

### 4. Files giữ lại

- `frontend/src/pages/admin/*`
- `frontend/src/components/admin/*`
- `frontend/src/services/` (giữ các service dùng cho admin)
- `frontend/src/store/authStore.ts`
- `frontend/src/types/` (giữ types cần thiết)
- `frontend/src/utils/` (giữ utils cần thiết)

## Checklist thực hiện

- [ ] Backup code trước khi xóa (không cần, đã có git)
- [ ] Xóa pages không cần thiết
- [ ] Xóa components không cần thiết
- [ ] Cập nhật App.tsx để chỉ có routes admin
- [ ] Xóa imports không dùng
- [ ] Kiểm tra không có lỗi compile

## Status: [x] Completed

### Kết quả thực hiện:

- Đã xóa: DashboardPage, TasksPage, TaskDetailPage, ScreenshotsPage, TimeLogsPage, StatisticsPage, OrganizationsPage, OrganizationDetailPage, LoginPage
- Đã xóa components: Layout.tsx, Navbar.tsx
- Đã cập nhật App.tsx chỉ giữ lại routes admin và join organization
- Frontend build thành công
