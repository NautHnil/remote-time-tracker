# TODO 07: Backend Admin Tasks API

## Mục tiêu

Triển khai đầy đủ API quản lý tasks cho admin system. **Lưu ý**: Admin chỉ có quyền view, edit, delete - không tạo mới task.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                              | Mô tả                                  |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/api/v1/admin/tasks`                 | Danh sách tasks với pagination, filter |
| GET    | `/api/v1/admin/tasks/:id`             | Chi tiết task                          |
| PUT    | `/api/v1/admin/tasks/:id`             | Cập nhật task                          |
| DELETE | `/api/v1/admin/tasks/:id`             | Xóa task (soft delete)                 |
| GET    | `/api/v1/admin/tasks/:id/timelogs`    | Danh sách time logs của task           |
| GET    | `/api/v1/admin/tasks/:id/screenshots` | Danh sách screenshots của task         |
| PUT    | `/api/v1/admin/tasks/:id/status`      | Thay đổi status task                   |

### 2. Query Parameters cho List

```
GET /api/v1/admin/tasks?page=1&limit=20&search=task&user_id=1&org_id=1&workspace_id=1&status=active&is_manual=true&start_date=2024-01-01&end_date=2024-12-31&sort_by=created_at&sort_order=desc
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 7.1: Thêm Task DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// TASK ADMIN DTOs
// ============================================================================

type AdminTaskListRequest struct {
    Page        int        `form:"page" binding:"min=1"`
    Limit       int        `form:"limit" binding:"min=1,max=100"`
    Search      string     `form:"search"`
    UserID      *uint      `form:"user_id"`
    OrgID       *uint      `form:"org_id"`
    WorkspaceID *uint      `form:"workspace_id"`
    Status      string     `form:"status"` // active, completed, archived
    IsManual    *bool      `form:"is_manual"`
    StartDate   *time.Time `form:"start_date" time_format:"2006-01-02"`
    EndDate     *time.Time `form:"end_date" time_format:"2006-01-02"`
    SortBy      string     `form:"sort_by"`
    SortOrder   string     `form:"sort_order"`
}

type AdminTaskResponse struct {
    ID              uint       `json:"id"`
    LocalID         string     `json:"local_id"`
    Title           string     `json:"title"`
    Description     string     `json:"description"`
    Status          string     `json:"status"`
    Priority        int        `json:"priority"`
    Color           string     `json:"color"`
    IsManual        bool       `json:"is_manual"`
    UserID          uint       `json:"user_id"`
    UserEmail       string     `json:"user_email"`
    UserName        string     `json:"user_name"`
    OrganizationID  *uint      `json:"organization_id"`
    OrgName         string     `json:"org_name"`
    WorkspaceID     *uint      `json:"workspace_id"`
    WorkspaceName   string     `json:"workspace_name"`
    AdminNotes      string     `json:"admin_notes"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    TimeLogsCount   int64      `json:"timelogs_count"`
    TotalDuration   int64      `json:"total_duration"`
    ScreenshotsCount int64     `json:"screenshots_count"`
}

type AdminTaskDetailResponse struct {
    AdminTaskResponse
    TimeLogs    []TimeLogSummaryResponse    `json:"timelogs"`
    Screenshots []ScreenshotSummaryResponse `json:"screenshots"`
}

type TimeLogSummaryResponse struct {
    ID         uint       `json:"id"`
    StartTime  time.Time  `json:"start_time"`
    EndTime    *time.Time `json:"end_time"`
    Duration   int64      `json:"duration"`
    Status     string     `json:"status"`
    IsManual   bool       `json:"is_manual"`
    TaskTitle  string     `json:"task_title"`
}

type ScreenshotSummaryResponse struct {
    ID           uint      `json:"id"`
    FileName     string    `json:"file_name"`
    FilePath     string    `json:"file_path"`
    CapturedAt   time.Time `json:"captured_at"`
    ScreenNumber int       `json:"screen_number"`
    FileSize     int64     `json:"file_size"`
}

type AdminUpdateTaskRequest struct {
    Title       *string `json:"title"`
    Description *string `json:"description"`
    Status      *string `json:"status"`
    Priority    *int    `json:"priority"`
    Color       *string `json:"color"`
    AdminNotes  *string `json:"admin_notes"`
}

type AdminChangeTaskStatusRequest struct {
    Status string `json:"status" binding:"required,oneof=active completed archived"`
}
```

### Task 7.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// Tasks
func (r *adminRepository) FindTasksWithFilters(req *dto.AdminTaskListRequest) ([]models.Task, int64, error) {
    var tasks []models.Task
    var total int64

    query := r.db.Model(&models.Task{}).
        Preload("User", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, email, first_name, last_name")
        }).
        Preload("Organization", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        }).
        Preload("Workspace", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        })

    // Apply filters
    if req.Search != "" {
        searchPattern := "%" + req.Search + "%"
        query = query.Where(
            "tasks.title ILIKE ? OR tasks.description ILIKE ? OR tasks.local_id ILIKE ?",
            searchPattern, searchPattern, searchPattern,
        )
    }

    if req.UserID != nil {
        query = query.Where("tasks.user_id = ?", *req.UserID)
    }

    if req.OrgID != nil {
        query = query.Where("tasks.organization_id = ?", *req.OrgID)
    }

    if req.WorkspaceID != nil {
        query = query.Where("tasks.workspace_id = ?", *req.WorkspaceID)
    }

    if req.Status != "" {
        query = query.Where("tasks.status = ?", req.Status)
    }

    if req.IsManual != nil {
        query = query.Where("tasks.is_manual = ?", *req.IsManual)
    }

    if req.StartDate != nil {
        query = query.Where("tasks.created_at >= ?", *req.StartDate)
    }

    if req.EndDate != nil {
        endDate := req.EndDate.Add(24 * time.Hour) // Include the whole end day
        query = query.Where("tasks.created_at < ?", endDate)
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Apply sorting
    sortBy := "tasks.created_at"
    if req.SortBy != "" {
        sortBy = "tasks." + req.SortBy
    }
    sortOrder := "DESC"
    if req.SortOrder == "asc" {
        sortOrder = "ASC"
    }
    query = query.Order(sortBy + " " + sortOrder)

    // Apply pagination
    offset := (req.Page - 1) * req.Limit
    query = query.Offset(offset).Limit(req.Limit)

    if err := query.Find(&tasks).Error; err != nil {
        return nil, 0, err
    }

    return tasks, total, nil
}

