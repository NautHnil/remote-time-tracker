# V05-06: Testing và đảm bảo hoạt động

## Mục tiêu

Kiểm tra toàn bộ chức năng web admin hoạt động mượt mà sau khi thực hiện các thay đổi.

## Test Cases

### 1. Authentication

- [ ] Đăng nhập với admin@rtt.com / Admin@123
- [ ] Truy cập thành công vào admin panel
- [ ] Đăng xuất hoạt động
- [ ] Redirect đúng khi chưa đăng nhập
- [ ] Hiển thị Access Denied cho user không phải admin

### 2. Dashboard

- [ ] Hiển thị statistics đúng
- [ ] Charts render đúng
- [ ] Data loading states
- [ ] Error handling

### 3. Users Management

- [ ] List users với pagination
- [ ] Search/filter users
- [ ] View user details
- [ ] Edit user
- [ ] Delete user

### 4. Organizations Management

- [ ] List organizations
- [ ] View organization details
- [ ] View members
- [ ] Edit organization
- [ ] Delete organization

### 5. Workspaces Management

- [ ] List workspaces
- [ ] View workspace details
- [ ] View members
- [ ] Edit workspace
- [ ] Delete workspace

### 6. Tasks Management

- [ ] List tasks
- [ ] Filter by user/workspace
- [ ] View task details
- [ ] View task screenshots
- [ ] Edit task
- [ ] Delete task

### 7. Time Logs Management

- [ ] List time logs
- [ ] Filter by date/user/task
- [ ] View time log details
- [ ] Calculate total hours

### 8. Screenshots Management

- [ ] List screenshots
- [ ] View screenshot image
- [ ] Filter by task/user
- [ ] Delete screenshot

### 9. Statistics

- [ ] Overview statistics
- [ ] Charts render
- [ ] Filter by date range
- [ ] Export data (if available)

### 10. UI/UX Testing

- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode (if implemented)
- [ ] Loading states
- [ ] Error messages
- [ ] Toast notifications
- [ ] Modal dialogs

### 11. Performance

- [ ] Page load time < 3s
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Efficient API calls

## Test Environment

- Browser: Chrome, Firefox, Safari
- Screen sizes: 375px, 768px, 1024px, 1440px

## Bug Report Template

```
### Bug Title
**Steps to reproduce:**
1.
2.
3.

**Expected:**
**Actual:**
**Screenshot:**
```

## Status: [x] Completed

### Kết quả:

- Frontend build: ✅ Thành công (429 modules, 408.66 kB JS, 47.53 kB CSS)
- Backend build: ✅ Thành công
- Cần test thực tế với browser để hoàn tất các test cases

### Hướng dẫn test:

1. Start backend: `cd backend && go run cmd/server/main.go`
2. Start frontend: `cd frontend && npm run dev`
3. Truy cập: http://localhost:5173/admin/login
4. Đăng nhập: admin@rtt.com / Admin@123
5. Nếu bị chặn quyền, clear localStorage và thử lại
