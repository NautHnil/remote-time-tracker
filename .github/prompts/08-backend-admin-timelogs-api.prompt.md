# TODO 08: Backend Admin TimeLogs API

## Mục tiêu

Triển khai đầy đủ API quản lý time logs cho admin system.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                                 | Mô tả                                      |
| ------ | ---------------------------------------- | ------------------------------------------ |
| GET    | `/api/v1/admin/timelogs`                 | Danh sách time logs với pagination, filter |
| GET    | `/api/v1/admin/timelogs/:id`             | Chi tiết time log                          |
| PUT    | `/api/v1/admin/timelogs/:id`             | Cập nhật time log                          |
| DELETE | `/api/v1/admin/timelogs/:id`             | Xóa time log (soft delete)                 |
| PUT    | `/api/v1/admin/timelogs/:id/approve`     | Approve time log                           |
| PUT    | `/api/v1/admin/timelogs/:id/reject`      | Reject/unapprove time log                  |
| GET    | `/api/v1/admin/timelogs/:id/screenshots` | Danh sách screenshots của time log         |
| GET    | `/api/v1/admin/timelogs/export`          | Export time logs to CSV                    |

### 2. Query Parameters cho List

```
GET /api/v1/admin/timelogs?page=1&limit=20&user_id=1&org_id=1&workspace_id=1&task_id=1&status=stopped&is_approved=false&start_date=2024-01-01&end_date=2024-12-31&min_duration=3600&sort_by=start_time&sort_order=desc
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 8.1: Thêm TimeLog DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// TIMELOG ADMIN DTOs
// ============================================================================

type AdminTimeLogListRequest struct {
    Page        int        `form:"page" binding:"min=1"`
    Limit       int        `form:"limit" binding:"min=1,max=100"`
    UserID      *uint      `form:"user_id"`
    OrgID       *uint      `form:"org_id"`
    WorkspaceID *uint      `form:"workspace_id"`
    TaskID      *uint      `form:"task_id"`
    Status      string     `form:"status"` // running, paused, stopped
    IsApproved  *bool      `form:"is_approved"`
    IsManual    *bool      `form:"is_manual"`
    StartDate   *time.Time `form:"start_date" time_format:"2006-01-02"`
    EndDate     *time.Time `form:"end_date" time_format:"2006-01-02"`
    MinDuration *int64     `form:"min_duration"` // seconds
    MaxDuration *int64     `form:"max_duration"` // seconds
    SortBy      string     `form:"sort_by"`
    SortOrder   string     `form:"sort_order"`
}

type AdminTimeLogResponse struct {
    ID              uint       `json:"id"`
    LocalID         string     `json:"local_id"`
    UserID          uint       `json:"user_id"`
    UserEmail       string     `json:"user_email"`
    UserName        string     `json:"user_name"`
    TaskID          *uint      `json:"task_id"`
    TaskLocalID     string     `json:"task_local_id"`
    TaskTitle       string     `json:"task_title"`
    OrganizationID  *uint      `json:"organization_id"`
    OrgName         string     `json:"org_name"`
    WorkspaceID     *uint      `json:"workspace_id"`
    WorkspaceName   string     `json:"workspace_name"`
    DeviceID        *uint      `json:"device_id"`
    DeviceName      string     `json:"device_name"`
    StartTime       time.Time  `json:"start_time"`
    EndTime         *time.Time `json:"end_time"`
    PausedAt        *time.Time `json:"paused_at"`
    ResumedAt       *time.Time `json:"resumed_at"`
    Duration        int64      `json:"duration"`
    PausedTotal     int64      `json:"paused_total"`
    Status          string     `json:"status"`
    IsManual        bool       `json:"is_manual"`
    IsSynced        bool       `json:"is_synced"`
    IsApproved      bool       `json:"is_approved"`
    ApprovedBy      *uint      `json:"approved_by"`
    ApprovedByName  string     `json:"approved_by_name"`
    ApprovedAt      *time.Time `json:"approved_at"`
    AdminNotes      string     `json:"admin_notes"`
    Notes           string     `json:"notes"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    ScreenshotsCount int64     `json:"screenshots_count"`
}

type AdminTimeLogDetailResponse struct {
    AdminTimeLogResponse
    Screenshots []ScreenshotSummaryResponse `json:"screenshots"`
    Task        *TaskSummaryResponse        `json:"task"`
    Device      *DeviceSummaryResponse      `json:"device"`
}

type TaskSummaryResponse struct {
    ID          uint   `json:"id"`
    LocalID     string `json:"local_id"`
    Title       string `json:"title"`
    Status      string `json:"status"`
    IsManual    bool   `json:"is_manual"`
}

