# TODO 05: Backend Admin Organizations API

## Mục tiêu

Triển khai đầy đủ API quản lý organizations cho admin system.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                                     | Mô tả                                 |
| ------ | -------------------------------------------- | ------------------------------------- |
| GET    | `/api/v1/admin/organizations`                | Danh sách orgs với pagination, filter |
| GET    | `/api/v1/admin/organizations/:id`            | Chi tiết organization                 |
| PUT    | `/api/v1/admin/organizations/:id`            | Cập nhật organization                 |
| DELETE | `/api/v1/admin/organizations/:id`            | Xóa organization (soft delete)        |
| PUT    | `/api/v1/admin/organizations/:id/verify`     | Verify organization                   |
| GET    | `/api/v1/admin/organizations/:id/members`    | Danh sách members                     |
| GET    | `/api/v1/admin/organizations/:id/workspaces` | Danh sách workspaces                  |
| GET    | `/api/v1/admin/organizations/:id/stats`      | Thống kê organization                 |

### 2. Query Parameters cho List

```
GET /api/v1/admin/organizations?page=1&limit=20&search=company&is_active=true&is_verified=true&owner_id=1&sort_by=created_at&sort_order=desc
```

### 3. Response Format

```json
{
  "success": true,
  "data": {
    "organizations": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 5.1: Thêm Organization DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// ORGANIZATION ADMIN DTOs
// ============================================================================

type AdminOrgListRequest struct {
    Page       int    `form:"page" binding:"min=1"`
    Limit      int    `form:"limit" binding:"min=1,max=100"`
    Search     string `form:"search"`
    IsActive   *bool  `form:"is_active"`
    IsVerified *bool  `form:"is_verified"`
    OwnerID    *uint  `form:"owner_id"`
    SortBy     string `form:"sort_by"`
    SortOrder  string `form:"sort_order"`
}

type AdminOrgResponse struct {
    ID              uint       `json:"id"`
    Name            string     `json:"name"`
    Slug            string     `json:"slug"`
    Description     string     `json:"description"`
    LogoURL         string     `json:"logo_url"`
    OwnerID         uint       `json:"owner_id"`
    OwnerName       string     `json:"owner_name"`
    OwnerEmail      string     `json:"owner_email"`
    InviteCode      string     `json:"invite_code"`
    AllowInviteLink bool       `json:"allow_invite_link"`
    MaxMembers      int        `json:"max_members"`
    IsActive        bool       `json:"is_active"`
    IsVerified      bool       `json:"is_verified"`
    VerifiedAt      *time.Time `json:"verified_at"`
    AdminNotes      string     `json:"admin_notes"`
    CreatedAt       time.Time  `json:"created_at"`
    UpdatedAt       time.Time  `json:"updated_at"`
    MembersCount    int64      `json:"members_count"`
    WorkspacesCount int64      `json:"workspaces_count"`
    TasksCount      int64      `json:"tasks_count"`
    TimeLogsCount   int64      `json:"timelogs_count"`
    TotalDuration   int64      `json:"total_duration"`
}

type AdminOrgDetailResponse struct {
    AdminOrgResponse
    Members    []OrgMemberDetailResponse `json:"members"`
    Workspaces []WorkspaceResponse       `json:"workspaces"`
    Roles      []WorkspaceRoleResponse   `json:"roles"`
}

type OrgMemberDetailResponse struct {
    ID        uint      `json:"id"`
    UserID    uint      `json:"user_id"`
    Email     string    `json:"email"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    Role      string    `json:"role"`
    JoinedAt  time.Time `json:"joined_at"`
    IsActive  bool      `json:"is_active"`
}

type AdminUpdateOrgRequest struct {
    Name            *string `json:"name"`
    Description     *string `json:"description"`
    LogoURL         *string `json:"logo_url"`
    AllowInviteLink *bool   `json:"allow_invite_link"`
    MaxMembers      *int    `json:"max_members"`
    IsActive        *bool   `json:"is_active"`
    IsVerified      *bool   `json:"is_verified"`
    AdminNotes      *string `json:"admin_notes"`
}

type AdminOrgStatsResponse struct {
    TotalMembers         int64   `json:"total_members"`
    ActiveMembers        int64   `json:"active_members"`
    TotalWorkspaces      int64   `json:"total_workspaces"`
    ActiveWorkspaces     int64   `json:"active_workspaces"`
    TotalTasks           int64   `json:"total_tasks"`
    CompletedTasks       int64   `json:"completed_tasks"`
    TotalTimeLogs        int64   `json:"total_timelogs"`
    TotalDuration        int64   `json:"total_duration"`
    TotalScreenshots     int64   `json:"total_screenshots"`
    AvgDurationPerMember float64 `json:"avg_duration_per_member"`
    TopMembers           []MemberActivityStats `json:"top_members"`
}

