# TODO 04: Backend Admin Users API

## Mục tiêu

Triển khai đầy đủ API quản lý users cho admin system.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                             | Mô tả                                  |
| ------ | ------------------------------------ | -------------------------------------- |
| GET    | `/api/v1/admin/users`                | Danh sách users với pagination, filter |
| GET    | `/api/v1/admin/users/:id`            | Chi tiết user                          |
| POST   | `/api/v1/admin/users`                | Tạo user mới                           |
| PUT    | `/api/v1/admin/users/:id`            | Cập nhật user                          |
| DELETE | `/api/v1/admin/users/:id`            | Xóa user (soft delete)                 |
| PUT    | `/api/v1/admin/users/:id/activate`   | Kích hoạt user                         |
| PUT    | `/api/v1/admin/users/:id/deactivate` | Vô hiệu hóa user                       |
| PUT    | `/api/v1/admin/users/:id/role`       | Thay đổi role                          |
| GET    | `/api/v1/admin/users/:id/activity`   | Lịch sử hoạt động                      |

### 2. Query Parameters cho List

```
GET /api/v1/admin/users?page=1&limit=20&search=john&role=member&is_active=true&org_id=1&sort_by=created_at&sort_order=desc
```

### 3. Response Format

```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/service/admin_service.go (create)
backend/internal/repository/admin_repository.go (create)
backend/internal/dto/admin_dto.go (create)
```

## Tasks chi tiết

### Task 4.1: Tạo Admin DTOs

```go
// backend/internal/dto/admin_dto.go
package dto

import "time"

// ============================================================================
// USER ADMIN DTOs
// ============================================================================

type AdminUserListRequest struct {
    Page       int    `form:"page" binding:"min=1"`
    Limit      int    `form:"limit" binding:"min=1,max=100"`
    Search     string `form:"search"`
    Role       string `form:"role"`
    SystemRole string `form:"system_role"`
    IsActive   *bool  `form:"is_active"`
    OrgID      *uint  `form:"org_id"`
    SortBy     string `form:"sort_by"`
    SortOrder  string `form:"sort_order"`
}

type AdminUserResponse struct {
    ID              uint       `json:"id"`
    Email           string     `json:"email"`
    FirstName       string     `json:"first_name"`
    LastName        string     `json:"last_name"`
    Role            string     `json:"role"`
    SystemRole      string     `json:"system_role"`
    IsActive        bool       `json:"is_active"`
    LastLoginAt     *time.Time `json:"last_login_at"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    OrgsCount       int64      `json:"orgs_count"`
    WorkspacesCount int64      `json:"workspaces_count"`
    TasksCount      int64      `json:"tasks_count"`
    TimeLogsCount   int64      `json:"timelogs_count"`
    TotalDuration   int64      `json:"total_duration"` // seconds
}

type AdminUserDetailResponse struct {
    AdminUserResponse
    Organizations []OrgMembershipResponse `json:"organizations"`
    Workspaces    []WorkspaceMembershipResponse `json:"workspaces"`
    RecentTasks   []TaskResponse `json:"recent_tasks"`
    RecentTimeLogs []TimeLogResponse `json:"recent_timelogs"`
    Devices       []DeviceInfoResponse `json:"devices"`
}

type AdminCreateUserRequest struct {
    Email      string `json:"email" binding:"required,email"`
    Password   string `json:"password" binding:"required,min=8"`
    FirstName  string `json:"first_name" binding:"required"`
    LastName   string `json:"last_name" binding:"required"`
    Role       string `json:"role"`
    SystemRole string `json:"system_role"`
    IsActive   bool   `json:"is_active"`
}

type AdminUpdateUserRequest struct {
    Email      *string `json:"email" binding:"omitempty,email"`
    FirstName  *string `json:"first_name"`
    LastName   *string `json:"last_name"`
    Role       *string `json:"role"`
    SystemRole *string `json:"system_role"`
    IsActive   *bool   `json:"is_active"`
}

type AdminChangeRoleRequest struct {
    Role       string `json:"role" binding:"required"`
    SystemRole string `json:"system_role" binding:"required"`
}

type OrgMembershipResponse struct {
    OrgID     uint   `json:"org_id"`
    OrgName   string `json:"org_name"`
    Role      string `json:"role"`
    JoinedAt  time.Time `json:"joined_at"`
}

type WorkspaceMembershipResponse struct {
    WorkspaceID   uint   `json:"workspace_id"`
    WorkspaceName string `json:"workspace_name"`
    OrgName       string `json:"org_name"`
    RoleName      string `json:"role_name"`
    IsAdmin       bool   `json:"is_admin"`
    JoinedAt      time.Time `json:"joined_at"`
}

