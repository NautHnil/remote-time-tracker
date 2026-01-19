# TODO 06: Backend Admin Workspaces API

## Mục tiêu

Triển khai đầy đủ API quản lý workspaces (projects) cho admin system.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                                 | Mô tả                                       |
| ------ | ---------------------------------------- | ------------------------------------------- |
| GET    | `/api/v1/admin/workspaces`               | Danh sách workspaces với pagination, filter |
| GET    | `/api/v1/admin/workspaces/:id`           | Chi tiết workspace                          |
| PUT    | `/api/v1/admin/workspaces/:id`           | Cập nhật workspace                          |
| DELETE | `/api/v1/admin/workspaces/:id`           | Xóa workspace (soft delete)                 |
| PUT    | `/api/v1/admin/workspaces/:id/archive`   | Archive workspace                           |
| PUT    | `/api/v1/admin/workspaces/:id/unarchive` | Unarchive workspace                         |
| GET    | `/api/v1/admin/workspaces/:id/members`   | Danh sách members                           |
| GET    | `/api/v1/admin/workspaces/:id/tasks`     | Danh sách tasks                             |
| GET    | `/api/v1/admin/workspaces/:id/stats`     | Thống kê workspace                          |

### 2. Query Parameters cho List

```
GET /api/v1/admin/workspaces?page=1&limit=20&search=project&org_id=1&is_active=true&is_archived=false&admin_id=1&sort_by=created_at&sort_order=desc
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 6.1: Thêm Workspace DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// WORKSPACE ADMIN DTOs
// ============================================================================

type AdminWorkspaceListRequest struct {
    Page       int    `form:"page" binding:"min=1"`
    Limit      int    `form:"limit" binding:"min=1,max=100"`
    Search     string `form:"search"`
    OrgID      *uint  `form:"org_id"`
    AdminID    *uint  `form:"admin_id"`
    IsActive   *bool  `form:"is_active"`
    IsArchived *bool  `form:"is_archived"`
    IsBillable *bool  `form:"is_billable"`
    SortBy     string `form:"sort_by"`
    SortOrder  string `form:"sort_order"`
}

type AdminWorkspaceResponse struct {
    ID             uint       `json:"id"`
    Name           string     `json:"name"`
    Slug           string     `json:"slug"`
    Description    string     `json:"description"`
    Color          string     `json:"color"`
    Icon           string     `json:"icon"`
    OrganizationID uint       `json:"organization_id"`
    OrgName        string     `json:"org_name"`
    AdminID        uint       `json:"admin_id"`
    AdminName      string     `json:"admin_name"`
    AdminEmail     string     `json:"admin_email"`
    IsActive       bool       `json:"is_active"`
    IsArchived     bool       `json:"is_archived"`
    ArchivedAt     *time.Time `json:"archived_at"`
    IsBillable     bool       `json:"is_billable"`
    HourlyRate     float64    `json:"hourly_rate"`
    StartDate      *time.Time `json:"start_date"`
    EndDate        *time.Time `json:"end_date"`
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`
    MembersCount   int64      `json:"members_count"`
    TasksCount     int64      `json:"tasks_count"`
    TimeLogsCount  int64      `json:"timelogs_count"`
    TotalDuration  int64      `json:"total_duration"`
    TotalCost      float64    `json:"total_cost"` // If billable
}

type AdminWorkspaceDetailResponse struct {
    AdminWorkspaceResponse
    Organization  OrgSummaryResponse           `json:"organization"`
    Members       []WorkspaceMemberDetailResponse `json:"members"`
    RecentTasks   []TaskResponse               `json:"recent_tasks"`
    ActivityStats []DailyActivityStats         `json:"activity_stats"`
}

type OrgSummaryResponse struct {
    ID   uint   `json:"id"`
    Name string `json:"name"`
    Slug string `json:"slug"`
}

type WorkspaceMemberDetailResponse struct {
    ID              uint      `json:"id"`
    UserID          uint      `json:"user_id"`
    Email           string    `json:"email"`
    FirstName       string    `json:"first_name"`
    LastName        string    `json:"last_name"`
    RoleName        string    `json:"role_name"`
    IsAdmin         bool      `json:"is_admin"`
    CanViewReports  bool      `json:"can_view_reports"`
    CanManageTasks  bool      `json:"can_manage_tasks"`
    JoinedAt        time.Time `json:"joined_at"`
    IsActive        bool      `json:"is_active"`
    TotalDuration   int64     `json:"total_duration"`
    TasksCount      int64     `json:"tasks_count"`
}

