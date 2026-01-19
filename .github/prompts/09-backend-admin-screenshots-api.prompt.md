# TODO 09: Backend Admin Screenshots API

## Mục tiêu

Triển khai đầy đủ API quản lý screenshots cho admin system.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                                  | Mô tả                                        |
| ------ | ----------------------------------------- | -------------------------------------------- |
| GET    | `/api/v1/admin/screenshots`               | Danh sách screenshots với pagination, filter |
| GET    | `/api/v1/admin/screenshots/:id`           | Chi tiết screenshot                          |
| DELETE | `/api/v1/admin/screenshots/:id`           | Xóa screenshot                               |
| DELETE | `/api/v1/admin/screenshots/bulk`          | Xóa nhiều screenshots                        |
| GET    | `/api/v1/admin/screenshots/:id/download`  | Download screenshot file                     |
| GET    | `/api/v1/admin/screenshots/storage-stats` | Thống kê storage                             |

### 2. Query Parameters cho List

```
GET /api/v1/admin/screenshots?page=1&limit=20&user_id=1&org_id=1&workspace_id=1&task_id=1&timelog_id=1&start_date=2024-01-01&end_date=2024-12-31&min_size=0&max_size=5000000&sort_by=captured_at&sort_order=desc
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 9.1: Thêm Screenshot DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// SCREENSHOT ADMIN DTOs
// ============================================================================

type AdminScreenshotListRequest struct {
    Page        int        `form:"page" binding:"min=1"`
    Limit       int        `form:"limit" binding:"min=1,max=100"`
    UserID      *uint      `form:"user_id"`
    OrgID       *uint      `form:"org_id"`
    WorkspaceID *uint      `form:"workspace_id"`
    TaskID      *uint      `form:"task_id"`
    TimeLogID   *uint      `form:"timelog_id"`
    StartDate   *time.Time `form:"start_date" time_format:"2006-01-02"`
    EndDate     *time.Time `form:"end_date" time_format:"2006-01-02"`
    MinSize     *int64     `form:"min_size"` // bytes
    MaxSize     *int64     `form:"max_size"` // bytes
    ScreenNumber *int      `form:"screen_number"`
    SortBy      string     `form:"sort_by"`
    SortOrder   string     `form:"sort_order"`
}

type AdminScreenshotResponse struct {
    ID             uint       `json:"id"`
    LocalID        string     `json:"local_id"`
    UserID         uint       `json:"user_id"`
    UserEmail      string     `json:"user_email"`
    UserName       string     `json:"user_name"`
    TimeLogID      *uint      `json:"time_log_id"`
    TaskID         *uint      `json:"task_id"`
    TaskTitle      string     `json:"task_title"`
    TaskLocalID    string     `json:"task_local_id"`
    OrganizationID *uint      `json:"organization_id"`
    OrgName        string     `json:"org_name"`
    WorkspaceID    *uint      `json:"workspace_id"`
    WorkspaceName  string     `json:"workspace_name"`
    DeviceID       *uint      `json:"device_id"`
    DeviceName     string     `json:"device_name"`
    FileName       string     `json:"file_name"`
    FilePath       string     `json:"file_path"`
    FileSize       int64      `json:"file_size"`
    FileSizeHuman  string     `json:"file_size_human"`
    MimeType       string     `json:"mime_type"`
    CapturedAt     time.Time  `json:"captured_at"`
    ScreenNumber   int        `json:"screen_number"`
    IsEncrypted    bool       `json:"is_encrypted"`
    Checksum       string     `json:"checksum"`
    IsSynced       bool       `json:"is_synced"`
    CreatedAt      time.Time  `json:"created_at"`
    ThumbnailURL   string     `json:"thumbnail_url"`
    FullURL        string     `json:"full_url"`
}

type AdminBulkDeleteScreenshotsRequest struct {
    IDs []uint `json:"ids" binding:"required,min=1"`
}

type AdminStorageStatsResponse struct {
    TotalScreenshots    int64   `json:"total_screenshots"`
    TotalSize           int64   `json:"total_size"`
    TotalSizeHuman      string  `json:"total_size_human"`
    AvgSize             int64   `json:"avg_size"`
    AvgSizeHuman        string  `json:"avg_size_human"`
    LargestFile         int64   `json:"largest_file"`
    LargestFileHuman    string  `json:"largest_file_human"`
    StorageByOrg        []OrgStorageStats `json:"storage_by_org"`
    StorageByUser       []UserStorageStats `json:"storage_by_user"`
    StorageByMonth      []MonthlyStorageStats `json:"storage_by_month"`
}

type OrgStorageStats struct {
    OrgID       uint   `json:"org_id"`
    OrgName     string `json:"org_name"`
    Count       int64  `json:"count"`
    TotalSize   int64  `json:"total_size"`
    SizeHuman   string `json:"size_human"`
}

type UserStorageStats struct {
    UserID      uint   `json:"user_id"`
    Email       string `json:"email"`
    UserName    string `json:"user_name"`
    Count       int64  `json:"count"`
    TotalSize   int64  `json:"total_size"`
    SizeHuman   string `json:"size_human"`
}

type MonthlyStorageStats struct {
    Month       string `json:"month"` // YYYY-MM
    Count       int64  `json:"count"`
    TotalSize   int64  `json:"total_size"`
    SizeHuman   string `json:"size_human"`
}
```