type DeviceInfoResponse struct {
    ID         uint       `json:"id"`
    DeviceName string     `json:"device_name"`
    OS         string     `json:"os"`
    OSVersion  string     `json:"os_version"`
    AppVersion string     `json:"app_version"`
    LastSeenAt *time.Time `json:"last_seen_at"`
    IsActive   bool       `json:"is_active"`
}
```

### Task 4.2: Tạo Admin Repository

```go
// backend/internal/repository/admin_repository.go
package repository

import (
    "gorm.io/gorm"
    "github.com/beuphecan/remote-time-tracker/internal/models"
    "github.com/beuphecan/remote-time-tracker/internal/dto"
)

type AdminRepository interface {
    // Users
    FindUsersWithFilters(req *dto.AdminUserListRequest) ([]models.User, int64, error)
    GetUserDetailWithStats(userID uint) (*models.User, *dto.AdminUserDetailResponse, error)
    GetUserOrganizations(userID uint) ([]dto.OrgMembershipResponse, error)
    GetUserWorkspaces(userID uint) ([]dto.WorkspaceMembershipResponse, error)
    GetUserDevices(userID uint) ([]models.DeviceInfo, error)
    GetUserActivity(userID uint, limit int) ([]models.AuditLog, error)
}

type adminRepository struct {
    db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) AdminRepository {
    return &adminRepository{db: db}
}

func (r *adminRepository) FindUsersWithFilters(req *dto.AdminUserListRequest) ([]models.User, int64, error) {
    var users []models.User
    var total int64

    query := r.db.Model(&models.User{})

    // Apply filters
    if req.Search != "" {
        searchPattern := "%" + req.Search + "%"
        query = query.Where(
            "email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
            searchPattern, searchPattern, searchPattern,
        )
    }

    if req.Role != "" {
        query = query.Where("role = ?", req.Role)
    }

    if req.SystemRole != "" {
        query = query.Where("system_role = ?", req.SystemRole)
    }

    if req.IsActive != nil {
        query = query.Where("is_active = ?", *req.IsActive)
    }

    if req.OrgID != nil {
        query = query.Joins(
            "JOIN organization_members ON organization_members.user_id = users.id",
        ).Where("organization_members.organization_id = ?", *req.OrgID)
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Apply sorting
    sortBy := "created_at"
    if req.SortBy != "" {
        sortBy = req.SortBy
    }
    sortOrder := "DESC"
    if req.SortOrder == "asc" {
        sortOrder = "ASC"
    }
    query = query.Order(sortBy + " " + sortOrder)

    // Apply pagination
    offset := (req.Page - 1) * req.Limit
    query = query.Offset(offset).Limit(req.Limit)

    if err := query.Find(&users).Error; err != nil {
        return nil, 0, err
    }

    return users, total, nil
}

func (r *adminRepository) GetUserDetailWithStats(userID uint) (*models.User, *dto.AdminUserDetailResponse, error) {
    var user models.User
    if err := r.db.First(&user, userID).Error; err != nil {
        return nil, nil, err
    }

    stats := &dto.AdminUserDetailResponse{}

    // Count orgs
    r.db.Model(&models.OrganizationMember{}).
        Where("user_id = ?", userID).
        Count(&stats.OrgsCount)

    // Count workspaces
    r.db.Model(&models.WorkspaceMember{}).
        Where("user_id = ?", userID).
        Count(&stats.WorkspacesCount)

    // Count tasks
    r.db.Model(&models.Task{}).
        Where("user_id = ?", userID).
        Count(&stats.TasksCount)

    // Count timelogs and total duration
    r.db.Model(&models.TimeLog{}).
        Where("user_id = ?", userID).
        Count(&stats.TimeLogsCount)

    var totalDuration struct{ Sum int64 }
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0) as sum").
        Where("user_id = ?", userID).
        Scan(&totalDuration)
    stats.TotalDuration = totalDuration.Sum

    return &user, stats, nil
}
```

### Task 4.3: Cập nhật Admin Controller

```go
// backend/internal/controller/admin_controller.go (thêm các methods)

