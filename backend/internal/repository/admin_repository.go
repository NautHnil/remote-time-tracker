package repository

import (
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// AdminRepository handles admin data operations
type AdminRepository interface {
	// Users
	FindUsersWithFilters(params *dto.AdminUserListParams) ([]models.User, int64, error)
	GetUserStats(userID uint) (*UserStats, error)
	GetUserOrganizations(userID uint) ([]dto.AdminOrgMembershipResponse, error)
	GetUserWorkspaces(userID uint) ([]dto.AdminWorkspaceMembershipResponse, error)
	GetUserDevices(userID uint) ([]models.DeviceInfo, error)
	GetUserRecentTasks(userID uint, limit int) ([]models.Task, error)
	GetUserRecentTimeLogs(userID uint, limit int) ([]models.TimeLog, error)

	// Organizations
	FindOrgsWithFilters(params *dto.AdminOrgListParams) ([]models.Organization, int64, error)
	GetOrgStats(orgID uint) (*OrgStats, error)

	// Workspaces
	FindWorkspacesWithFilters(params *dto.AdminWorkspaceListParams) ([]models.Workspace, int64, error)
	GetWorkspaceStats(workspaceID uint) (*WorkspaceStats, error)

	// Tasks
	FindTasksWithFilters(params *dto.AdminTaskListParams) ([]models.Task, int64, error)
	GetTaskStats(taskID uint) (*TaskStats, error)

	// Time Logs
	FindTimeLogsWithFilters(params *dto.AdminTimeLogListParams) ([]models.TimeLog, int64, error)
	BulkApproveTimeLogs(ids []uint, approvedBy uint, approved bool) error

	// Screenshots
	FindScreenshotsWithFilters(params *dto.AdminScreenshotListParams) ([]models.Screenshot, int64, error)

	// Statistics
	GetOverviewStats() (*dto.AdminOverviewStats, error)
	GetTrendStats(period string, startDate, endDate time.Time) (*dto.AdminTrendStats, error)
	GetUserPerformanceStats(limit int) ([]dto.AdminUserPerformance, error)
	GetOrgDistributionStats() (*dto.AdminOrgStats, error)
	GetActivityStats() (*dto.AdminActivityStats, error)
}

// UserStats holds user statistics
type UserStats struct {
	OrgsCount       int64
	WorkspacesCount int64
	TasksCount      int64
	TimeLogsCount   int64
	TotalDuration   int64
}

// OrgStats holds organization statistics
type OrgStats struct {
	MemberCount    int64
	WorkspaceCount int64
}

// WorkspaceStats holds workspace statistics
type WorkspaceStats struct {
	MemberCount int64
	TaskCount   int64
}

// TaskStats holds task statistics
type TaskStats struct {
	TimeLogsCount   int64
	TotalDuration   int64
	ScreenshotCount int64
}

type adminRepository struct {
	db *gorm.DB
}

// NewAdminRepository creates a new admin repository
func NewAdminRepository(db *gorm.DB) AdminRepository {
	return &adminRepository{db: db}
}

// ============================================================================
// USER METHODS
// ============================================================================

func (r *adminRepository) FindUsersWithFilters(params *dto.AdminUserListParams) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.db.Model(&models.User{})

	// Apply filters
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where(
			"email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	if params.Role != "" {
		query = query.Where("role = ?", params.Role)
	}

	if params.SystemRole != "" {
		query = query.Where("system_role = ?", params.SystemRole)
	}

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	if params.OrgID != nil {
		query = query.Joins("JOIN organization_members ON organization_members.user_id = users.id").
			Where("organization_members.organization_id = ?", *params.OrgID)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	sortBy := "created_at"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order(sortBy + " " + sortOrder)

	// Apply pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *adminRepository) GetUserStats(userID uint) (*UserStats, error) {
	stats := &UserStats{}

	// Count organizations
	r.db.Model(&models.OrganizationMember{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Count(&stats.OrgsCount)

	// Count workspaces
	r.db.Model(&models.WorkspaceMember{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Count(&stats.WorkspacesCount)

	// Count tasks
	r.db.Model(&models.Task{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Count(&stats.TasksCount)

	// Count time logs and total duration
	var result struct {
		Count    int64
		Duration int64
	}
	r.db.Model(&models.TimeLog{}).
		Select("COUNT(*) as count, COALESCE(SUM(duration), 0) as duration").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Scan(&result)

	stats.TimeLogsCount = result.Count
	stats.TotalDuration = result.Duration

	return stats, nil
}

func (r *adminRepository) GetUserOrganizations(userID uint) ([]dto.AdminOrgMembershipResponse, error) {
	var memberships []dto.AdminOrgMembershipResponse

	r.db.Table("organization_members").
		Select(`
			organization_members.organization_id as org_id,
			organizations.name as org_name,
			organizations.slug as org_slug,
			organization_members.role,
			organization_members.joined_at,
			organization_members.is_active
		`).
		Joins("JOIN organizations ON organizations.id = organization_members.organization_id").
		Where("organization_members.user_id = ? AND organization_members.deleted_at IS NULL", userID).
		Scan(&memberships)

	return memberships, nil
}

func (r *adminRepository) GetUserWorkspaces(userID uint) ([]dto.AdminWorkspaceMembershipResponse, error) {
	var memberships []dto.AdminWorkspaceMembershipResponse

	r.db.Table("workspace_members").
		Select(`
			workspace_members.workspace_id,
			workspaces.name as workspace_name,
			organizations.id as org_id,
			organizations.name as org_name,
			workspace_members.role_name,
			workspace_members.is_admin,
			workspace_members.joined_at,
			workspace_members.is_active
		`).
		Joins("JOIN workspaces ON workspaces.id = workspace_members.workspace_id").
		Joins("JOIN organizations ON organizations.id = workspaces.organization_id").
		Where("workspace_members.user_id = ? AND workspace_members.deleted_at IS NULL", userID).
		Scan(&memberships)

	return memberships, nil
}

func (r *adminRepository) GetUserDevices(userID uint) ([]models.DeviceInfo, error) {
	var devices []models.DeviceInfo
	err := r.db.Where("user_id = ?", userID).
		Order("last_seen_at DESC").
		Find(&devices).Error
	return devices, err
}

func (r *adminRepository) GetUserRecentTasks(userID uint, limit int) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&tasks).Error
	return tasks, err
}

func (r *adminRepository) GetUserRecentTimeLogs(userID uint, limit int) ([]models.TimeLog, error) {
	var timeLogs []models.TimeLog
	err := r.db.Where("user_id = ?", userID).
		Order("start_time DESC").
		Limit(limit).
		Find(&timeLogs).Error
	return timeLogs, err
}

// ============================================================================
// ORGANIZATION METHODS
// ============================================================================

func (r *adminRepository) FindOrgsWithFilters(params *dto.AdminOrgListParams) ([]models.Organization, int64, error) {
	var orgs []models.Organization
	var total int64

	query := r.db.Model(&models.Organization{}).Preload("Owner")

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR slug ILIKE ?", searchPattern, searchPattern)
	}

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	if params.IsVerified != nil {
		query = query.Where("is_verified = ?", *params.IsVerified)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order(sortBy + " " + sortOrder)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&orgs).Error; err != nil {
		return nil, 0, err
	}

	return orgs, total, nil
}

func (r *adminRepository) GetOrgStats(orgID uint) (*OrgStats, error) {
	stats := &OrgStats{}

	r.db.Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND deleted_at IS NULL", orgID).
		Count(&stats.MemberCount)

	r.db.Model(&models.Workspace{}).
		Where("organization_id = ? AND deleted_at IS NULL", orgID).
		Count(&stats.WorkspaceCount)

	return stats, nil
}

// ============================================================================
// WORKSPACE METHODS
// ============================================================================

func (r *adminRepository) FindWorkspacesWithFilters(params *dto.AdminWorkspaceListParams) ([]models.Workspace, int64, error) {
	var workspaces []models.Workspace
	var total int64

	query := r.db.Model(&models.Workspace{}).Preload("Organization").Preload("Admin")

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("workspaces.name ILIKE ? OR workspaces.slug ILIKE ?", searchPattern, searchPattern)
	}

	if params.OrgID != nil {
		query = query.Where("organization_id = ?", *params.OrgID)
	}

	if params.IsActive != nil {
		query = query.Where("workspaces.is_active = ?", *params.IsActive)
	}

	if params.IsArchived != nil {
		query = query.Where("is_archived = ?", *params.IsArchived)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order("workspaces." + sortBy + " " + sortOrder)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&workspaces).Error; err != nil {
		return nil, 0, err
	}

	return workspaces, total, nil
}

func (r *adminRepository) GetWorkspaceStats(workspaceID uint) (*WorkspaceStats, error) {
	stats := &WorkspaceStats{}

	r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Count(&stats.MemberCount)

	r.db.Model(&models.Task{}).
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Count(&stats.TaskCount)

	return stats, nil
}

// ============================================================================
// TASK METHODS
// ============================================================================

func (r *adminRepository) FindTasksWithFilters(params *dto.AdminTaskListParams) ([]models.Task, int64, error) {
	var tasks []models.Task
	var total int64

	query := r.db.Model(&models.Task{}).Preload("User").Preload("Organization").Preload("Workspace")

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("tasks.title ILIKE ? OR tasks.description ILIKE ?", searchPattern, searchPattern)
	}

	if params.UserID != nil {
		query = query.Where("tasks.user_id = ?", *params.UserID)
	}

	if params.OrgID != nil {
		query = query.Where("organization_id = ?", *params.OrgID)
	}

	if params.WorkspaceID != nil {
		query = query.Where("workspace_id = ?", *params.WorkspaceID)
	}

	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	if params.IsManual != nil {
		query = query.Where("is_manual = ?", *params.IsManual)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "created_at"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order("tasks." + sortBy + " " + sortOrder)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&tasks).Error; err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

func (r *adminRepository) GetTaskStats(taskID uint) (*TaskStats, error) {
	stats := &TaskStats{}

	var result struct {
		Count    int64
		Duration int64
	}
	r.db.Model(&models.TimeLog{}).
		Select("COUNT(*) as count, COALESCE(SUM(duration), 0) as duration").
		Where("task_id = ? AND deleted_at IS NULL", taskID).
		Scan(&result)

	stats.TimeLogsCount = result.Count
	stats.TotalDuration = result.Duration

	r.db.Model(&models.Screenshot{}).
		Where("task_id = ? AND deleted_at IS NULL", taskID).
		Count(&stats.ScreenshotCount)

	return stats, nil
}

// ============================================================================
// TIMELOG METHODS
// ============================================================================

func (r *adminRepository) FindTimeLogsWithFilters(params *dto.AdminTimeLogListParams) ([]models.TimeLog, int64, error) {
	var timeLogs []models.TimeLog
	var total int64

	query := r.db.Model(&models.TimeLog{}).Preload("User").Preload("Task").Preload("Organization").Preload("Workspace")

	if params.UserID != nil {
		query = query.Where("time_logs.user_id = ?", *params.UserID)
	}

	if params.OrgID != nil {
		query = query.Where("time_logs.organization_id = ?", *params.OrgID)
	}

	if params.WorkspaceID != nil {
		query = query.Where("time_logs.workspace_id = ?", *params.WorkspaceID)
	}

	if params.TaskID != nil {
		query = query.Where("task_id = ?", *params.TaskID)
	}

	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	if params.IsApproved != nil {
		query = query.Where("is_approved = ?", *params.IsApproved)
	}

	if params.StartDate != nil {
		query = query.Where("start_time >= ?", *params.StartDate)
	}

	if params.EndDate != nil {
		query = query.Where("start_time <= ?", *params.EndDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "start_time"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order("time_logs." + sortBy + " " + sortOrder)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&timeLogs).Error; err != nil {
		return nil, 0, err
	}

	return timeLogs, total, nil
}

func (r *adminRepository) BulkApproveTimeLogs(ids []uint, approvedBy uint, approved bool) error {
	now := time.Now()
	updates := map[string]interface{}{
		"is_approved": approved,
		"updated_at":  now,
	}

	if approved {
		updates["approved_by"] = approvedBy
		updates["approved_at"] = now
	} else {
		updates["approved_by"] = nil
		updates["approved_at"] = nil
	}

	return r.db.Model(&models.TimeLog{}).
		Where("id IN ?", ids).
		Updates(updates).Error
}

// ============================================================================
// SCREENSHOT METHODS
// ============================================================================

func (r *adminRepository) FindScreenshotsWithFilters(params *dto.AdminScreenshotListParams) ([]models.Screenshot, int64, error) {
	var screenshots []models.Screenshot
	var total int64

	query := r.db.Model(&models.Screenshot{}).Preload("User").Preload("Task").Preload("Organization").Preload("Workspace")

	if params.UserID != nil {
		query = query.Where("screenshots.user_id = ?", *params.UserID)
	}

	if params.OrgID != nil {
		query = query.Where("screenshots.organization_id = ?", *params.OrgID)
	}

	if params.WorkspaceID != nil {
		query = query.Where("screenshots.workspace_id = ?", *params.WorkspaceID)
	}

	if params.TaskID != nil {
		query = query.Where("task_id = ?", *params.TaskID)
	}

	if params.TimeLogID != nil {
		query = query.Where("time_log_id = ?", *params.TimeLogID)
	}

	if params.StartDate != nil {
		query = query.Where("captured_at >= ?", *params.StartDate)
	}

	if params.EndDate != nil {
		query = query.Where("captured_at <= ?", *params.EndDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := "captured_at"
	if params.SortBy != "" {
		sortBy = params.SortBy
	}
	sortOrder := "DESC"
	if params.SortOrder == "asc" {
		sortOrder = "ASC"
	}
	query = query.Order("screenshots." + sortBy + " " + sortOrder)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	if err := query.Find(&screenshots).Error; err != nil {
		return nil, 0, err
	}

	return screenshots, total, nil
}

// ============================================================================
// STATISTICS METHODS
// ============================================================================

func (r *adminRepository) GetOverviewStats() (*dto.AdminOverviewStats, error) {
	stats := &dto.AdminOverviewStats{}

	// Users
	r.db.Model(&models.User{}).Count(&stats.TotalUsers)
	r.db.Model(&models.User{}).Where("is_active = true").Count(&stats.ActiveUsers)

	weekAgo := time.Now().AddDate(0, 0, -7)
	r.db.Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&stats.NewUsersThisWeek)

	// Organizations
	r.db.Model(&models.Organization{}).Count(&stats.TotalOrganizations)
	r.db.Model(&models.Organization{}).Where("is_verified = true").Count(&stats.VerifiedOrganizations)

	// Workspaces
	r.db.Model(&models.Workspace{}).Count(&stats.TotalWorkspaces)
	r.db.Model(&models.Workspace{}).Where("is_active = true AND is_archived = false").Count(&stats.ActiveWorkspaces)

	// Tasks
	r.db.Model(&models.Task{}).Count(&stats.TotalTasks)
	r.db.Model(&models.Task{}).Where("status = 'active'").Count(&stats.ActiveTasks)

	// Time Logs
	var timeLogStats struct {
		Count         int64
		TotalDuration int64
		WeekDuration  int64
	}
	r.db.Model(&models.TimeLog{}).
		Select("COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration").
		Scan(&timeLogStats)
	stats.TotalTimeLogs = timeLogStats.Count
	stats.TotalDuration = timeLogStats.TotalDuration

	r.db.Model(&models.TimeLog{}).
		Select("COALESCE(SUM(duration), 0)").
		Where("start_time >= ?", weekAgo).
		Scan(&stats.WeekDuration)

	// Screenshots
	var screenshotStats struct {
		Count     int64
		TotalSize int64
	}
	r.db.Model(&models.Screenshot{}).
		Select("COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size").
		Scan(&screenshotStats)
	stats.TotalScreenshots = screenshotStats.Count
	stats.TotalStorage = screenshotStats.TotalSize
	stats.TotalStorageHuman = formatBytes(screenshotStats.TotalSize)

	return stats, nil
}

func (r *adminRepository) GetTrendStats(period string, startDate, endDate time.Time) (*dto.AdminTrendStats, error) {
	stats := &dto.AdminTrendStats{
		UserGrowth:    []dto.AdminDailyStat{},
		ActivityTrend: []dto.AdminDailyStat{},
	}

	// Get daily user growth
	rows, err := r.db.Raw(`
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as new_users,
			(SELECT COUNT(*) FROM users WHERE DATE(created_at) <= dates.date) as total_users
		FROM users
		WHERE created_at BETWEEN ? AND ?
		GROUP BY DATE(created_at)
		ORDER BY date
	`, startDate, endDate).Rows()
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stat dto.AdminDailyStat
			rows.Scan(&stat.Date, &stat.NewUsers, &stat.TotalUsers)
			stats.UserGrowth = append(stats.UserGrowth, stat)
		}
	}

	// Get daily activity trend
	activityRows, err := r.db.Raw(`
		SELECT 
			DATE(start_time) as date,
			COALESCE(SUM(duration), 0) as duration,
			COUNT(*) as timelogs,
			(SELECT COUNT(*) FROM screenshots WHERE DATE(captured_at) = DATE(time_logs.start_time)) as screenshots
		FROM time_logs
		WHERE start_time BETWEEN ? AND ?
		GROUP BY DATE(start_time)
		ORDER BY date
	`, startDate, endDate).Rows()
	if err == nil {
		defer activityRows.Close()
		for activityRows.Next() {
			var stat dto.AdminDailyStat
			activityRows.Scan(&stat.Date, &stat.Duration, &stat.TimeLogs, &stat.Screenshots)
			stats.ActivityTrend = append(stats.ActivityTrend, stat)
		}
	}

	return stats, nil
}

func (r *adminRepository) GetUserPerformanceStats(limit int) ([]dto.AdminUserPerformance, error) {
	var performers []dto.AdminUserPerformance

	r.db.Raw(`
		SELECT 
			users.id as user_id,
			CONCAT(users.first_name, ' ', users.last_name) as user_name,
			users.email,
			COALESCE(SUM(time_logs.duration), 0) as total_duration,
			COUNT(DISTINCT tasks.id) as task_count,
			ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(time_logs.duration), 0) DESC) as rank
		FROM users
		LEFT JOIN time_logs ON time_logs.user_id = users.id
		LEFT JOIN tasks ON tasks.user_id = users.id
		WHERE users.deleted_at IS NULL
		GROUP BY users.id, users.first_name, users.last_name, users.email
		ORDER BY total_duration DESC
		LIMIT ?
	`, limit).Scan(&performers)

	return performers, nil
}

func (r *adminRepository) GetOrgDistributionStats() (*dto.AdminOrgStats, error) {
	stats := &dto.AdminOrgStats{
		SizeDistribution: []dto.AdminOrgSizeCategory{},
		TopWorkspaces:    []dto.AdminTopWorkspace{},
	}

	// Size distribution
	r.db.Raw(`
		SELECT 
			CASE 
				WHEN member_count <= 10 THEN 'small'
				WHEN member_count <= 50 THEN 'medium'
				ELSE 'large'
			END as category,
			COUNT(*) as count
		FROM (
			SELECT organizations.id, COUNT(organization_members.id) as member_count
			FROM organizations
			LEFT JOIN organization_members ON organization_members.organization_id = organizations.id
			WHERE organizations.deleted_at IS NULL
			GROUP BY organizations.id
		) org_sizes
		GROUP BY category
	`).Scan(&stats.SizeDistribution)

	// Top workspaces
	r.db.Raw(`
		SELECT 
			workspaces.id as workspace_id,
			workspaces.name,
			organizations.name as organization_name,
			COALESCE(SUM(time_logs.duration), 0) as total_duration,
			COUNT(DISTINCT workspace_members.user_id) as member_count
		FROM workspaces
		JOIN organizations ON organizations.id = workspaces.organization_id
		LEFT JOIN time_logs ON time_logs.workspace_id = workspaces.id
		LEFT JOIN workspace_members ON workspace_members.workspace_id = workspaces.id
		WHERE workspaces.deleted_at IS NULL
		GROUP BY workspaces.id, workspaces.name, organizations.name
		ORDER BY total_duration DESC
		LIMIT 10
	`).Scan(&stats.TopWorkspaces)

	return stats, nil
}

func (r *adminRepository) GetActivityStats() (*dto.AdminActivityStats, error) {
	stats := &dto.AdminActivityStats{
		ActivityByHour: make([]dto.AdminHourlyStat, 24),
	}

	today := time.Now().Truncate(24 * time.Hour)

	// Today's stats
	r.db.Model(&models.TimeLog{}).
		Select("COALESCE(SUM(duration), 0)").
		Where("start_time >= ?", today).
		Scan(&stats.TodayDuration)

	r.db.Model(&models.TimeLog{}).
		Select("COUNT(DISTINCT user_id)").
		Where("start_time >= ?", today).
		Scan(&stats.TodayActiveUsers)

	r.db.Model(&models.Screenshot{}).
		Where("captured_at >= ?", today).
		Count(&stats.TodayScreenshots)

	// Activity by hour
	for i := 0; i < 24; i++ {
		stats.ActivityByHour[i] = dto.AdminHourlyStat{Hour: i}
	}

	var hourlyStats []struct {
		Hour  int
		Count int64
	}
	r.db.Raw(`
		SELECT EXTRACT(HOUR FROM start_time) as hour, COUNT(*) as count
		FROM time_logs
		WHERE start_time >= ?
		GROUP BY EXTRACT(HOUR FROM start_time)
	`, today.AddDate(0, 0, -7)).Scan(&hourlyStats)

	for _, h := range hourlyStats {
		if h.Hour >= 0 && h.Hour < 24 {
			stats.ActivityByHour[h.Hour].Count = h.Count
			if h.Count > stats.PeakHourCount {
				stats.PeakHour = h.Hour
				stats.PeakHourCount = h.Count
			}
		}
	}

	return stats, nil
}

// Helper function to format bytes
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return string(rune(bytes)) + " B"
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return string(rune(bytes/div)) + " " + string("KMGTPE"[exp]) + "B"
}
