package dto

import "time"

// RegisterRequest represents user registration request
type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`

	// Organization options - one of these must be provided
	// Option 1: Create new organization (user becomes owner)
	CreateOrganization bool   `json:"create_organization"`
	OrganizationName   string `json:"organization_name"` // Required if CreateOrganization is true
	OrganizationSlug   string `json:"organization_slug"` // Optional, auto-generated from name if empty

	// Option 2: Join existing organization via invite code
	InviteCode string `json:"invite_code"` // Organization invite code

	// Option 3: Accept pending invitation via token
	InvitationToken string `json:"invitation_token"` // Token from invitation email
}

// LoginRequest represents user login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents user login response
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresAt    time.Time    `json:"expires_at"`
	User         UserResponse `json:"user"`
}

// UserResponse represents user data in responses
type UserResponse struct {
	ID          uint       `json:"id"`
	Email       string     `json:"email"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	Role        string     `json:"role"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// CreateTaskRequest represents task creation request
type CreateTaskRequest struct {
	Title          string `json:"title" binding:"required"`
	Description    string `json:"description"`
	Priority       int    `json:"priority"`
	Color          string `json:"color"`
	IsManual       bool   `json:"is_manual"`       // true: manually created, false: auto from time tracker
	OrganizationID *uint  `json:"organization_id"` // Organization ID (required for workspace context)
	WorkspaceID    *uint  `json:"workspace_id"`    // Workspace ID the task belongs to
}

// UpdateTaskRequest represents task update request
type UpdateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    int    `json:"priority"`
	Color       string `json:"color"`
	IsManual    *bool  `json:"is_manual"` // Pointer to allow optional update
}

// TaskWithStats represents a task with aggregated statistics
type TaskWithStats struct {
	ID              uint      `json:"id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Status          string    `json:"status"`
	Priority        int       `json:"priority"`
	Color           string    `json:"color"`
	IsManual        bool      `json:"is_manual"`        // true: manually created, false: auto from time tracker
	OrganizationID  *uint     `json:"organization_id"`  // Organization ID
	WorkspaceID     *uint     `json:"workspace_id"`     // Workspace ID the task belongs to
	Duration        int64     `json:"duration"`         // Total duration in seconds
	ScreenshotCount int64     `json:"screenshot_count"` // Total screenshots
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// StartTimeLogRequest represents starting a time log
type StartTimeLogRequest struct {
	TaskID   *uint  `json:"task_id"`
	DeviceID *uint  `json:"device_id"`
	LocalID  string `json:"local_id"`
	Notes    string `json:"notes"`
}

// StopTimeLogRequest represents stopping a time log
type StopTimeLogRequest struct {
	LocalID   string `json:"local_id"`
	Notes     string `json:"notes"`
	TaskTitle string `json:"task_title"` // Optional task title when stopping
}

// PauseTimeLogRequest represents pausing a time log
type PauseTimeLogRequest struct {
	LocalID string `json:"local_id"`
}

// ResumeTimeLogRequest represents resuming a time log
type ResumeTimeLogRequest struct {
	LocalID string `json:"local_id"`
}

// BatchSyncRequest represents a batch synchronization request
type BatchSyncRequest struct {
	DeviceUUID     string               `json:"device_uuid" binding:"required"`
	OrganizationID *uint                `json:"organization_id"` // Default organization ID for all items
	WorkspaceID    *uint                `json:"workspace_id"`    // Default workspace ID for all items
	TimeLogs       []SyncTimeLogItem    `json:"time_logs"`
	Screenshots    []SyncScreenshotItem `json:"screenshots"`
	DeviceInfo     *SyncDeviceInfoItem  `json:"device_info"`
}

// SyncTimeLogItem represents a time log item to sync
type SyncTimeLogItem struct {
	LocalID        string     `json:"local_id" binding:"required"`
	TaskID         *uint      `json:"task_id"`         // Deprecated: Use TaskLocalID instead
	TaskLocalID    string     `json:"task_local_id"`   // UUID from Electron - primary task identifier
	OrganizationID *uint      `json:"organization_id"` // Organization ID
	WorkspaceID    *uint      `json:"workspace_id"`    // Workspace ID the time log belongs to
	StartTime      time.Time  `json:"start_time" binding:"required"`
	EndTime        *time.Time `json:"end_time"`
	PausedAt       *time.Time `json:"paused_at"`
	ResumedAt      *time.Time `json:"resumed_at"`
	Duration       int64      `json:"duration"`
	PausedTotal    int64      `json:"paused_total"`
	Status         string     `json:"status"`
	Notes          string     `json:"notes"`
	TaskTitle      string     `json:"task_title"` // Task title when stopped
}

// SyncScreenshotItem represents a screenshot item to sync
type SyncScreenshotItem struct {
	LocalID        string    `json:"local_id" binding:"required"`
	TimeLogID      *uint     `json:"time_log_id"`       // Server-side TimeLog ID (deprecated, use TimeLogLocalID)
	TimeLogLocalID string    `json:"time_log_local_id"` // Local ID of TimeLog from Electron
	TaskID         *uint     `json:"task_id"`           // Deprecated: Use TaskLocalID instead
	TaskLocalID    string    `json:"task_local_id"`     // UUID from Electron - primary task identifier
	OrganizationID *uint     `json:"organization_id"`   // Organization ID
	WorkspaceID    *uint     `json:"workspace_id"`      // Workspace ID the screenshot belongs to
	FileName       string    `json:"file_name" binding:"required"`
	FileSize       int64     `json:"file_size"`
	MimeType       string    `json:"mime_type"`
	CapturedAt     time.Time `json:"captured_at" binding:"required"`
	ScreenNumber   int       `json:"screen_number"`
	IsEncrypted    bool      `json:"is_encrypted"`
	Checksum       string    `json:"checksum"`
	Base64Data     string    `json:"base64_data"` // For file upload
}

// SyncDeviceInfoItem represents device info to sync
type SyncDeviceInfoItem struct {
	DeviceUUID string `json:"device_uuid" binding:"required"`
	DeviceName string `json:"device_name"`
	OS         string `json:"os"`
	OSVersion  string `json:"os_version"`
	AppVersion string `json:"app_version"`
	IPAddress  string `json:"ip_address"`
}

// BatchSyncResponse represents a batch sync response
type BatchSyncResponse struct {
	Success         bool                `json:"success"`
	Message         string              `json:"message"`
	TimeLogsSync    SyncResult          `json:"time_logs_sync"`
	ScreenshotsSync SyncResult          `json:"screenshots_sync"`
	DeviceInfo      *DeviceInfoResponse `json:"device_info"`
	SyncedAt        time.Time           `json:"synced_at"`
}

// SyncResult represents sync result for a data type
type SyncResult struct {
	Total   int      `json:"total"`
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

// DeviceInfoResponse represents device info in responses
type DeviceInfoResponse struct {
	ID         uint       `json:"id"`
	DeviceUUID string     `json:"device_uuid"`
	DeviceName string     `json:"device_name"`
	OS         string     `json:"os"`
	OSVersion  string     `json:"os_version"`
	AppVersion string     `json:"app_version"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	IsActive   bool       `json:"is_active"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PaginationMeta represents pagination metadata
type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Success bool           `json:"success"`
	Data    interface{}    `json:"data"`
	Meta    PaginationMeta `json:"meta"`
}

// PaginationResponse represents a paginated response with embedded metadata
type PaginationResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	Total      int64       `json:"total"`
	TotalPages int         `json:"total_pages"`
}