type MemberActivityStats struct {
    UserID        uint   `json:"user_id"`
    Email         string `json:"email"`
    FirstName     string `json:"first_name"`
    LastName      string `json:"last_name"`
    TotalDuration int64  `json:"total_duration"`
    TasksCount    int64  `json:"tasks_count"`
}
```

### Task 5.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// Organizations
func (r *adminRepository) FindOrgsWithFilters(req *dto.AdminOrgListRequest) ([]models.Organization, int64, error) {
    var orgs []models.Organization
    var total int64

    query := r.db.Model(&models.Organization{}).
        Preload("Owner", func(db *gorm.DB) *gorm.DB {
            return db.Select("id, email, first_name, last_name")
        })

    // Apply filters
    if req.Search != "" {
        searchPattern := "%" + req.Search + "%"
        query = query.Where(
            "name ILIKE ? OR slug ILIKE ? OR description ILIKE ?",
            searchPattern, searchPattern, searchPattern,
        )
    }

    if req.IsActive != nil {
        query = query.Where("is_active = ?", *req.IsActive)
    }

    if req.IsVerified != nil {
        query = query.Where("is_verified = ?", *req.IsVerified)
    }

    if req.OwnerID != nil {
        query = query.Where("owner_id = ?", *req.OwnerID)
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

    if err := query.Find(&orgs).Error; err != nil {
        return nil, 0, err
    }

    return orgs, total, nil
}

func (r *adminRepository) GetOrgDetailWithStats(orgID uint) (*models.Organization, *dto.AdminOrgStatsResponse, error) {
    var org models.Organization
    if err := r.db.Preload("Owner").Preload("Members.User").Preload("Workspaces").Preload("Roles").
        First(&org, orgID).Error; err != nil {
        return nil, nil, err
    }

    stats := &dto.AdminOrgStatsResponse{}

    // Count members
    r.db.Model(&models.OrganizationMember{}).
        Where("organization_id = ?", orgID).
        Count(&stats.TotalMembers)

    r.db.Model(&models.OrganizationMember{}).
        Where("organization_id = ? AND is_active = true", orgID).
        Count(&stats.ActiveMembers)

    // Count workspaces
    r.db.Model(&models.Workspace{}).
        Where("organization_id = ?", orgID).
        Count(&stats.TotalWorkspaces)

    r.db.Model(&models.Workspace{}).
        Where("organization_id = ? AND is_active = true", orgID).
        Count(&stats.ActiveWorkspaces)

    // Count tasks
    r.db.Model(&models.Task{}).
        Where("organization_id = ?", orgID).
        Count(&stats.TotalTasks)

    r.db.Model(&models.Task{}).
        Where("organization_id = ? AND status = 'completed'", orgID).
        Count(&stats.CompletedTasks)

    // Count timelogs and duration
    r.db.Model(&models.TimeLog{}).
        Where("organization_id = ?", orgID).
        Count(&stats.TotalTimeLogs)

    var totalDuration struct{ Sum int64 }
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0) as sum").
        Where("organization_id = ?", orgID).
        Scan(&totalDuration)
    stats.TotalDuration = totalDuration.Sum

    // Count screenshots
    r.db.Model(&models.Screenshot{}).
        Where("organization_id = ?", orgID).
        Count(&stats.TotalScreenshots)

    // Calculate avg duration per member
    if stats.ActiveMembers > 0 {
        stats.AvgDurationPerMember = float64(stats.TotalDuration) / float64(stats.ActiveMembers)
    }

    // Get top members by duration
    var topMembers []dto.MemberActivityStats
    r.db.Table("users").
        Select(`
            users.id as user_id,
            users.email,
            users.first_name,
            users.last_name,
            COALESCE(SUM(time_logs.duration), 0) as total_duration,
            COUNT(DISTINCT tasks.id) as tasks_count
        `).
        Joins("JOIN organization_members ON organization_members.user_id = users.id").
        Joins("LEFT JOIN time_logs ON time_logs.user_id = users.id AND time_logs.organization_id = ?", orgID).
        Joins("LEFT JOIN tasks ON tasks.user_id = users.id AND tasks.organization_id = ?", orgID).
        Where("organization_members.organization_id = ?", orgID).
        Group("users.id, users.email, users.first_name, users.last_name").
        Order("total_duration DESC").
        Limit(10).
        Scan(&topMembers)
    stats.TopMembers = topMembers

    return &org, stats, nil
}

func (r *adminRepository) GetOrgMembers(orgID uint, page, limit int) ([]models.OrganizationMember, int64, error) {
    var members []models.OrganizationMember
    var total int64

    query := r.db.Model(&models.OrganizationMember{}).
        Preload("User").
        Where("organization_id = ?", orgID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Offset(offset).Limit(limit).Find(&members).Error; err != nil {
        return nil, 0, err
    }

    return members, total, nil
}

func (r *adminRepository) GetOrgWorkspaces(orgID uint, page, limit int) ([]models.Workspace, int64, error) {
    var workspaces []models.Workspace
    var total int64

    query := r.db.Model(&models.Workspace{}).
        Preload("Admin").
        Where("organization_id = ?", orgID)

    query.Count(&total)

    offset := (page - 1) * limit
    if err := query.Offset(offset).Limit(limit).Find(&workspaces).Error; err != nil {
        return nil, 0, err
    }

    return workspaces, total, nil
}
```

### Task 5.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

