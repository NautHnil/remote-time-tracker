package dto

import "time"

// ============================================================================
// ADMIN USER DTOs
// ============================================================================

// AdminUserListParams represents query parameters for listing users
type AdminUserListParams struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
	Search     string `form:"search"`
	Role       string `form:"role"`
	SystemRole string `form:"system_role"`
	IsActive   *bool  `form:"is_active"`
	OrgID      *uint  `form:"org_id"`
	SortBy     string `form:"sort_by"`
	SortOrder  string `form:"sort_order"`
}

// AdminUserResponse represents a user in admin responses
type AdminUserResponse struct {
	ID              uint       `json:"id"`
	Email           string     `json:"email"`
	FirstName       string     `json:"first_name"`
	LastName        string     `json:"last_name"`
	Role            string     `json:"role"`
	SystemRole      string     `json:"system_role"`
	IsActive        bool       `json:"is_active"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	PresenceStatus  string     `json:"presence_status"`
	LastPresenceAt  *time.Time `json:"last_presence_at"`
	LastWorkingAt   *time.Time `json:"last_working_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	OrgsCount       int64      `json:"orgs_count"`
	WorkspacesCount int64      `json:"workspaces_count"`
	TasksCount      int64      `json:"tasks_count"`
	TimeLogsCount   int64      `json:"timelogs_count"`
	TotalDuration   int64      `json:"total_duration"` // seconds
}

// AdminUserDetailResponse represents detailed user info for admin
type AdminUserDetailResponse struct {
	AdminUserResponse
	Organizations  []AdminOrgMembershipResponse       `json:"organizations"`
	Workspaces     []AdminWorkspaceMembershipResponse `json:"workspaces"`
	RecentTasks    []AdminTaskResponse                `json:"recent_tasks"`
	RecentTimeLogs []AdminTimeLogResponse             `json:"recent_timelogs"`
	Devices        []AdminDeviceResponse              `json:"devices"`
}

// AdminUserListResponse represents user list response
type AdminUserListResponse struct {
	Users      []AdminUserResponse     `json:"users"`
	Pagination AdminPaginationResponse `json:"pagination"`
}

// AdminCreateUserRequest represents admin request to create user
type AdminCreateUserRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=8"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name" binding:"required"`
	Role       string `json:"role"`
	SystemRole string `json:"system_role"`
	IsActive   *bool  `json:"is_active"`
}

// AdminUpdateUserRequest represents admin request to update user
type AdminUpdateUserRequest struct {
	Email      string `json:"email" binding:"omitempty,email"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Role       string `json:"role"`
	SystemRole string `json:"system_role"`
	IsActive   *bool  `json:"is_active"`
	Password   string `json:"password" binding:"omitempty,min=8"`
}

// AdminChangeRoleRequest represents request to change user role
type AdminChangeRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// AdminChangeSystemRoleRequest represents request to change user system role
type AdminChangeSystemRoleRequest struct {
	SystemRole string `json:"system_role" binding:"required"`
}

// AdminActivateUserRequest represents request to activate/deactivate user
type AdminActivateUserRequest struct {
	Active bool `json:"active"`
}

// AdminOrgMembershipResponse represents user's organization membership
type AdminOrgMembershipResponse struct {
	OrgID    uint      `json:"org_id"`
	OrgName  string    `json:"org_name"`
	OrgSlug  string    `json:"org_slug"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
	IsActive bool      `json:"is_active"`
}

// AdminWorkspaceMembershipResponse represents user's workspace membership
type AdminWorkspaceMembershipResponse struct {
	WorkspaceID   uint      `json:"workspace_id"`
	WorkspaceName string    `json:"workspace_name"`
	OrgID         uint      `json:"org_id"`
	OrgName       string    `json:"org_name"`
	RoleName      string    `json:"role_name"`
	IsAdmin       bool      `json:"is_admin"`
	JoinedAt      time.Time `json:"joined_at"`
	IsActive      bool      `json:"is_active"`
}

// AdminDeviceResponse represents device info for admin
type AdminDeviceResponse struct {
	ID         uint       `json:"id"`
	DeviceUUID string     `json:"device_uuid"`
	DeviceName string     `json:"device_name"`
	DeviceType string     `json:"device_type"`
	OS         string     `json:"os"`
	OSVersion  string     `json:"os_version"`
	AppVersion string     `json:"app_version"`
	IPAddress  string     `json:"ip_address"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	IsActive   bool       `json:"is_active"`
}