func (r *adminRepository) GetTaskDetailWithStats(taskID uint) (*models.Task, *dto.AdminTaskDetailResponse, error) {
    var task models.Task
    if err := r.db.
        Preload("User").
        Preload("Organization").
        Preload("Workspace").
        First(&task, taskID).Error; err != nil {
        return nil, nil, err
    }

    response := &dto.AdminTaskDetailResponse{}

    // Count timelogs
    r.db.Model(&models.TimeLog{}).
        Where("task_id = ?", taskID).
        Count(&response.TimeLogsCount)

    // Get total duration
    var totalDuration struct{ Sum int64 }
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0) as sum").
        Where("task_id = ?", taskID).
        Scan(&totalDuration)
    response.TotalDuration = totalDuration.Sum

    // Count screenshots
    r.db.Model(&models.Screenshot{}).
        Where("task_id = ?", taskID).
        Count(&response.ScreenshotsCount)

    // Get recent timelogs (last 10)
    var timeLogs []models.TimeLog
    r.db.Model(&models.TimeLog{}).
        Where("task_id = ?", taskID).
        Order("start_time DESC").
        Limit(10).
        Find(&timeLogs)

    response.TimeLogs = make([]dto.TimeLogSummaryResponse, 0, len(timeLogs))
    for _, tl := range timeLogs {
        response.TimeLogs = append(response.TimeLogs, dto.TimeLogSummaryResponse{
            ID:        tl.ID,
            StartTime: tl.StartTime,
            EndTime:   tl.EndTime,
            Duration:  tl.Duration,
            Status:    tl.Status,
            IsManual:  tl.IsManual,
            TaskTitle: tl.TaskTitle,
        })
    }

    // Get recent screenshots (last 10)
    var screenshots []models.Screenshot
    r.db.Model(&models.Screenshot{}).
        Where("task_id = ?", taskID).
        Order("captured_at DESC").
        Limit(10).
        Find(&screenshots)

    response.Screenshots = make([]dto.ScreenshotSummaryResponse, 0, len(screenshots))
    for _, ss := range screenshots {
        response.Screenshots = append(response.Screenshots, dto.ScreenshotSummaryResponse{
            ID:           ss.ID,
            FileName:     ss.FileName,
            FilePath:     ss.FilePath,
            CapturedAt:   ss.CapturedAt,
            ScreenNumber: ss.ScreenNumber,
            FileSize:     ss.FileSize,
        })
    }

    return &task, response, nil
}