### Task 9.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// Screenshots
func (r *adminRepository) FindScreenshotsWithFilters(req *dto.AdminScreenshotListRequest) ([]models.Screenshot, int64, error) {
    var screenshots []models.Screenshot
    var total int64

    query := r.db.Model(&models.Screenshot{}).
        Preload("User", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, email, first_name, last_name")
        }).
        Preload("Task", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, local_id, title")
        }).
        Preload("Organization", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        }).
        Preload("Workspace", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, name")
        }).
        Preload("Device", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, device_name")
        })

    // Apply filters
    if req.UserID != nil {
        query = query.Where("screenshots.user_id = ?", *req.UserID)
    }

    if req.OrgID != nil {
        query = query.Where("screenshots.organization_id = ?", *req.OrgID)
    }

    if req.WorkspaceID != nil {
        query = query.Where("screenshots.workspace_id = ?", *req.WorkspaceID)
    }

    if req.TaskID != nil {
        query = query.Where("screenshots.task_id = ?", *req.TaskID)
    }

    if req.TimeLogID != nil {
        query = query.Where("screenshots.time_log_id = ?", *req.TimeLogID)
    }

    if req.StartDate != nil {
        query = query.Where("screenshots.captured_at >= ?", *req.StartDate)
    }

    if req.EndDate != nil {
        endDate := req.EndDate.Add(24 * time.Hour)
        query = query.Where("screenshots.captured_at < ?", endDate)
    }

    if req.MinSize != nil {
        query = query.Where("screenshots.file_size >= ?", *req.MinSize)
    }

    if req.MaxSize != nil {
        query = query.Where("screenshots.file_size <= ?", *req.MaxSize)
    }

    if req.ScreenNumber != nil {
        query = query.Where("screenshots.screen_number = ?", *req.ScreenNumber)
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Apply sorting
    sortBy := "screenshots.captured_at"
    if req.SortBy != "" {
        sortBy = "screenshots." + req.SortBy
    }
    sortOrder := "DESC"
    if req.SortOrder == "asc" {
        sortOrder = "ASC"
    }
    query = query.Order(sortBy + " " + sortOrder)

    // Apply pagination
    offset := (req.Page - 1) * req.Limit
    query = query.Offset(offset).Limit(req.Limit)

    if err := query.Find(&screenshots).Error; err != nil {
        return nil, 0, err
    }

    return screenshots, total, nil
}

func (r *adminRepository) GetScreenshotDetail(screenshotID uint) (*models.Screenshot, error) {
    var screenshot models.Screenshot
    if err := r.db.
        Preload("User").
        Preload("Task").
        Preload("TimeLog").
        Preload("Organization").
        Preload("Workspace").
        Preload("Device").
        First(&screenshot, screenshotID).Error; err != nil {
        return nil, err
    }

    return &screenshot, nil
}

func (r *adminRepository) BulkDeleteScreenshots(ids []uint) (int64, error) {
    result := r.db.Delete(&models.Screenshot{}, ids)
    return result.RowsAffected, result.Error
}