// ListUsers with advanced filtering
func (c *AdminController) ListUsers(ctx *gin.Context) {
    var req dto.AdminUserListRequest
    if err := ctx.ShouldBindQuery(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Set defaults
    if req.Page < 1 {
        req.Page = 1
    }
    if req.Limit < 1 || req.Limit > 100 {
        req.Limit = 20
    }

    users, total, err := c.adminRepo.FindUsersWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Convert to response
    userResponses := make([]dto.AdminUserResponse, 0, len(users))
    for _, u := range users {
        userResponses = append(userResponses, c.toAdminUserResponse(&u))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "users": userResponses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetUser with detailed stats
func (c *AdminController) GetUserDetail(ctx *gin.Context) {
    userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    user, stats, err := c.adminRepo.GetUserDetailWithStats(uint(userID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Get related data
    orgs, _ := c.adminRepo.GetUserOrganizations(uint(userID))
    workspaces, _ := c.adminRepo.GetUserWorkspaces(uint(userID))
    devices, _ := c.adminRepo.GetUserDevices(uint(userID))

    response := c.toAdminUserResponse(user)
    response.OrgsCount = stats.OrgsCount
    response.WorkspacesCount = stats.WorkspacesCount
    response.TasksCount = stats.TasksCount
    response.TimeLogsCount = stats.TimeLogsCount
    response.TotalDuration = stats.TotalDuration

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "user":         response,
            "organizations": orgs,
            "workspaces":   workspaces,
            "devices":      devices,
        },
    })
}

// CreateUser creates a new user
func (c *AdminController) CreateUser(ctx *gin.Context) {
    var req dto.AdminCreateUserRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Check email exists
    existing, _ := c.userRepo.FindByEmail(req.Email)
    if existing != nil {
        ctx.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
        return
    }

    // Set defaults
    role := req.Role
    if role == "" {
        role = "user"
    }
    systemRole := req.SystemRole
    if systemRole == "" {
        systemRole = "member"
    }

    user := &models.User{
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        FirstName:    req.FirstName,
        LastName:     req.LastName,
        Role:         role,
        SystemRole:   systemRole,
        IsActive:     req.IsActive,
    }

    if err := c.userRepo.Create(user); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusCreated, gin.H{
        "success": true,
        "data":    c.toAdminUserResponse(user),
    })
}

// UpdateUser updates user info
func (c *AdminController) UpdateUser(ctx *gin.Context) {
    userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    var req dto.AdminUpdateUserRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    user, err := c.userRepo.FindByID(uint(userID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Update fields
    if req.Email != nil {
        user.Email = *req.Email
    }
    if req.FirstName != nil {
        user.FirstName = *req.FirstName
    }
    if req.LastName != nil {
        user.LastName = *req.LastName
    }
    if req.Role != nil {
        user.Role = *req.Role
    }
    if req.SystemRole != nil {
        user.SystemRole = *req.SystemRole
    }
    if req.IsActive != nil {
        user.IsActive = *req.IsActive
    }

    if err := c.userRepo.Update(user); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    c.toAdminUserResponse(user),
    })
}

// DeleteUser soft deletes a user
func (c *AdminController) DeleteUser(ctx *gin.Context) {
    userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    // Prevent self-deletion
    adminUser, _ := ctx.Get("admin_user")
    if admin, ok := adminUser.(*models.User); ok && admin.ID == uint(userID) {
        ctx.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete yourself"})
        return
    }

    if err := c.userRepo.Delete(uint(userID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "User deleted successfully",
    })
}

// ActivateUser activates a user
func (c *AdminController) ActivateUser(ctx *gin.Context) {
    userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    user, err := c.userRepo.FindByID(uint(userID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    user.IsActive = true
    if err := c.userRepo.Update(user); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "User activated successfully",
    })
}

// DeactivateUser deactivates a user
func (c *AdminController) DeactivateUser(ctx *gin.Context) {
    userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
        return
    }

    // Prevent self-deactivation
    adminUser, _ := ctx.Get("admin_user")
    if admin, ok := adminUser.(*models.User); ok && admin.ID == uint(userID) {
        ctx.JSON(http.StatusForbidden, gin.H{"error": "Cannot deactivate yourself"})
        return
    }

    user, err := c.userRepo.FindByID(uint(userID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    user.IsActive = false
    if err := c.userRepo.Update(user); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "User deactivated successfully",
    })
}
```

## Acceptance Criteria

- [ ] List users với pagination, filter, search hoạt động đúng
- [ ] Get user detail trả về đầy đủ thông tin và stats
- [ ] Create user với validation đầy đủ
- [ ] Update user chỉ update fields được gửi
- [ ] Delete user là soft delete
- [ ] Không thể delete/deactivate chính mình
- [ ] Audit log ghi nhận tất cả actions

## Dependencies

- TODO 03: Backend Admin Middleware

## Estimated Time

- 4-5 giờ

## Testing

```bash
# List users
curl -X GET "http://localhost:8080/api/v1/admin/users?page=1&limit=10&search=john" \
  -H "Authorization: Bearer <admin_token>"

# Get user detail
curl -X GET "http://localhost:8080/api/v1/admin/users/1" \
  -H "Authorization: Bearer <admin_token>"

# Create user
curl -X POST "http://localhost:8080/api/v1/admin/users" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123",
    "first_name": "New",
    "last_name": "User"
  }'

# Update user
curl -X PUT "http://localhost:8080/api/v1/admin/users/2" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Updated"}'

# Delete user
curl -X DELETE "http://localhost:8080/api/v1/admin/users/2" \
  -H "Authorization: Bearer <admin_token>"
```