type DeviceSummaryResponse struct {
    ID         uint       `json:"id"`
    DeviceName string     `json:"device_name"`
    OS         string     `json:"os"`
    AppVersion string     `json:"app_version"`
    LastSeenAt *time.Time `json:"last_seen_at"`
}

type AdminUpdateTimeLogRequest struct {
    TaskTitle   *string    `json:"task_title"`
    Notes       *string    `json:"notes"`
    AdminNotes  *string    `json:"admin_notes"`
    Duration    *int64     `json:"duration"`
    StartTime   *time.Time `json:"start_time"`
    EndTime     *time.Time `json:"end_time"`
}

type AdminApproveTimeLogRequest struct {
    Notes string `json:"notes"`
}

type AdminExportTimeLogsRequest struct {
    UserID      *uint      `form:"user_id"`
    OrgID       *uint      `form:"org_id"`
    WorkspaceID *uint      `form:"workspace_id"`
    StartDate   time.Time  `form:"start_date" binding:"required" time_format:"2006-01-02"`
    EndDate     time.Time  `form:"end_date" binding:"required" time_format:"2006-01-02"`
    Format      string     `form:"format"` // csv, json
}
```

### Task 8.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// TimeLogs
func (r *adminRepository) FindTimeLogsWithFilters(req *dto.AdminTimeLogListRequest) ([]models.TimeLog, int64, error) {
    var timeLogs []models.TimeLog
    var total int64

    query := r.db.Model(&models.TimeLog{}).
        Preload("User", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, email, first_name, last_name")
        }).
        Preload("Task", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, local_id, title, status")
        }).
        Preload("Organization", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        }).
        Preload("Workspace", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        }).
        Preload("Device", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, device_name, os, app_version")
        })

    // Apply filters
    if req.UserID != nil {
        query = query.Where("time_logs.user_id = ?", *req.UserID)
    }

    if req.OrgID != nil {
        query = query.Where("time_logs.organization_id = ?", *req.OrgID)
    }

    if req.WorkspaceID != nil {
        query = query.Where("time_logs.workspace_id = ?", *req.WorkspaceID)
    }

    if req.TaskID != nil {
        query = query.Where("time_logs.task_id = ?", *req.TaskID)
    }

    if req.Status != "" {
        query = query.Where("time_logs.status = ?", req.Status)
    }

    if req.IsApproved != nil {
        query = query.Where("time_logs.is_approved = ?", *req.IsApproved)
    }

    if req.IsManual != nil {
        query = query.Where("time_logs.is_manual = ?", *req.IsManual)
    }

    if req.StartDate != nil {
        query = query.Where("time_logs.start_time >= ?", *req.StartDate)
    }

    if req.EndDate != nil {
        endDate := req.EndDate.Add(24 * time.Hour)
        query = query.Where("time_logs.start_time < ?", endDate)
    }

    if req.MinDuration != nil {
        query = query.Where("time_logs.duration >= ?", *req.MinDuration)
    }

    if req.MaxDuration != nil {
        query = query.Where("time_logs.duration <= ?", *req.MaxDuration)
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Apply sorting
    sortBy := "time_logs.start_time"
    if req.SortBy != "" {
        sortBy = "time_logs." + req.SortBy
    }
    sortOrder := "DESC"
    if req.SortOrder == "asc" {
        sortOrder = "ASC"
    }
    query = query.Order(sortBy + " " + sortOrder)

    // Apply pagination
    offset := (req.Page - 1) * req.Limit
    query = query.Offset(offset).Limit(req.Limit)

    if err := query.Find(&timeLogs).Error; err != nil {
        return nil, 0, err
    }

    return timeLogs, total, nil
}

func (r *adminRepository) GetTimeLogDetail(timeLogID uint) (*models.TimeLog, error) {
    var timeLog models.TimeLog
    if err := r.db.
        Preload("User").
        Preload("Task").
        Preload("Organization").
        Preload("Workspace").
        Preload("Device").
        Preload("Screenshots", func(db *gorm.DB) *gorm.DB {
            return db.Order("captured_at DESC").Limit(20)
        }).
        First(&timeLog, timeLogID).Error; err != nil {
        return nil, err
    }

    return &timeLog, nil
}

func (r *adminRepository) GetTimeLogScreenshots(timeLogID uint, page, limit int) ([]models.Screenshot, int64, error) {
    var screenshots []models.Screenshot
    var total int64

    query := r.db.Model(&models.Screenshot{}).
        Where("time_log_id = ?", timeLogID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Order("captured_at DESC").Offset(offset).Limit(limit).Find(&screenshots).Error; err != nil {
        return nil, 0, err
    }

    return screenshots, total, nil
}

func (r *adminRepository) ApproveTimeLog(timeLogID, approvedBy uint, notes string) error {
    now := time.Now()
    return r.db.Model(&models.TimeLog{}).
        Where("id = ?", timeLogID).
        Updates(map[string]interface{}{
            "is_approved":  true,
            "approved_by":  approvedBy,
            "approved_at":  now,
            "admin_notes":  notes,
        }).Error
}

func (r *adminRepository) RejectTimeLog(timeLogID uint, notes string) error {
    return r.db.Model(&models.TimeLog{}).
        Where("id = ?", timeLogID).
        Updates(map[string]interface{}{
            "is_approved":  false,
            "approved_by":  nil,
            "approved_at":  nil,
            "admin_notes":  notes,
        }).Error
}

func (r *adminRepository) ExportTimeLogs(req *dto.AdminExportTimeLogsRequest) ([]models.TimeLog, error) {
    var timeLogs []models.TimeLog

    query := r.db.Model(&models.TimeLog{}).
        Preload("User").
        Preload("Task").
        Preload("Organization").
        Preload("Workspace").
        Where("start_time >= ? AND start_time < ?", req.StartDate, req.EndDate.Add(24*time.Hour))

    if req.UserID != nil {
        query = query.Where("user_id = ?", *req.UserID)
    }

    if req.OrgID != nil {
        query = query.Where("organization_id = ?", *req.OrgID)
    }

    if req.WorkspaceID != nil {
        query = query.Where("workspace_id = ?", *req.WorkspaceID)
    }

    if err := query.Order("start_time ASC").Find(&timeLogs).Error; err != nil {
        return nil, err
    }

    return timeLogs, nil
}
```