func (r *adminRepository) GetStorageStats() (*dto.AdminStorageStatsResponse, error) {
    stats := &dto.AdminStorageStatsResponse{}

    // Total count and size
    r.db.Model(&models.Screenshot{}).Count(&stats.TotalScreenshots)

    var sizeStats struct {
        TotalSize   int64
        AvgSize     float64
        LargestFile int64
    }
    r.db.Model(&models.Screenshot{}).
        Select(`
            COALESCE(SUM(file_size), 0) as total_size,
            COALESCE(AVG(file_size), 0) as avg_size,
            COALESCE(MAX(file_size), 0) as largest_file
        `).
        Scan(&sizeStats)

    stats.TotalSize = sizeStats.TotalSize
    stats.TotalSizeHuman = humanizeBytes(sizeStats.TotalSize)
    stats.AvgSize = int64(sizeStats.AvgSize)
    stats.AvgSizeHuman = humanizeBytes(stats.AvgSize)
    stats.LargestFile = sizeStats.LargestFile
    stats.LargestFileHuman = humanizeBytes(sizeStats.LargestFile)

    // Storage by organization
    var orgStats []dto.OrgStorageStats
    r.db.Table("screenshots").
        Select(`
            organizations.id as org_id,
            organizations.name as org_name,
            COUNT(screenshots.id) as count,
            COALESCE(SUM(screenshots.file_size), 0) as total_size
        `).
        Joins("LEFT JOIN organizations ON organizations.id = screenshots.organization_id").
        Group("organizations.id, organizations.name").
        Order("total_size DESC").
        Limit(10).
        Scan(&orgStats)

    for i := range orgStats {
        orgStats[i].SizeHuman = humanizeBytes(orgStats[i].TotalSize)
    }
    stats.StorageByOrg = orgStats

    // Storage by user
    var userStats []dto.UserStorageStats
    r.db.Table("screenshots").
        Select(`
            users.id as user_id,
            users.email,
            CONCAT(users.first_name, ' ', users.last_name) as user_name,
            COUNT(screenshots.id) as count,
            COALESCE(SUM(screenshots.file_size), 0) as total_size
        `).
        Joins("LEFT JOIN users ON users.id = screenshots.user_id").
        Group("users.id, users.email, users.first_name, users.last_name").
        Order("total_size DESC").
        Limit(10).
        Scan(&userStats)

    for i := range userStats {
        userStats[i].SizeHuman = humanizeBytes(userStats[i].TotalSize)
    }
    stats.StorageByUser = userStats

    // Storage by month (last 12 months)
    var monthlyStats []dto.MonthlyStorageStats
    r.db.Table("screenshots").
        Select(`
            TO_CHAR(captured_at, 'YYYY-MM') as month,
            COUNT(id) as count,
            COALESCE(SUM(file_size), 0) as total_size
        `).
        Where("captured_at >= NOW() - INTERVAL '12 months'").
        Group("TO_CHAR(captured_at, 'YYYY-MM')").
        Order("month DESC").
        Scan(&monthlyStats)

    for i := range monthlyStats {
        monthlyStats[i].SizeHuman = humanizeBytes(monthlyStats[i].TotalSize)
    }
    stats.StorageByMonth = monthlyStats

    return stats, nil
}