type DailyActivityStats struct {
    Date          string  `json:"date"`
    Duration      int64   `json:"duration"`
    TasksCount    int64   `json:"tasks_count"`
    MembersActive int64   `json:"members_active"`
}

type AdminUpdateWorkspaceRequest struct {
    Name        *string    `json:"name"`
    Description *string    `json:"description"`
    Color       *string    `json:"color"`
    Icon        *string    `json:"icon"`
    AdminID     *uint      `json:"admin_id"`
    IsActive    *bool      `json:"is_active"`
    IsBillable  *bool      `json:"is_billable"`
    HourlyRate  *float64   `json:"hourly_rate"`
    StartDate   *time.Time `json:"start_date"`
    EndDate     *time.Time `json:"end_date"`
}

type AdminWorkspaceStatsResponse struct {
    TotalMembers        int64                `json:"total_members"`
    ActiveMembers       int64                `json:"active_members"`
    TotalTasks          int64                `json:"total_tasks"`
    ActiveTasks         int64                `json:"active_tasks"`
    CompletedTasks      int64                `json:"completed_tasks"`
    TotalTimeLogs       int64                `json:"total_timelogs"`
    TotalDuration       int64                `json:"total_duration"`
    TotalScreenshots    int64                `json:"total_screenshots"`
    TotalCost           float64              `json:"total_cost"`
    AvgDurationPerTask  float64              `json:"avg_duration_per_task"`
    MemberActivity      []MemberActivityStats `json:"member_activity"`
    DailyActivity       []DailyActivityStats  `json:"daily_activity"`
}
```

### Task 6.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// Workspaces
func (r *adminRepository) FindWorkspacesWithFilters(req *dto.AdminWorkspaceListRequest) ([]models.Workspace, int64, error) {
    var workspaces []models.Workspace
    var total int64

    query := r.db.Model(&models.Workspace{}).
        Preload("Organization", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name, slug")
        }).
        Preload("Admin", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, email, first_name, last_name")
        })

    // Apply filters
    if req.Search != "" {
        searchPattern := "%" + req.Search + "%"
        query = query.Where(
            "workspaces.name ILIKE ? OR workspaces.slug ILIKE ? OR workspaces.description ILIKE ?",
            searchPattern, searchPattern, searchPattern,
        )
    }

    if req.OrgID != nil {
        query = query.Where("organization_id = ?", *req.OrgID)
    }

    if req.AdminID != nil {
        query = query.Where("admin_id = ?", *req.AdminID)
    }

    if req.IsActive != nil {
        query = query.Where("is_active = ?", *req.IsActive)
    }

    if req.IsArchived != nil {
        query = query.Where("is_archived = ?", *req.IsArchived)
    }

    if req.IsBillable != nil {
        query = query.Where("is_billable = ?", *req.IsBillable)
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

    if err := query.Find(&workspaces).Error; err != nil {
        return nil, 0, err
    }

    return workspaces, total, nil
}

func (r *adminRepository) GetWorkspaceDetailWithStats(wsID uint) (*models.Workspace, *dto.AdminWorkspaceStatsResponse, error) {
    var ws models.Workspace
    if err := r.db.
        Preload("Organization").
        Preload("Admin").
        Preload("Members.User").
        Preload("Members.WorkspaceRole").
        First(&ws, wsID).Error; err != nil {
        return nil, nil, err
    }

    stats := &dto.AdminWorkspaceStatsResponse{}

    // Count members
    r.db.Model(&models.WorkspaceMember{}).
        Where("workspace_id = ?", wsID).
        Count(&stats.TotalMembers)

    r.db.Model(&models.WorkspaceMember{}).
        Where("workspace_id = ? AND is_active = true", wsID).
        Count(&stats.ActiveMembers)

    // Count tasks
    r.db.Model(&models.Task{}).
        Where("workspace_id = ?", wsID).
        Count(&stats.TotalTasks)

    r.db.Model(&models.Task{}).
        Where("workspace_id = ? AND status = 'active'", wsID).
        Count(&stats.ActiveTasks)

    r.db.Model(&models.Task{}).
        Where("workspace_id = ? AND status = 'completed'", wsID).
        Count(&stats.CompletedTasks)

    // Count timelogs and duration
    r.db.Model(&models.TimeLog{}).
        Where("workspace_id = ?", wsID).
        Count(&stats.TotalTimeLogs)

    var totalDuration struct{ Sum int64 }
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0) as sum").
        Where("workspace_id = ?", wsID).
        Scan(&totalDuration)
    stats.TotalDuration = totalDuration.Sum

    // Count screenshots
    r.db.Model(&models.Screenshot{}).
        Where("workspace_id = ?", wsID).
        Count(&stats.TotalScreenshots)

    // Calculate total cost if billable
    if ws.IsBillable && ws.HourlyRate > 0 {
        hours := float64(stats.TotalDuration) / 3600.0
        stats.TotalCost = hours * ws.HourlyRate
    }

    // Calculate avg duration per task
    if stats.TotalTasks > 0 {
        stats.AvgDurationPerTask = float64(stats.TotalDuration) / float64(stats.TotalTasks)
    }

    // Get member activity
    var memberActivity []dto.MemberActivityStats
    r.db.Table("users").
        Select(`
            users.id as user_id,
            users.email,
            users.first_name,
            users.last_name,
            COALESCE(SUM(time_logs.duration), 0) as total_duration,
            COUNT(DISTINCT tasks.id) as tasks_count
        `).
        Joins("JOIN workspace_members ON workspace_members.user_id = users.id").
        Joins("LEFT JOIN time_logs ON time_logs.user_id = users.id AND time_logs.workspace_id = ?", wsID).
        Joins("LEFT JOIN tasks ON tasks.user_id = users.id AND tasks.workspace_id = ?", wsID).
        Where("workspace_members.workspace_id = ?", wsID).
        Group("users.id, users.email, users.first_name, users.last_name").
        Order("total_duration DESC").
        Scan(&memberActivity)
    stats.MemberActivity = memberActivity

    // Get daily activity (last 30 days)
    var dailyActivity []dto.DailyActivityStats
    r.db.Table("time_logs").
        Select(`
            DATE(start_time) as date,
            COALESCE(SUM(duration), 0) as duration,
            COUNT(DISTINCT task_id) as tasks_count,
            COUNT(DISTINCT user_id) as members_active
        `).
        Where("workspace_id = ? AND start_time >= NOW() - INTERVAL '30 days'", wsID).
        Group("DATE(start_time)").
        Order("date DESC").
        Scan(&dailyActivity)
    stats.DailyActivity = dailyActivity

    return &ws, stats, nil
}

func (r *adminRepository) GetWorkspaceMembers(wsID uint, page, limit int) ([]models.WorkspaceMember, int64, error) {
    var members []models.WorkspaceMember
    var total int64

    query := r.db.Model(&models.WorkspaceMember{}).
        Preload("User").
        Preload("WorkspaceRole").
        Where("workspace_id = ?", wsID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Offset(offset).Limit(limit).Find(&members).Error; err != nil {
        return nil, 0, err
    }

    return members, total, nil
}

func (r *adminRepository) GetWorkspaceTasks(wsID uint, page, limit int) ([]models.Task, int64, error) {
    var tasks []models.Task
    var total int64

    query := r.db.Model(&models.Task{}).
        Preload("User").
        Where("workspace_id = ?", wsID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&tasks).Error; err != nil {
        return nil, 0, err
    }

    return tasks, total, nil
}

func (r *adminRepository) ArchiveWorkspace(wsID uint, archivedBy uint) error {
    now := time.Now()
    return r.db.Model(&models.Workspace{}).
        Where("id = ?", wsID).
        Updates(map[string]interface{}{
            "is_archived":  true,
            "archived_at":  now,
            "archived_by":  archivedBy,
        }).Error
}

func (r *adminRepository) UnarchiveWorkspace(wsID uint) error {
    return r.db.Model(&models.Workspace{}).
        Where("id = ?", wsID).
        Updates(map[string]interface{}{
            "is_archived":  false,
            "archived_at":  nil,
            "archived_by":  nil,
        }).Error
}
```