### Task 8.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// TIMELOG MANAGEMENT
// ============================================================================

// ListTimeLogs lists all time logs with filters
func (c *AdminController) ListTimeLogs(ctx *gin.Context) {
    var req dto.AdminTimeLogListRequest
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

    timeLogs, total, err := c.adminRepo.FindTimeLogsWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    responses := make([]dto.AdminTimeLogResponse, 0, len(timeLogs))
    for _, tl := range timeLogs {
        responses = append(responses, c.toAdminTimeLogResponse(&tl))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "timelogs": responses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetTimeLog gets time log detail
func (c *AdminController) GetTimeLog(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    timeLog, err := c.adminRepo.GetTimeLogDetail(uint(timeLogID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Time log not found"})
        return
    }

    response := c.toAdminTimeLogDetailResponse(timeLog)

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    response,
    })
}

// UpdateTimeLog updates time log info
func (c *AdminController) UpdateTimeLog(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    var req dto.AdminUpdateTimeLogRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    timeLog, err := c.timeLogRepo.FindByID(uint(timeLogID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Time log not found"})
        return
    }

    // Update fields
    if req.TaskTitle != nil {
        timeLog.TaskTitle = *req.TaskTitle
    }
    if req.Notes != nil {
        timeLog.Notes = *req.Notes
    }
    if req.AdminNotes != nil {
        timeLog.AdminNotes = *req.AdminNotes
    }
    if req.Duration != nil {
        timeLog.Duration = *req.Duration
    }
    if req.StartTime != nil {
        timeLog.StartTime = *req.StartTime
    }
    if req.EndTime != nil {
        timeLog.EndTime = req.EndTime
    }

    if err := c.timeLogRepo.Update(timeLog); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    c.toAdminTimeLogResponse(timeLog),
    })
}

// DeleteTimeLog soft deletes a time log
func (c *AdminController) DeleteTimeLog(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    // Count associated screenshots
    screenshotsCount, _ := c.adminRepo.CountTimeLogScreenshots(uint(timeLogID))

    if err := c.timeLogRepo.Delete(uint(timeLogID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Time log deleted successfully",
        "deleted_data": gin.H{
            "screenshots_count": screenshotsCount,
        },
    })
}

// ApproveTimeLog approves a time log
func (c *AdminController) ApproveTimeLog(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    var req dto.AdminApproveTimeLogRequest
    ctx.ShouldBindJSON(&req) // Optional notes

    adminUser, _ := ctx.Get("admin_user")
    admin := adminUser.(*models.User)

    if err := c.adminRepo.ApproveTimeLog(uint(timeLogID), admin.ID, req.Notes); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Time log approved successfully",
    })
}

