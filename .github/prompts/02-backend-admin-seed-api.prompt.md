# TODO 02: Backend Admin Seed API

## Mục tiêu

Tạo API để khởi tạo user admin system ban đầu. API này chỉ chạy được khi chưa có admin nào trong hệ thống.

## Yêu cầu

### 1. API Endpoint

- **POST** `/api/v1/system/init-admin`
- Không cần authentication (chỉ khi chưa có admin)
- Chỉ thực hiện được 1 lần

### 2. Request Body

```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "first_name": "System",
  "last_name": "Admin"
}
```

### 3. Response

```json
{
  "success": true,
  "message": "System admin created successfully",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "first_name": "System",
    "last_name": "Admin",
    "system_role": "admin"
  }
}
```

### 4. Error Cases

- 409 Conflict: Admin đã tồn tại
- 400 Bad Request: Thiếu thông tin hoặc validation fail
- 500 Internal Server Error: Lỗi database

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/system_controller.go  (update)
backend/internal/service/system_service.go (create)
backend/internal/dto/system_dto.go (create)
backend/internal/router/router.go (update)
```

## Tasks chi tiết

### Task 2.1: Tạo DTO

```go
// backend/internal/dto/system_dto.go
package dto

type InitAdminRequest struct {
    Email     string `json:"email" binding:"required,email"`
    Password  string `json:"password" binding:"required,min=8"`
    FirstName string `json:"first_name" binding:"required"`
    LastName  string `json:"last_name" binding:"required"`
}

type InitAdminResponse struct {
    Success bool         `json:"success"`
    Message string       `json:"message"`
    User    UserResponse `json:"user,omitempty"`
}
```

### Task 2.2: Tạo Service

```go
// backend/internal/service/system_service.go
package service

type SystemService interface {
    InitializeAdmin(req *dto.InitAdminRequest) (*models.User, error)
    HasSystemAdmin() (bool, error)
}

type systemService struct {
    userRepo repository.UserRepository
}

func (s *systemService) HasSystemAdmin() (bool, error) {
    count, err := s.userRepo.CountBySystemRole("admin")
    return count > 0, err
}

func (s *systemService) InitializeAdmin(req *dto.InitAdminRequest) (*models.User, error) {
    // Check if admin already exists
    hasAdmin, err := s.HasSystemAdmin()
    if err != nil {
        return nil, err
    }
    if hasAdmin {
        return nil, errors.New("system admin already exists")
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    // Create admin user
    admin := &models.User{
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        FirstName:    req.FirstName,
        LastName:     req.LastName,
        Role:         "admin",
        SystemRole:   "admin",
        IsActive:     true,
    }

    return s.userRepo.Create(admin)
}
```

### Task 2.3: Cập nhật Controller

```go
// backend/internal/controller/system_controller.go
func (c *SystemController) InitializeAdmin(ctx *gin.Context) {
    var req dto.InitAdminRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check if admin exists
    hasAdmin, err := c.systemService.HasSystemAdmin()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    if hasAdmin {
        ctx.JSON(http.StatusConflict, gin.H{
            "success": false,
            "message": "System admin already exists",
        })
        return
    }

    // Create admin
    admin, err := c.systemService.InitializeAdmin(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusCreated, dto.InitAdminResponse{
        Success: true,
        Message: "System admin created successfully",
        User: dto.UserResponse{
            ID:         admin.ID,
            Email:      admin.Email,
            FirstName:  admin.FirstName,
            LastName:   admin.LastName,
            SystemRole: admin.SystemRole,
        },
    })
}
```

### Task 2.4: Cập nhật Router

```go
// backend/internal/router/router.go
// Public system routes (no auth required)
system := v1.Group("/system")
{
    system.POST("/init-admin", systemController.InitializeAdmin)
    system.GET("/admin-exists", systemController.CheckAdminExists)
}
```

### Task 2.5: Thêm Repository method

```go
// backend/internal/repository/user_repository.go
func (r *userRepository) CountBySystemRole(role string) (int64, error) {
    var count int64
    err := r.db.Model(&models.User{}).
        Where("system_role = ? AND deleted_at IS NULL", role).
        Count(&count).Error
    return count, err
}
```

## Acceptance Criteria

- [ ] API init-admin tạo được admin đầu tiên
- [ ] API trả về 409 nếu đã có admin
- [ ] Password được hash bằng bcrypt
- [ ] Validation email và password đúng format
- [ ] API check-admin-exists hoạt động đúng
- [ ] Log ghi nhận action init admin

## Dependencies

- TODO 01: Database Schema Review

## Estimated Time

- 2-3 giờ

## Testing

```bash
# Test init admin
curl -X POST http://localhost:8080/api/v1/system/init-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@timetracker.com",
    "password": "Admin@123456",
    "first_name": "System",
    "last_name": "Admin"
  }'

# Test check admin exists
curl http://localhost:8080/api/v1/system/admin-exists
```

## Security Notes

- API này nên được disable hoặc bảo vệ trong production sau khi tạo admin
- Có thể thêm rate limiting để chống brute force
- Log mọi attempt gọi API này