func humanizeBytes(bytes int64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := int64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
```

### Task 9.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// SCREENSHOT MANAGEMENT
// ============================================================================

// ListScreenshots lists all screenshots with filters
func (c *AdminController) ListScreenshots(ctx *gin.Context) {
    var req dto.AdminScreenshotListRequest
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

    screenshots, total, err := c.adminRepo.FindScreenshotsWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    responses := make([]dto.AdminScreenshotResponse, 0, len(screenshots))
    for _, ss := range screenshots {
        responses = append(responses, c.toAdminScreenshotResponse(&ss))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "screenshots": responses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetScreenshot gets screenshot detail
func (c *AdminController) GetScreenshot(ctx *gin.Context) {
    screenshotID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid screenshot ID"})
        return
    }

    screenshot, err := c.adminRepo.GetScreenshotDetail(uint(screenshotID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Screenshot not found"})
        return
    }

    response := c.toAdminScreenshotResponse(screenshot)

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    response,
    })
}

// DeleteScreenshot deletes a screenshot
func (c *AdminController) DeleteScreenshot(ctx *gin.Context) {
    screenshotID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid screenshot ID"})
        return
    }

    // Get screenshot to delete file
    screenshot, err := c.adminRepo.GetScreenshotDetail(uint(screenshotID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Screenshot not found"})
        return
    }

    // Delete from database
    if err := c.screenshotRepo.Delete(uint(screenshotID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Delete file from storage (async, don't block response)
    go func() {
        os.Remove(screenshot.FilePath)
    }()

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Screenshot deleted successfully",
        "deleted_file": gin.H{
            "file_name": screenshot.FileName,
            "file_size": screenshot.FileSize,
        },
    })
}

// BulkDeleteScreenshots deletes multiple screenshots
func (c *AdminController) BulkDeleteScreenshots(ctx *gin.Context) {
    var req dto.AdminBulkDeleteScreenshotsRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if len(req.IDs) > 100 {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete more than 100 screenshots at once"})
        return
    }

    // Get file paths before deleting
    var screenshots []models.Screenshot
    c.db.Select("id, file_path, file_size").Where("id IN ?", req.IDs).Find(&screenshots)

    var totalSize int64
    for _, ss := range screenshots {
        totalSize += ss.FileSize
    }

    // Delete from database
    deleted, err := c.adminRepo.BulkDeleteScreenshots(req.IDs)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Delete files from storage (async)
    go func() {
        for _, ss := range screenshots {
            os.Remove(ss.FilePath)
        }
    }()

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": fmt.Sprintf("%d screenshots deleted successfully", deleted),
        "deleted_count": deleted,
        "freed_space": humanizeBytes(totalSize),
    })
}

// DownloadScreenshot downloads a screenshot file
func (c *AdminController) DownloadScreenshot(ctx *gin.Context) {
    screenshotID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid screenshot ID"})
        return
    }

    screenshot, err := c.adminRepo.GetScreenshotDetail(uint(screenshotID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Screenshot not found"})
        return
    }

    // Check if file exists
    if _, err := os.Stat(screenshot.FilePath); os.IsNotExist(err) {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Screenshot file not found"})
        return
    }

    ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", screenshot.FileName))
    ctx.Header("Content-Type", screenshot.MimeType)
    ctx.File(screenshot.FilePath)
}

// GetStorageStats gets storage statistics
func (c *AdminController) GetStorageStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetStorageStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

func (c *AdminController) toAdminScreenshotResponse(ss *models.Screenshot) dto.AdminScreenshotResponse {
    response := dto.AdminScreenshotResponse{
        ID:             ss.ID,
        LocalID:        ss.LocalID,
        UserID:         ss.UserID,
        TimeLogID:      ss.TimeLogID,
        TaskID:         ss.TaskID,
        TaskLocalID:    ss.TaskLocalID,
        OrganizationID: ss.OrganizationID,
        WorkspaceID:    ss.WorkspaceID,
        DeviceID:       ss.DeviceID,
        FileName:       ss.FileName,
        FilePath:       ss.FilePath,
        FileSize:       ss.FileSize,
        FileSizeHuman:  humanizeBytes(ss.FileSize),
        MimeType:       ss.MimeType,
        CapturedAt:     ss.CapturedAt,
        ScreenNumber:   ss.ScreenNumber,
        IsEncrypted:    ss.IsEncrypted,
        Checksum:       ss.Checksum,
        IsSynced:       ss.IsSynced,
        CreatedAt:      ss.CreatedAt,
    }

    if ss.User.ID > 0 {
        response.UserEmail = ss.User.Email
        response.UserName = ss.User.FirstName + " " + ss.User.LastName
    }

    if ss.Task != nil {
        response.TaskTitle = ss.Task.Title
    }

    if ss.Organization != nil {
        response.OrgName = ss.Organization.Name
    }

    if ss.Workspace != nil {
        response.WorkspaceName = ss.Workspace.Name
    }

    if ss.Device != nil {
        response.DeviceName = ss.Device.DeviceName
    }

    // Generate URLs
    response.ThumbnailURL = fmt.Sprintf("/api/v1/screenshots/%d/thumbnail", ss.ID)
    response.FullURL = fmt.Sprintf("/api/v1/screenshots/%d/file", ss.ID)

    return response
}
```

## Acceptance Criteria

- [ ] List screenshots với pagination, filter hoạt động đúng
- [ ] Filter theo user_id, org_id, workspace_id, task_id, timelog_id hoạt động
- [ ] Filter theo date range và size range hoạt động
- [ ] Get screenshot detail trả về đầy đủ thông tin
- [ ] Delete screenshot xóa cả file và record
- [ ] Bulk delete hoạt động đúng (max 100)
- [ ] Download screenshot hoạt động đúng
- [ ] Storage stats hiển thị đúng thông tin
- [ ] File size được humanize (KB, MB, GB)

## Dependencies

- TODO 08: Backend Admin TimeLogs API

## Estimated Time

- 3-4 giờ

## Testing

```bash
# List screenshots
curl -X GET "http://localhost:8080/api/v1/admin/screenshots?user_id=1&min_size=100000" \
  -H "Authorization: Bearer <admin_token>"

# Get storage stats
curl -X GET "http://localhost:8080/api/v1/admin/screenshots/storage-stats" \
  -H "Authorization: Bearer <admin_token>"

# Bulk delete
curl -X DELETE "http://localhost:8080/api/v1/admin/screenshots/bulk" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3]}'

# Download screenshot
curl -X GET "http://localhost:8080/api/v1/admin/screenshots/1/download" \
  -H "Authorization: Bearer <admin_token>" \
  -o screenshot.png
```