### Task 6.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// WORKSPACE MANAGEMENT
// ============================================================================

// ListWorkspaces lists all workspaces with filters
func (c *AdminController) ListWorkspaces(ctx *gin.Context) {
    var req dto.AdminWorkspaceListRequest
    if err := ctx.ShouldBindQuery(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Page < 1 {
        req.Page = 1
    }
    if req.Limit < 1 || req.Limit > 100 {
        req.Limit = 20
    }

    workspaces, total, err := c.adminRepo.FindWorkspacesWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    wsResponses := make([]dto.AdminWorkspaceResponse, 0, len(workspaces))
    for _, ws := range workspaces {
        wsResponses = append(wsResponses, c.toAdminWorkspaceResponse(&ws))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "workspaces": wsResponses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetWorkspace gets workspace detail
func (c *AdminController) GetWorkspace(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    ws, stats, err := c.adminRepo.GetWorkspaceDetailWithStats(uint(wsID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
        return
    }

    response := c.toAdminWorkspaceDetailResponse(ws, stats)

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    response,
    })
}

// UpdateWorkspace updates workspace info
func (c *AdminController) UpdateWorkspace(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    var req dto.AdminUpdateWorkspaceRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    ws, err := c.wsRepo.FindByID(uint(wsID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
        return
    }

    // Update fields
    if req.Name != nil {
        ws.Name = *req.Name
    }
    if req.Description != nil {
        ws.Description = *req.Description
    }
    if req.Color != nil {
        ws.Color = *req.Color
    }
    if req.Icon != nil {
        ws.Icon = *req.Icon
    }
    if req.AdminID != nil {
        ws.AdminID = *req.AdminID
    }
    if req.IsActive != nil {
        ws.IsActive = *req.IsActive
    }
    if req.IsBillable != nil {
        ws.IsBillable = *req.IsBillable
    }
    if req.HourlyRate != nil {
        ws.HourlyRate = *req.HourlyRate
    }
    if req.StartDate != nil {
        ws.StartDate = req.StartDate
    }
    if req.EndDate != nil {
        ws.EndDate = req.EndDate
    }

    if err := c.wsRepo.Update(ws); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    c.toAdminWorkspaceResponse(ws),
    })
}

// DeleteWorkspace soft deletes a workspace
func (c *AdminController) DeleteWorkspace(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    // Check if workspace has active tasks
    tasksCount, _ := c.adminRepo.CountWorkspaceTasks(uint(wsID))
    if tasksCount > 0 {
        ctx.JSON(http.StatusConflict, gin.H{
            "error": "Cannot delete workspace with existing tasks. Consider archiving instead.",
            "tasks_count": tasksCount,
        })
        return
    }

    if err := c.wsRepo.Delete(uint(wsID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Workspace deleted successfully",
    })
}

// ArchiveWorkspace archives a workspace
func (c *AdminController) ArchiveWorkspace(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    adminUser, _ := ctx.Get("admin_user")
    admin := adminUser.(*models.User)

    if err := c.adminRepo.ArchiveWorkspace(uint(wsID), admin.ID); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Workspace archived successfully",
    })
}