// RejectTimeLog rejects/unapproves a time log
func (c *AdminController) RejectTimeLog(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    var req dto.AdminApproveTimeLogRequest
    ctx.ShouldBindJSON(&req) // Optional notes

    if err := c.adminRepo.RejectTimeLog(uint(timeLogID), req.Notes); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Time log rejected successfully",
    })
}

// GetTimeLogScreenshots gets screenshots for a time log
func (c *AdminController) GetTimeLogScreenshots(ctx *gin.Context) {
    timeLogID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time log ID"})
        return
    }

    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

    screenshots, total, err := c.adminRepo.GetTimeLogScreenshots(uint(timeLogID), page, limit)
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

// ExportTimeLogs exports time logs to CSV/JSON
func (c *AdminController) ExportTimeLogs(ctx *gin.Context) {
    var req dto.AdminExportTimeLogsRequest
    if err := ctx.ShouldBindQuery(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Format == "" {
        req.Format = "csv"
    }

    timeLogs, err := c.adminRepo.ExportTimeLogs(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    if req.Format == "json" {
        ctx.JSON(http.StatusOK, gin.H{
            "success": true,
            "data":    timeLogs,
            "count":   len(timeLogs),
        })
        return
    }

    // Generate CSV
    csv := c.generateTimeLogsCSV(timeLogs)

    filename := fmt.Sprintf("timelogs_%s_%s.csv",
        req.StartDate.Format("20060102"),
        req.EndDate.Format("20060102"))

    ctx.Header("Content-Type", "text/csv")
    ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
    ctx.String(http.StatusOK, csv)
}

func (c *AdminController) generateTimeLogsCSV(timeLogs []models.TimeLog) string {
    var builder strings.Builder

    // Header
    builder.WriteString("ID,User Email,User Name,Task Title,Organization,Workspace,Start Time,End Time,Duration (seconds),Duration (formatted),Status,Is Approved,Notes\n")

    for _, tl := range timeLogs {
        userName := ""
        if tl.User.ID > 0 {
            userName = tl.User.FirstName + " " + tl.User.LastName
        }

        orgName := ""
        if tl.Organization != nil {
            orgName = tl.Organization.Name
        }

        wsName := ""
        if tl.Workspace != nil {
            wsName = tl.Workspace.Name
        }

        endTime := ""
        if tl.EndTime != nil {
            endTime = tl.EndTime.Format(time.RFC3339)
        }

        durationFormatted := formatDuration(tl.Duration)

        builder.WriteString(fmt.Sprintf("%d,%s,%s,%s,%s,%s,%s,%s,%d,%s,%s,%t,%s\n",
            tl.ID,
            tl.User.Email,
            userName,
            strings.ReplaceAll(tl.TaskTitle, ",", ";"),
            orgName,
            wsName,
            tl.StartTime.Format(time.RFC3339),
            endTime,
            tl.Duration,
            durationFormatted,
            tl.Status,
            tl.IsApproved,
            strings.ReplaceAll(tl.Notes, ",", ";"),
        ))
    }

    return builder.String()
}

func formatDuration(seconds int64) string {
    hours := seconds / 3600
    minutes := (seconds % 3600) / 60
    secs := seconds % 60
    return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
}
```

## Acceptance Criteria

- [ ] List time logs với pagination, filter hoạt động đúng
- [ ] Filter theo user_id, org_id, workspace_id, task_id hoạt động
- [ ] Filter theo date range và duration range hoạt động
- [ ] Filter theo is_approved hoạt động
- [ ] Get time log detail trả về đầy đủ thông tin
- [ ] Update time log hoạt động đúng
- [ ] Approve/Reject time log hoạt động đúng
- [ ] Export CSV và JSON hoạt động đúng
- [ ] Duration được format đúng trong export

## Dependencies

- TODO 07: Backend Admin Tasks API

## Estimated Time

- 4-5 giờ

## Testing

```bash
# List time logs
curl -X GET "http://localhost:8080/api/v1/admin/timelogs?user_id=1&is_approved=false" \
  -H "Authorization: Bearer <admin_token>"

# Get time log detail
curl -X GET "http://localhost:8080/api/v1/admin/timelogs/1" \
  -H "Authorization: Bearer <admin_token>"

# Approve time log
curl -X PUT "http://localhost:8080/api/v1/admin/timelogs/1/approve" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Approved by admin"}'

# Export time logs
curl -X GET "http://localhost:8080/api/v1/admin/timelogs/export?start_date=2024-01-01&end_date=2024-12-31&format=csv" \
  -H "Authorization: Bearer <admin_token>" \
  -o timelogs.csv
```