// AdminTaskSummary represents task summary for admin
type AdminTaskSummary struct {
	ID        uint      `json:"id"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	IsManual  bool      `json:"is_manual"`
	CreatedAt time.Time `json:"created_at"`
}

// AdminTimeLogSummary represents time log summary for admin
type AdminTimeLogSummary struct {
	ID        uint       `json:"id"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time"`
	Duration  int64      `json:"duration"`
	Status    string     `json:"status"`
	TaskTitle string     `json:"task_title"`
}

// ============================================================================
// ADMIN ORGANIZATION DTOs
// ============================================================================

// AdminOrgListParams represents query parameters for listing organizations
type AdminOrgListParams struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
	Search     string `form:"search"`
	UserID     *uint  `form:"user_id"`
	IsActive   *bool  `form:"is_active"`
	IsVerified *bool  `form:"is_verified"`
	SortBy     string `form:"sort_by"`
	SortOrder  string `form:"sort_order"`
}

// AdminOrgResponse represents an organization in admin responses
type AdminOrgResponse struct {
	ID              uint       `json:"id"`
	Name            string     `json:"name"`
	Slug            string     `json:"slug"`
	Description     string     `json:"description"`
	OwnerID         uint       `json:"owner_id"`
	OwnerEmail      string     `json:"owner_email"`
	OwnerName       string     `json:"owner_name"`
	MemberCount     int64      `json:"member_count"`
	WorkspaceCount  int64      `json:"workspace_count"`
	IsActive        bool       `json:"is_active"`
	IsVerified      bool       `json:"is_verified"`
	VerifiedAt      *time.Time `json:"verified_at"`
	AdminNotes      string     `json:"admin_notes"`
	AllowInviteLink bool       `json:"allow_invite_link"`
	MaxMembers      int        `json:"max_members"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// AdminOrgListResponse represents organization list response
type AdminOrgListResponse struct {
	Organizations []AdminOrgResponse      `json:"organizations"`
	Pagination    AdminPaginationResponse `json:"pagination"`
}

// AdminOrgDetailResponse represents detailed organization info
type AdminOrgDetailResponse struct {
	AdminOrgResponse
	Members    []AdminOrgMemberResponse `json:"members"`
	Workspaces []AdminWorkspaceSummary  `json:"workspaces"`
}

// AdminOrgMemberResponse represents organization member
type AdminOrgMemberResponse struct {
	UserID    uint      `json:"user_id"`
	UserEmail string    `json:"user_email"`
	UserName  string    `json:"user_name"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
	IsActive  bool      `json:"is_active"`
}

// AdminWorkspaceSummary represents workspace summary
type AdminWorkspaceSummary struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// AdminUpdateOrgRequest represents admin request to update organization
type AdminUpdateOrgRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	IsActive        *bool  `json:"is_active"`
	AdminNotes      string `json:"admin_notes"`
	AllowInviteLink *bool  `json:"allow_invite_link"`
	MaxMembers      *int   `json:"max_members"`
}

// AdminVerifyOrgRequest represents request to verify organization
type AdminVerifyOrgRequest struct {
	Verified bool `json:"verified"`
}

// ============================================================================
// ADMIN WORKSPACE DTOs
// ============================================================================

// AdminWorkspaceListParams represents query parameters for listing workspaces
type AdminWorkspaceListParams struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
	Search     string `form:"search"`
	UserID     *uint  `form:"user_id"`
	OrgID      *uint  `form:"org_id"`
	IsActive   *bool  `form:"is_active"`
	IsArchived *bool  `form:"is_archived"`
	SortBy     string `form:"sort_by"`
	SortOrder  string `form:"sort_order"`
}

