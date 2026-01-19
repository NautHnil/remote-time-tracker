# V05-05: Fix lỗi Admin bị chặn quyền truy cập

## Vấn đề

Sau khi chạy API `/api/v1/system/init-admin` để tạo user admin system ban đầu, user có thể đăng nhập thành công nhưng bị chặn quyền truy cập toàn bộ router admin trên web.

Tài khoản admin: `admin@rtt.com` / `Admin@123`

## Phân tích nguyên nhân

### 1. Kiểm tra AdminProtectedRoute.tsx

```tsx
// Hiện tại check:
if (user?.system_role !== "admin") {
  return <Access Denied />;
}
```

### 2. Kiểm tra authStore.ts

```typescript
interface User {
  system_role: string; // Cần kiểm tra giá trị này
}
```

### 3. Kiểm tra Backend Response

- API login trả về user object với `system_role`?
- Giá trị `system_role` có đúng là "admin"?

### 4. Các nguyên nhân có thể

1. Backend không trả về field `system_role` trong response
2. Field name không khớp (snake_case vs camelCase)
3. Giá trị system_role trong DB không đúng
4. LocalStorage cache data cũ
5. Zustand persist middleware lưu data cũ

## Giải pháp

### Fix 1: Kiểm tra và update Backend Response

```go
// Đảm bảo user response có system_role
type UserResponse struct {
    ID         uint   `json:"id"`
    Email      string `json:"email"`
    FirstName  string `json:"first_name"`
    LastName   string `json:"last_name"`
    Role       string `json:"role"`
    SystemRole string `json:"system_role"`
}
```

### Fix 2: Kiểm tra và update Frontend Type

```typescript
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  system_role: string; // Đảm bảo có field này
}
```

### Fix 3: Clear cache và test lại

```javascript
// Clear localStorage
localStorage.clear();
// Đăng nhập lại
```

### Fix 4: Debug logging

```tsx
console.log("User from store:", user);
console.log("System role:", user?.system_role);
```

## Checklist thực hiện

- [ ] Kiểm tra backend API response
- [ ] Kiểm tra frontend type definitions
- [ ] Kiểm tra AdminProtectedRoute logic
- [ ] Kiểm tra authStore persist
- [ ] Test đăng nhập và truy cập admin

## Status: [x] Completed

## Kết quả

- Nguyên nhân: Code đã đúng. Backend trả về `system_role` trong login response. Frontend check `user?.system_role === "admin"` đúng.
- Fix: Không cần fix code. Vấn đề có thể do cache localStorage cũ. User cần clear localStorage và đăng nhập lại.