// ListOrganizations lists all organizations with filters
func (c *AdminController) ListOrganizations(ctx *gin.Context) {
    var req dto.AdminOrgListRequest
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

    orgs, total, err := c.adminRepo.FindOrgsWithFilters(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Convert to response with stats
    orgResponses := make([]dto.AdminOrgResponse, 0, len(orgs))
    for _, org := range orgs {
        orgResponses = append(orgResponses, c.toAdminOrgResponse(&org))
    }

    totalPages := int(total) / req.Limit
    if int(total)%req.Limit > 0 {
        totalPages++
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "organizations": orgResponses,
            "pagination": gin.H{
                "page":        req.Page,
                "limit":       req.Limit,
                "total":       total,
                "total_pages": totalPages,
            },
        },
    })
}

// GetOrganization gets organization detail
func (c *AdminController) GetOrganization(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    org, stats, err := c.adminRepo.GetOrgDetailWithStats(uint(orgID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
        return
    }

    response := c.toAdminOrgDetailResponse(org, stats)

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    response,
    })
}

// UpdateOrganization updates organization info
func (c *AdminController) UpdateOrganization(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    var req dto.AdminUpdateOrgRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    org, err := c.orgRepo.FindByID(uint(orgID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
        return
    }

    // Update fields
    if req.Name != nil {
        org.Name = *req.Name
    }
    if req.Description != nil {
        org.Description = *req.Description
    }
    if req.LogoURL != nil {
        org.LogoURL = *req.LogoURL
    }
    if req.AllowInviteLink != nil {
        org.AllowInviteLink = *req.AllowInviteLink
    }
    if req.MaxMembers != nil {
        org.MaxMembers = *req.MaxMembers
    }
    if req.IsActive != nil {
        org.IsActive = *req.IsActive
    }
    if req.IsVerified != nil {
        org.IsVerified = *req.IsVerified
        if *req.IsVerified {
            now := time.Now()
            org.VerifiedAt = &now
        }
    }
    if req.AdminNotes != nil {
        org.AdminNotes = *req.AdminNotes
    }

    if err := c.orgRepo.Update(org); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    c.toAdminOrgResponse(org),
    })
}

// DeleteOrganization soft deletes an organization
func (c *AdminController) DeleteOrganization(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    // Check if org has workspaces
    workspacesCount, _ := c.adminRepo.CountOrgWorkspaces(uint(orgID))
    if workspacesCount > 0 {
        ctx.JSON(http.StatusConflict, gin.H{
            "error": "Cannot delete organization with existing workspaces",
            "workspaces_count": workspacesCount,
        })
        return
    }

    if err := c.orgRepo.Delete(uint(orgID)); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Organization deleted successfully",
    })
}

// VerifyOrganization verifies an organization
func (c *AdminController) VerifyOrganization(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    org, err := c.orgRepo.FindByID(uint(orgID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
        return
    }

    now := time.Now()
    org.IsVerified = true
    org.VerifiedAt = &now

    // Get admin user for verified_by
    if adminUser, exists := ctx.Get("admin_user"); exists {
        if admin, ok := adminUser.(*models.User); ok {
            org.VerifiedBy = &admin.ID
        }
    }

    if err := c.orgRepo.Update(org); err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Organization verified successfully",
    })
}

// GetOrganizationMembers gets organization members
func (c *AdminController) GetOrganizationMembers(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

    members, total, err := c.adminRepo.GetOrgMembers(uint(orgID), page, limit)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "members": members,
            "total":   total,
            "page":    page,
            "limit":   limit,
        },
    })
}

// GetOrganizationStats gets organization statistics
func (c *AdminController) GetOrganizationStats(ctx *gin.Context) {
    orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
        return
    }

    _, stats, err := c.adminRepo.GetOrgDetailWithStats(uint(orgID))
    if err != nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}
```

## Acceptance Criteria

- [ ] List organizations với pagination, filter, search hoạt động đúng
- [ ] Get organization detail trả về đầy đủ thông tin và stats
- [ ] Update organization chỉ update fields được gửi
- [ ] Delete organization kiểm tra workspaces trước khi xóa
- [ ] Verify organization cập nhật đúng thông tin
- [ ] Members và workspaces endpoints hoạt động đúng
- [ ] Audit log ghi nhận tất cả actions

## Dependencies

- TODO 03: Backend Admin Middleware
- TODO 04: Backend Admin Users API

## Estimated Time

- 4-5 giờ

## Testing

```bash
# List organizations
curl -X GET "http://localhost:8080/api/v1/admin/organizations?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"

# Get organization detail
curl -X GET "http://localhost:8080/api/v1/admin/organizations/1" \
  -H "Authorization: Bearer <admin_token>"

# Update organization
curl -X PUT "http://localhost:8080/api/v1/admin/organizations/1" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"is_verified": true, "admin_notes": "Verified by admin"}'

# Verify organization
curl -X PUT "http://localhost:8080/api/v1/admin/organizations/1/verify" \
  -H "Authorization: Bearer <admin_token>"

# Get organization stats
curl -X GET "http://localhost:8080/api/v1/admin/organizations/1/stats" \
  -H "Authorization: Bearer <admin_token>"
```