// AdminWorkspaceResponse represents a workspace in admin responses
type AdminWorkspaceResponse struct {
	ID          uint       `json:"id"`
	Name        string     `json:"name"`
	Slug        string     `json:"slug"`
	Description string     `json:"description"`
	OrgID       uint       `json:"organization_id"`
	OrgName     string     `json:"org_name"`
	AdminID     uint       `json:"admin_id"`
	AdminEmail  string     `json:"admin_email"`
	AdminName   string     `json:"admin_name"`
	MemberCount int64      `json:"member_count"`
	TaskCount   int64      `json:"task_count"`
	IsActive    bool       `json:"is_active"`
	IsArchived  bool       `json:"is_archived"`
	ArchivedAt  *time.Time `json:"archived_at"`
	IsBillable  bool       `json:"is_billable"`
	HourlyRate  float64    `json:"hourly_rate"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AdminWorkspaceListResponse represents workspace list response
type AdminWorkspaceListResponse struct {
	Workspaces []AdminWorkspaceResponse `json:"workspaces"`
	Pagination AdminPaginationResponse  `json:"pagination"`
}

// AdminWorkspaceDetailResponse represents detailed workspace info
type AdminWorkspaceDetailResponse struct {
	AdminWorkspaceResponse
	Members     []AdminWorkspaceMemberResponse `json:"members"`
	RecentTasks []AdminTaskResponse            `json:"recent_tasks"`
}

// AdminWorkspaceMemberResponse represents workspace member
type AdminWorkspaceMemberResponse struct {
	UserID    uint      `json:"user_id"`
	UserEmail string    `json:"user_email"`
	UserName  string    `json:"user_name"`
	RoleName  string    `json:"role_name"`
	IsAdmin   bool      `json:"is_admin"`
	JoinedAt  time.Time `json:"joined_at"`
	IsActive  bool      `json:"is_active"`
}

// AdminUpdateWorkspaceRequest represents admin request to update workspace
type AdminUpdateWorkspaceRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	IsActive    *bool    `json:"is_active"`
	IsBillable  *bool    `json:"is_billable"`
	HourlyRate  *float64 `json:"hourly_rate"`
}

// AdminArchiveWorkspaceRequest represents request to archive workspace
type AdminArchiveWorkspaceRequest struct {
	Archived bool `json:"archived"`
}

// ============================================================================
// ADMIN TASK DTOs
// ============================================================================

// AdminTaskListParams represents query parameters for listing tasks
type AdminTaskListParams struct {
	Page        int    `form:"page"`
	PageSize    int    `form:"page_size"`
	Search      string `form:"search"`
	UserID      *uint  `form:"user_id"`
	OrgID       *uint  `form:"org_id"`
	WorkspaceID *uint  `form:"workspace_id"`
	Status      string `form:"status"`
	IsManual    *bool  `form:"is_manual"`
	SortBy      string `form:"sort_by"`
	SortOrder   string `form:"sort_order"`
}

// AdminTaskResponse represents a task in admin responses
type AdminTaskResponse struct {
	ID              uint       `json:"id"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	UserID          uint       `json:"user_id"`
	UserEmail       string     `json:"user_email"`
	UserName        string     `json:"user_name"`
	OrgID           *uint      `json:"organization_id"`
	OrgName         string     `json:"org_name"`
	WorkspaceID     *uint      `json:"workspace_id"`
	WorkspaceName   string     `json:"workspace_name"`
	Status          string     `json:"status"`
	Priority        int        `json:"priority"`
	Color           string     `json:"color"`
	IsManual        bool       `json:"is_manual"`
	AdminNotes      string     `json:"admin_notes"`
	StartTime       *time.Time `json:"start_time"`
	EndTime         *time.Time `json:"end_time"`
	TotalTime       int64      `json:"total_time"`
	TimeLogsCount   int64      `json:"timelogs_count"`
	TotalDuration   int64      `json:"total_duration"`
	ScreenshotCount int64      `json:"screenshot_count"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// AdminTaskListResponse represents task list response
type AdminTaskListResponse struct {
	Tasks      []AdminTaskResponse     `json:"tasks"`
	Pagination AdminPaginationResponse `json:"pagination"`
}

// AdminTaskDetailResponse represents detailed task info
type AdminTaskDetailResponse struct {
	AdminTaskResponse
	TimeLogsCount   int64                     `json:"timelogs_count"`
	TotalDuration   int64                     `json:"total_duration"`
	ScreenshotCount int64                     `json:"screenshot_count"`
	TimeLogs        []AdminTimeLogResponse    `json:"timelogs"`
	Screenshots     []AdminScreenshotResponse `json:"screenshots"`
}

// AdminUpdateTaskRequest represents admin request to update task
type AdminUpdateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    *int   `json:"priority"`
	AdminNotes  string `json:"admin_notes"`
}

// ============================================================================
// ADMIN TIMELOG DTOs
// ============================================================================

// AdminTimeLogListParams represents query parameters for listing time logs
type AdminTimeLogListParams struct {
	Page        int        `form:"page"`
	PageSize    int        `form:"page_size"`
	UserID      *uint      `form:"user_id"`
	OrgID       *uint      `form:"org_id"`
	WorkspaceID *uint      `form:"workspace_id"`
	TaskID      *uint      `form:"task_id"`
	Status      string     `form:"status"`
	IsApproved  *bool      `form:"is_approved"`
	StartDate   *time.Time `form:"start_date"`
	EndDate     *time.Time `form:"end_date"`
	SortBy      string     `form:"sort_by"`
	SortOrder   string     `form:"sort_order"`
}

// AdminTimeLogResponse represents a time log in admin responses
type AdminTimeLogResponse struct {
	ID              uint       `json:"id"`
	UserID          uint       `json:"user_id"`
	UserEmail       string     `json:"user_email"`
	UserName        string     `json:"user_name"`
	TaskID          *uint      `json:"task_id"`
	TaskTitle       string     `json:"task_title"`
	OrgID           *uint      `json:"organization_id"`
	OrgName         string     `json:"org_name"`
	WorkspaceID     *uint      `json:"workspace_id"`
	WorkspaceName   string     `json:"workspace_name"`
	StartTime       time.Time  `json:"start_time"`
	EndTime         *time.Time `json:"end_time"`
	Duration        int64      `json:"duration"`
	Status          string     `json:"status"`
	IsManual        bool       `json:"is_manual"`
	IsApproved      bool       `json:"is_approved"`
	ApprovedBy      *uint      `json:"approved_by"`
	ApprovedAt      *time.Time `json:"approved_at"`
	AdminNotes      string     `json:"admin_notes"`
	ScreenshotCount int64      `json:"screenshot_count"`
	CreatedAt       time.Time  `json:"created_at"`
}

// AdminTimeLogListResponse represents time log list response
type AdminTimeLogListResponse struct {
	TimeLogs   []AdminTimeLogResponse  `json:"timelogs"`
	Pagination AdminPaginationResponse `json:"pagination"`
}

// AdminTimeLogDetailResponse represents detailed time log info
type AdminTimeLogDetailResponse struct {
	AdminTimeLogResponse
	ScreenshotCount int64                     `json:"screenshot_count"`
	Screenshots     []AdminScreenshotResponse `json:"screenshots"`
}

// AdminUpdateTimeLogRequest represents admin request to update time log
type AdminUpdateTimeLogRequest struct {
	TaskTitle  string `json:"task_title"`
	Notes      string `json:"notes"`
	AdminNotes string `json:"admin_notes"`
	Status     string `json:"status"`
	IsApproved *bool  `json:"is_approved"`
}

// AdminApproveTimeLogsRequest represents request to bulk approve time logs
type AdminApproveTimeLogsRequest struct {
	IDs      []uint `json:"ids" binding:"required"`
	Approved bool   `json:"approved"`
}

// ============================================================================
// ADMIN SCREENSHOT DTOs
// ============================================================================

// AdminScreenshotListParams represents query parameters for listing screenshots
type AdminScreenshotListParams struct {
	Page        int        `form:"page"`
	PageSize    int        `form:"page_size"`
	UserID      *uint      `form:"user_id"`
	OrgID       *uint      `form:"org_id"`
	WorkspaceID *uint      `form:"workspace_id"`
	TaskID      *uint      `form:"task_id"`
	TimeLogID   *uint      `form:"timelog_id"`
	StartDate   *time.Time `form:"start_date"`
	EndDate     *time.Time `form:"end_date"`
	SortBy      string     `form:"sort_by"`
	SortOrder   string     `form:"sort_order"`
}

// AdminScreenshotResponse represents a screenshot in admin responses
type AdminScreenshotResponse struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	UserEmail     string    `json:"user_email"`
	UserName      string    `json:"user_name"`
	TimeLogID     *uint     `json:"timelog_id"`
	TaskID        *uint     `json:"task_id"`
	TaskTitle     string    `json:"task_title"`
	OrgID         *uint     `json:"organization_id"`
	OrgName       string    `json:"org_name"`
	WorkspaceID   *uint     `json:"workspace_id"`
	WorkspaceName string    `json:"workspace_name"`
	FilePath      string    `json:"file_path"`
	FileName      string    `json:"file_name"`
	FileSize      int64     `json:"file_size"`
	MimeType      string    `json:"mime_type"`
	ThumbnailPath string    `json:"thumbnail_path"`
	MonitorIndex  int       `json:"monitor_index"`
	CapturedAt    time.Time `json:"captured_at"`
	ScreenNumber  int       `json:"screen_number"`
	IsEncrypted   bool      `json:"is_encrypted"`
	CreatedAt     time.Time `json:"created_at"`
}

// AdminScreenshotListResponse represents screenshot list response
type AdminScreenshotListResponse struct {
	Screenshots []AdminScreenshotResponse `json:"screenshots"`
	Pagination  AdminPaginationResponse   `json:"pagination"`
}

// AdminBulkDeleteRequest represents bulk delete request
type AdminBulkDeleteRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}

// AdminTrendRequest represents request for trend statistics
type AdminTrendRequest struct {
	Period    string    `json:"period"` // day, week, month
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

// ============================================================================
// ADMIN STATISTICS DTOs
// ============================================================================

// AdminOverviewStats represents system overview statistics
type AdminOverviewStats struct {
	TotalUsers            int64  `json:"total_users"`
	ActiveUsers           int64  `json:"active_users"`
	NewUsersThisWeek      int64  `json:"new_users_this_week"`
	TotalOrganizations    int64  `json:"total_organizations"`
	VerifiedOrganizations int64  `json:"verified_organizations"`
	TotalWorkspaces       int64  `json:"total_workspaces"`
	ActiveWorkspaces      int64  `json:"active_workspaces"`
	TotalTasks            int64  `json:"total_tasks"`
	ActiveTasks           int64  `json:"active_tasks"`
	TotalTimeLogs         int64  `json:"total_timelogs"`
	TotalDuration         int64  `json:"total_duration"` // seconds
	WeekDuration          int64  `json:"week_duration"`  // seconds
	TotalScreenshots      int64  `json:"total_screenshots"`
	TotalStorage          int64  `json:"total_storage"` // bytes
	TotalStorageHuman     string `json:"total_storage_human"`
}

// AdminTrendStats represents trend statistics
type AdminTrendStats struct {
	UserGrowth    []AdminDailyStat `json:"user_growth"`
	ActivityTrend []AdminDailyStat `json:"activity_trend"`
}

// AdminDailyStat represents daily statistics
type AdminDailyStat struct {
	Date        string `json:"date"`
	TotalUsers  int64  `json:"total_users,omitempty"`
	NewUsers    int64  `json:"new_users,omitempty"`
	Duration    int64  `json:"duration,omitempty"`
	TimeLogs    int64  `json:"timelogs,omitempty"`
	Screenshots int64  `json:"screenshots,omitempty"`
}

// AdminUserStats represents user statistics
type AdminUserStats struct {
	TopPerformers []AdminUserPerformance `json:"top_performers"`
}

// AdminUserPerformance represents user performance data
type AdminUserPerformance struct {
	UserID        uint   `json:"user_id"`
	UserName      string `json:"user_name"`
	Email         string `json:"email"`
	TotalDuration int64  `json:"total_duration"`
	TaskCount     int64  `json:"task_count"`
	Rank          int    `json:"rank"`
}

// AdminOrgStats represents organization statistics
type AdminOrgStats struct {
	SizeDistribution []AdminOrgSizeCategory `json:"size_distribution"`
	TopWorkspaces    []AdminTopWorkspace    `json:"top_workspaces"`
}

// AdminOrgSizeCategory represents organization size category
type AdminOrgSizeCategory struct {
	Category string `json:"category"` // small, medium, large
	Count    int64  `json:"count"`
}

// AdminTopWorkspace represents top workspace data
type AdminTopWorkspace struct {
	WorkspaceID      uint   `json:"workspace_id"`
	Name             string `json:"name"`
	OrganizationName string `json:"organization_name"`
	TotalDuration    int64  `json:"total_duration"`
	MemberCount      int64  `json:"member_count"`
}

// AdminActivityStats represents activity statistics
type AdminActivityStats struct {
	TodayDuration    int64             `json:"today_duration"`
	TodayActiveUsers int64             `json:"today_active_users"`
	TodayScreenshots int64             `json:"today_screenshots"`
	ActivityByHour   []AdminHourlyStat `json:"activity_by_hour"`
	PeakHour         int               `json:"peak_hour"`
	PeakHourCount    int64             `json:"peak_hour_count"`
}

// AdminHourlyStat represents hourly statistics
type AdminHourlyStat struct {
	Hour  int   `json:"hour"`
	Count int64 `json:"count"`
}

// ============================================================================
// PAGINATION RESPONSE
// ============================================================================

// AdminPaginationResponse represents pagination info
type AdminPaginationResponse struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// AdminListResponse is a generic list response with pagination
type AdminListResponse struct {
	Success    bool                    `json:"success"`
	Data       interface{}             `json:"data"`
	Pagination AdminPaginationResponse `json:"pagination"`
}