// UnarchiveWorkspace unarchives a workspace
func (c *AdminController) UnarchiveWorkspace(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    if err := c.adminRepo.UnarchiveWorkspace(uint(wsID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Workspace unarchived successfully",
    })
}

// GetWorkspaceStats gets workspace statistics
func (c *AdminController) GetWorkspaceStats(ctx *gin.Context) {
    wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid workspace ID"})
        return
    }

    _, stats, err := c.adminRepo.GetWorkspaceDetailWithStats(uint(wsID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Workspace not found"})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}
```

## Acceptance Criteria

- [ ] List workspaces với pagination, filter, search hoạt động đúng
- [ ] Get workspace detail trả về đầy đủ thông tin và stats
- [ ] Update workspace chỉ update fields được gửi
- [ ] Delete workspace kiểm tra tasks trước khi xóa
- [ ] Archive/Unarchive workspace hoạt động đúng
- [ ] Tính toán total cost cho billable workspaces đúng
- [ ] Daily activity stats cho 30 ngày gần nhất

## Dependencies

- TODO 05: Backend Admin Organizations API

## Estimated Time

- 4-5 giờ

## Testing

```bash
# List workspaces
curl -X GET "http://localhost:8080/api/v1/admin/workspaces?org_id=1&is_archived=false" \
  -H "Authorization: Bearer <admin_token>"

# Get workspace detail
curl -X GET "http://localhost:8080/api/v1/admin/workspaces/1" \
  -H "Authorization: Bearer <admin_token>"

# Archive workspace
curl -X PUT "http://localhost:8080/api/v1/admin/workspaces/1/archive" \
  -H "Authorization: Bearer <admin_token>"

# Get workspace stats
curl -X GET "http://localhost:8080/api/v1/admin/workspaces/1/stats" \
  -H "Authorization: Bearer <admin_token>"
```