func (r *adminRepository) GetTaskTimeLogs(taskID uint, page, limit int) ([]models.TimeLog, int64, error) {
    var timeLogs []models.TimeLog
    var total int64

    query := r.db.Model(&models.TimeLog{}).
        Preload("User").
        Where("task_id = ?", taskID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Order("start_time DESC").Offset(offset).Limit(limit).Find(&timeLogs).Error; err != nil {
        return nil, 0, err
    }

    return timeLogs, total, nil
}

func (r *adminRepository) GetTaskScreenshots(taskID uint, page, limit int) ([]models.Screenshot, int64, error) {
    var screenshots []models.Screenshot
    var total int64

    query := r.db.Model(&models.Screenshot{}).
        Where("task_id = ?", taskID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Order("captured_at DESC").Offset(offset).Limit(limit).Find(&screenshots).Error; err != nil {
        return nil, 0, err
    }

    return screenshots, total, nil
}
```

### Task 7.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

// ListTasks lists all tasks with filters
func (c *AdminController) ListTasks(ctx *gin.Context) {
    var req dto.AdminTaskListRequest
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

    tasks, total, err := c.adminRepo.FindTasksWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    taskResponses := make([]dto.AdminTaskResponse, 0, len(tasks))
    for _, task := range tasks {
        taskResponses = append(taskResponses, c.toAdminTaskResponse(&task))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "tasks": taskResponses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetTask gets task detail
func (c *AdminController) GetTask(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    task, detail, err := c.adminRepo.GetTaskDetailWithStats(uint(taskID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    response := c.toAdminTaskDetailResponse(task, detail)

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    response,
    })
}

// UpdateTask updates task info
func (c *AdminController) UpdateTask(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    var req dto.AdminUpdateTaskRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    task, err := c.taskRepo.FindByID(uint(taskID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    // Update fields
    if req.Title != nil {
        task.Title = *req.Title
    }
    if req.Description != nil {
        task.Description = *req.Description
    }
    if req.Status != nil {
        task.Status = *req.Status
    }
    if req.Priority != nil {
        task.Priority = *req.Priority
    }
    if req.Color != nil {
        task.Color = *req.Color
    }
    if req.AdminNotes != nil {
        task.AdminNotes = *req.AdminNotes
    }

    if err := c.taskRepo.Update(task); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    c.toAdminTaskResponse(task),
    })
}

// DeleteTask soft deletes a task
func (c *AdminController) DeleteTask(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    // Optional: Check and warn about associated data
    timeLogsCount, _ := c.adminRepo.CountTaskTimeLogs(uint(taskID))
    screenshotsCount, _ := c.adminRepo.CountTaskScreenshots(uint(taskID))

    if err := c.taskRepo.Delete(uint(taskID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Task deleted successfully",
        "deleted_data": gin.H{
            "timelogs_count":    timeLogsCount,
            "screenshots_count": screenshotsCount,
        },
    })
}

// GetTaskTimeLogs gets all time logs for a task
func (c *AdminController) GetTaskTimeLogs(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

    timeLogs, total, err := c.adminRepo.GetTaskTimeLogs(uint(taskID), page, limit)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "timelogs": timeLogs,
            "total":    total,
            "page":     page,
            "limit":    limit,
        },
    })
}

// GetTaskScreenshots gets all screenshots for a task
func (c *AdminController) GetTaskScreenshots(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

    screenshots, total, err := c.adminRepo.GetTaskScreenshots(uint(taskID), page, limit)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "screenshots": screenshots,
            "total":       total,
            "page":        page,
            "limit":       limit,
        },
    })
}

// ChangeTaskStatus changes task status
func (c *AdminController) ChangeTaskStatus(ctx *gin.Context) {
    taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
        return
    }

    var req dto.AdminChangeTaskStatusRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    task, err := c.taskRepo.FindByID(uint(taskID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
        return
    }

    task.Status = req.Status
    if err := c.taskRepo.Update(task); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": fmt.Sprintf("Task status changed to %s", req.Status),
        "data":    c.toAdminTaskResponse(task),
    })
}
```

## Acceptance Criteria

- [ ] List tasks với pagination, filter, search hoạt động đúng
- [ ] Filter theo user_id, org_id, workspace_id, status, is_manual hoạt động
- [ ] Filter theo date range hoạt động
- [ ] Get task detail trả về đầy đủ thông tin và related data
- [ ] Update task chỉ update fields được gửi
- [ ] Delete task là soft delete và báo cáo associated data
- [ ] Get timelogs và screenshots của task hoạt động đúng
- [ ] Change status endpoint hoạt động đúng

## Dependencies

- TODO 06: Backend Admin Workspaces API

## Estimated Time

- 4-5 giờ

## Testing

```bash
# List tasks
curl -X GET "http://localhost:8080/api/v1/admin/tasks?user_id=1&status=active" \
  -H "Authorization: Bearer <admin_token>"

# Get task detail
curl -X GET "http://localhost:8080/api/v1/admin/tasks/1" \
  -H "Authorization: Bearer <admin_token>"

# Update task
curl -X PUT "http://localhost:8080/api/v1/admin/tasks/1" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "admin_notes": "Verified by admin"}'

# Get task screenshots
curl -X GET "http://localhost:8080/api/v1/admin/tasks/1/screenshots" \
  -H "Authorization: Bearer <admin_token>"
```
