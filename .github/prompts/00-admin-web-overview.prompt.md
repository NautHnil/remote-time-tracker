# Admin Web Interface - Tổng quan dự án

## Mục tiêu

Triển khai hệ thống admin quản trị qua web interface (frontend web). Hệ thống quản trị đóng vai trò quản lý toàn bộ users, organizations, workspaces, tasks, và time logs.

## Phạm vi

- **KHÔNG** trực tiếp liên quan đến desktop app Electron
- **KHÔNG** tạo tasks từ web admin, chỉ quản lý và xem thông tin

## Yêu cầu chính

### 1. Giao diện web admin

- Dashboard tổng quan hệ thống
- Quản lý users (CRUD)
- Quản lý organizations (CRUD)
- Quản lý workspaces (CRUD)
- Quản lý tasks (view, edit, delete - không tạo mới)
- Quản lý time logs (view, edit, delete)
- Báo cáo thống kê hệ thống

### 2. Bảo mật

- Chỉ admin system mới có quyền truy cập vào web admin
- Middleware kiểm tra quyền SystemRole = "admin"
- Route riêng biệt cho admin panel

### 3. Backend API

- Cập nhật API để hỗ trợ các chức năng quản trị
- API tạo user admin system ban đầu (seed)
- Phân biệt rõ ràng admin API vs user API

### 4. Database

- Cập nhật schema nếu cần thiết
- Đảm bảo trường `system_role` hoạt động đúng

## Danh sách TODO Files

| #   | File                                                                                     | Mô tả                                | Status |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------ | ------ |
| 01  | [01-database-schema-review.prompt.md](01-database-schema-review.prompt.md)               | Rà soát và cập nhật database schema  | ✅     |
| 02  | [02-backend-admin-seed-api.prompt.md](02-backend-admin-seed-api.prompt.md)               | API tạo admin system ban đầu         | ✅     |
| 03  | [03-backend-admin-middleware.prompt.md](03-backend-admin-middleware.prompt.md)           | Middleware bảo mật cho admin         | ✅     |
| 04  | [04-backend-admin-users-api.prompt.md](04-backend-admin-users-api.prompt.md)             | API quản lý users                    | ✅     |
| 05  | [05-backend-admin-orgs-api.prompt.md](05-backend-admin-orgs-api.prompt.md)               | API quản lý organizations            | ✅     |
| 06  | [06-backend-admin-workspaces-api.prompt.md](06-backend-admin-workspaces-api.prompt.md)   | API quản lý workspaces               | ✅     |
| 07  | [07-backend-admin-tasks-api.prompt.md](07-backend-admin-tasks-api.prompt.md)             | API quản lý tasks                    | ✅     |
| 08  | [08-backend-admin-timelogs-api.prompt.md](08-backend-admin-timelogs-api.prompt.md)       | API quản lý time logs                | ✅     |
| 09  | [09-backend-admin-screenshots-api.prompt.md](09-backend-admin-screenshots-api.prompt.md) | API quản lý screenshots              | ✅     |
| 10  | [10-backend-admin-statistics-api.prompt.md](10-backend-admin-statistics-api.prompt.md)   | API báo cáo thống kê                 | ✅     |
| 11  | [11-frontend-admin-layout.prompt.md](11-frontend-admin-layout.prompt.md)                 | Layout và navigation cho admin panel | ✅     |
| 12  | [12-frontend-admin-dashboard.prompt.md](12-frontend-admin-dashboard.prompt.md)           | Dashboard admin                      | ✅     |
| 13  | [13-frontend-admin-users.prompt.md](13-frontend-admin-users.prompt.md)                   | UI quản lý users                     | ✅     |
| 14  | [14-frontend-admin-organizations.prompt.md](14-frontend-admin-organizations.prompt.md)   | UI quản lý organizations             | ✅     |
| 15  | [15-frontend-admin-workspaces.prompt.md](15-frontend-admin-workspaces.prompt.md)         | UI quản lý workspaces                | ✅     |
| 16  | [16-frontend-admin-tasks.prompt.md](16-frontend-admin-tasks.prompt.md)                   | UI quản lý tasks                     | ✅     |
| 17  | [17-frontend-admin-timelogs.prompt.md](17-frontend-admin-timelogs.prompt.md)             | UI quản lý time logs                 | ✅     |
| 18  | [18-frontend-admin-screenshots.prompt.md](18-frontend-admin-screenshots.prompt.md)       | UI quản lý screenshots               | ✅     |
| 19  | [19-frontend-admin-statistics.prompt.md](19-frontend-admin-statistics.prompt.md)         | UI báo cáo thống kê                  | ✅     |
| 20  | [20-testing-integration.prompt.md](20-testing-integration.prompt.md)                     | Testing và integration               | ✅     |

## Thứ tự thực hiện khuyến nghị

1. **Phase 1 - Backend Foundation** (01-03)
   - Rà soát database schema
   - Tạo API seed admin
   - Setup middleware bảo mật

2. **Phase 2 - Backend APIs** (04-10)
   - Implement các API quản trị

3. **Phase 3 - Frontend Foundation** (11-12)
   - Setup layout admin panel
   - Tạo dashboard

4. **Phase 4 - Frontend Features** (13-19)
   - Implement các trang quản lý

5. **Phase 5 - Testing** (20)
   - Testing và integration

## Tech Stack sử dụng

### Backend

- Go (Golang)
- Gin Framework
- GORM
- PostgreSQL

### Frontend

- React 18
- TypeScript
- TailwindCSS
- Zustand (state management)
- React Query (data fetching)

## Ghi chú

- Mỗi file prompt là một task độc lập
- Agent có thể thực hiện tuần tự hoặc song song tùy theo dependency
- Đánh dấu ✅ khi hoàn thành task
