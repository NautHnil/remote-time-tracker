package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Email        string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string     `gorm:"not null" json:"-"`
	FirstName    string     `gorm:"size:100" json:"first_name"`
	LastName     string     `gorm:"size:100" json:"last_name"`
	Role         string     `gorm:"size:20;default:'user'" json:"role"`          // admin, manager, user (legacy)
	SystemRole   string     `gorm:"size:20;default:'member'" json:"system_role"` // admin, member (system-level)
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at"`

	// Relations
	Tasks               []Task               `gorm:"foreignKey:UserID" json:"tasks,omitempty"`
	TimeLogs            []TimeLog            `gorm:"foreignKey:UserID" json:"time_logs,omitempty"`
	Screenshots         []Screenshot         `gorm:"foreignKey:UserID" json:"screenshots,omitempty"`
	DeviceInfos         []DeviceInfo         `gorm:"foreignKey:UserID" json:"device_infos,omitempty"`
	OwnedOrganizations  []Organization       `gorm:"foreignKey:OwnerID" json:"owned_organizations,omitempty"`
	OrganizationMembers []OrganizationMember `gorm:"foreignKey:UserID" json:"organization_members,omitempty"`
	WorkspaceMembers    []WorkspaceMember    `gorm:"foreignKey:UserID" json:"workspace_members,omitempty"`
}

// IsSystemAdmin checks if user has system admin role
func (u *User) IsSystemAdmin() bool {
	return u.SystemRole == SystemRoleAdmin || u.Role == "admin"
}

// TableName overrides the table name
func (User) TableName() string {
	return "users"
}

// Task represents a work task or project
type Task struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID         uint   `gorm:"not null;index" json:"user_id"`
	OrganizationID *uint  `gorm:"index" json:"organization_id"`
	WorkspaceID    *uint  `gorm:"index" json:"workspace_id"`
	LocalID        string `gorm:"size:100;uniqueIndex" json:"local_id"` // UUID from Electron app
	Title          string `gorm:"size:255;not null" json:"title"`
	Description    string `gorm:"type:text" json:"description"`
	Status         string `gorm:"size:20;default:'active'" json:"status"` // active, completed, archived
	Priority       int    `gorm:"default:0" json:"priority"`
	Color          string `gorm:"size:7" json:"color"`                  // Hex color code
	IsManual       bool   `gorm:"default:false;index" json:"is_manual"` // true: manually created, false: auto from time tracker

	// Relations
	User         User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Workspace    *Workspace    `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	TimeLogs     []TimeLog     `gorm:"foreignKey:TaskID" json:"time_logs,omitempty"`
}

// TableName overrides the table name
func (Task) TableName() string {
	return "tasks"
}

// TimeLog represents a time tracking session
type TimeLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID         uint   `gorm:"not null;index" json:"user_id"`
	OrganizationID *uint  `gorm:"index" json:"organization_id"`
	WorkspaceID    *uint  `gorm:"index" json:"workspace_id"`
	TaskID         *uint  `gorm:"index" json:"task_id"`
	TaskLocalID    string `gorm:"size:100;index" json:"task_local_id"` // UUID from Electron - primary reference
	DeviceID       *uint  `gorm:"index" json:"device_id"`

	StartTime   time.Time  `gorm:"not null;index" json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	PausedAt    *time.Time `json:"paused_at"`
	ResumedAt   *time.Time `json:"resumed_at"`
	Duration    int64      `gorm:"default:0" json:"duration"`               // Duration in seconds
	Status      string     `gorm:"size:20;default:'running'" json:"status"` // running, paused, stopped
	TaskTitle   string     `gorm:"size:500" json:"task_title"`              // Task title saved when stopped
	IsManual    bool       `gorm:"default:false" json:"is_manual"`
	Notes       string     `gorm:"type:text" json:"notes"`
	IsSynced    bool       `gorm:"default:false" json:"is_synced"`
	LocalID     string     `gorm:"size:100;index" json:"local_id"` // ID from Electron app
	PausedTotal int64      `gorm:"default:0" json:"paused_total"`  // Total paused time in seconds

	// Relations
	User         User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Workspace    *Workspace    `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	Task         *Task         `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	Device       *DeviceInfo   `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	Screenshots  []Screenshot  `gorm:"foreignKey:TimeLogID" json:"screenshots,omitempty"`
}

// TableName overrides the table name
func (TimeLog) TableName() string {
	return "time_logs"
}

// Screenshot represents a captured screenshot
type Screenshot struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID         uint   `gorm:"not null;index" json:"user_id"`
	OrganizationID *uint  `gorm:"index" json:"organization_id"`
	WorkspaceID    *uint  `gorm:"index" json:"workspace_id"`
	TimeLogID      *uint  `gorm:"index" json:"time_log_id"`
	TaskLocalID    string `gorm:"size:100;index" json:"task_local_id"` // UUID from Electron - primary reference
	DeviceID       *uint  `gorm:"index" json:"device_id"`
	TaskID         *uint  `gorm:"index" json:"task_id"`

	FilePath     string    `gorm:"size:500;not null" json:"file_path"`
	FileName     string    `gorm:"size:255;not null" json:"file_name"`
	FileSize     int64     `gorm:"not null" json:"file_size"`
	MimeType     string    `gorm:"size:50" json:"mime_type"`
	CapturedAt   time.Time `gorm:"not null;index" json:"captured_at"`
	ScreenNumber int       `gorm:"default:0" json:"screen_number"`
	IsEncrypted  bool      `gorm:"default:false" json:"is_encrypted"`
	Checksum     string    `gorm:"size:64" json:"checksum"` // SHA256 checksum
	IsSynced     bool      `gorm:"default:false" json:"is_synced"`
	LocalID      string    `gorm:"size:100;index" json:"local_id"`

	// Relations
	User         User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Organization *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Workspace    *Workspace    `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	TimeLog      *TimeLog      `gorm:"foreignKey:TimeLogID" json:"time_log,omitempty"`
	Device       *DeviceInfo   `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
	Task         *Task         `gorm:"foreignKey:TaskID" json:"task,omitempty"`
}

// TableName overrides the table name
func (Screenshot) TableName() string {
	return "screenshots"
}

// DeviceInfo represents information about a device
type DeviceInfo struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID     uint       `gorm:"not null;index" json:"user_id"`
	DeviceUUID string     `gorm:"size:100;uniqueIndex;not null" json:"device_uuid"`
	DeviceName string     `gorm:"size:255" json:"device_name"`
	OS         string     `gorm:"size:50" json:"os"`
	OSVersion  string     `gorm:"size:50" json:"os_version"`
	AppVersion string     `gorm:"size:50" json:"app_version"`
	IPAddress  string     `gorm:"size:45" json:"ip_address"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`

	// Relations
	User        User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TimeLogs    []TimeLog    `gorm:"foreignKey:DeviceID" json:"time_logs,omitempty"`
	Screenshots []Screenshot `gorm:"foreignKey:DeviceID" json:"screenshots,omitempty"`
}

// TableName overrides the table name
func (DeviceInfo) TableName() string {
	return "device_info"
}

// SyncLog represents a synchronization log entry
type SyncLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID       uint       `gorm:"not null;index" json:"user_id"`
	DeviceID     *uint      `gorm:"index" json:"device_id"`
	SyncType     string     `gorm:"size:50;not null" json:"sync_type"` // time_logs, screenshots, tasks
	Status       string     `gorm:"size:20;not null" json:"status"`    // pending, success, failed
	ItemsCount   int        `gorm:"default:0" json:"items_count"`
	SuccessCount int        `gorm:"default:0" json:"success_count"`
	FailedCount  int        `gorm:"default:0" json:"failed_count"`
	ErrorMessage string     `gorm:"type:text" json:"error_message"`
	StartedAt    time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
	Duration     int64      `gorm:"default:0" json:"duration"` // Duration in milliseconds

	// Relations
	User   User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Device *DeviceInfo `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
}

// TableName overrides the table name
func (SyncLog) TableName() string {
	return "sync_logs"
}

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	UserID     *uint  `gorm:"index" json:"user_id"`
	Action     string `gorm:"size:100;not null;index" json:"action"` // login, logout, create, update, delete
	EntityType string `gorm:"size:50;index" json:"entity_type"`      // user, task, time_log, screenshot
	EntityID   *uint  `json:"entity_id"`
	IPAddress  string `gorm:"size:45" json:"ip_address"`
	UserAgent  string `gorm:"type:text" json:"user_agent"`
	Details    string `gorm:"type:jsonb" json:"details"`
	Status     string `gorm:"size:20" json:"status"` // success, failed

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName overrides the table name
func (AuditLog) TableName() string {
	return "audit_logs"
}

// ============================================================================
// ORGANIZATION & WORKSPACE MODELS
// ============================================================================

// Organization represents a company or team
type Organization struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name            string `gorm:"size:255;not null" json:"name"`
	Slug            string `gorm:"size:255;uniqueIndex;not null" json:"slug"`
	Description     string `gorm:"type:text" json:"description"`
	LogoURL         string `gorm:"size:500" json:"logo_url"`
	OwnerID         uint   `gorm:"not null;index" json:"owner_id"`
	InviteCode      string `gorm:"size:50;uniqueIndex" json:"invite_code"`
	AllowInviteLink bool   `gorm:"default:true" json:"allow_invite_link"`
	ShareInviteCode bool   `gorm:"default:false" json:"share_invite_code"` // If true, all members can see invite code
	MaxMembers      int    `gorm:"default:100" json:"max_members"`
	IsActive        bool   `gorm:"default:true" json:"is_active"`

	// Relations
	Owner      User                 `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members    []OrganizationMember `gorm:"foreignKey:OrganizationID" json:"members,omitempty"`
	Workspaces []Workspace          `gorm:"foreignKey:OrganizationID" json:"workspaces,omitempty"`
	Roles      []WorkspaceRole      `gorm:"foreignKey:OrganizationID" json:"roles,omitempty"`
}

// TableName overrides the table name
func (Organization) TableName() string {
	return "organizations"
}

// OrganizationMember represents a user's membership in an organization
type OrganizationMember struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrganizationID uint      `gorm:"not null;index" json:"organization_id"`
	UserID         uint      `gorm:"not null;index" json:"user_id"`
	Role           string    `gorm:"size:50;not null;default:'member'" json:"role"` // owner, admin, member
	InvitedBy      *uint     `json:"invited_by"`
	JoinedAt       time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"joined_at"`
	IsActive       bool      `gorm:"default:true" json:"is_active"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	User         User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Inviter      *User        `gorm:"foreignKey:InvitedBy" json:"inviter,omitempty"`
}

// TableName overrides the table name
func (OrganizationMember) TableName() string {
	return "organization_members"
}

// WorkspaceRole represents custom roles for workspace members
type WorkspaceRole struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrganizationID uint   `gorm:"not null;index" json:"organization_id"`
	Name           string `gorm:"size:100;not null" json:"name"`
	DisplayName    string `gorm:"size:255;not null" json:"display_name"`
	Description    string `gorm:"type:text" json:"description"`
	Color          string `gorm:"size:7" json:"color"`
	Permissions    string `gorm:"type:jsonb;default:'{}'" json:"permissions"`
	IsDefault      bool   `gorm:"default:false" json:"is_default"`
	SortOrder      int    `gorm:"default:0" json:"sort_order"`

	// Relations
	Organization Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
}

// TableName overrides the table name
func (WorkspaceRole) TableName() string {
	return "workspace_roles"
}

// Workspace represents a project within an organization
type Workspace struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrganizationID uint       `gorm:"not null;index" json:"organization_id"`
	Name           string     `gorm:"size:255;not null" json:"name"`
	Slug           string     `gorm:"size:255;not null" json:"slug"`
	Description    string     `gorm:"type:text" json:"description"`
	Color          string     `gorm:"size:7" json:"color"`
	Icon           string     `gorm:"size:50" json:"icon"`
	AdminID        uint       `gorm:"not null;index" json:"admin_id"`
	IsActive       bool       `gorm:"default:true" json:"is_active"`
	IsBillable     bool       `gorm:"default:false" json:"is_billable"`
	HourlyRate     float64    `gorm:"type:decimal(10,2)" json:"hourly_rate"`
	StartDate      *time.Time `json:"start_date"`
	EndDate        *time.Time `json:"end_date"`

	// Relations
	Organization Organization      `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Admin        User              `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
	Members      []WorkspaceMember `gorm:"foreignKey:WorkspaceID" json:"members,omitempty"`
	Tasks        []Task            `gorm:"foreignKey:WorkspaceID" json:"tasks,omitempty"`
}

// TableName overrides the table name
func (Workspace) TableName() string {
	return "workspaces"
}

// WorkspaceMember represents a user's membership in a workspace
type WorkspaceMember struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	WorkspaceID     uint      `gorm:"not null;index" json:"workspace_id"`
	UserID          uint      `gorm:"not null;index" json:"user_id"`
	WorkspaceRoleID *uint     `gorm:"index" json:"workspace_role_id"`
	RoleName        string    `gorm:"size:100" json:"role_name"`
	IsAdmin         bool      `gorm:"default:false" json:"is_admin"`
	CanViewReports  bool      `gorm:"default:true" json:"can_view_reports"`
	CanManageTasks  bool      `gorm:"default:false" json:"can_manage_tasks"`
	AddedBy         *uint     `json:"added_by"`
	JoinedAt        time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"joined_at"`
	IsActive        bool      `gorm:"default:true" json:"is_active"`

	// Relations
	Workspace     Workspace      `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	User          User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	WorkspaceRole *WorkspaceRole `gorm:"foreignKey:WorkspaceRoleID" json:"workspace_role,omitempty"`
	Adder         *User          `gorm:"foreignKey:AddedBy" json:"adder,omitempty"`
}

// TableName overrides the table name
func (WorkspaceMember) TableName() string {
	return "workspace_members"
}

// Invitation represents a pending invitation to join an organization
type Invitation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrganizationID  uint       `gorm:"not null;index" json:"organization_id"`
	WorkspaceID     *uint      `gorm:"index" json:"workspace_id"`
	Email           string     `gorm:"size:255;not null" json:"email"`
	Token           string     `gorm:"size:255;uniqueIndex;not null" json:"token"`
	OrgRole         string     `gorm:"size:50;default:'member'" json:"org_role"`
	WorkspaceRoleID *uint      `json:"workspace_role_id"`
	InvitedBy       uint       `gorm:"not null" json:"invited_by"`
	Status          string     `gorm:"size:20;default:'pending'" json:"status"` // pending, accepted, expired, revoked
	ExpiresAt       time.Time  `gorm:"not null" json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at"`
	AcceptedBy      *uint      `json:"accepted_by"`
	Message         string     `gorm:"type:text" json:"message"`

	// Relations
	Organization  Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Workspace     *Workspace     `gorm:"foreignKey:WorkspaceID" json:"workspace,omitempty"`
	WorkspaceRole *WorkspaceRole `gorm:"foreignKey:WorkspaceRoleID" json:"workspace_role,omitempty"`
	Inviter       User           `gorm:"foreignKey:InvitedBy" json:"inviter,omitempty"`
	Accepter      *User          `gorm:"foreignKey:AcceptedBy" json:"accepter,omitempty"`
}

// TableName overrides the table name
func (Invitation) TableName() string {
	return "invitations"
}

// ============================================================================
// ROLE CONSTANTS
// ============================================================================

// System roles
const (
	SystemRoleAdmin  = "admin"
	SystemRoleMember = "member"
)

// Organization roles
const (
	OrgRoleOwner  = "owner"
	OrgRoleAdmin  = "admin"
	OrgRoleMember = "member"
)

// Invitation status
const (
	InvitationStatusPending  = "pending"
	InvitationStatusAccepted = "accepted"
	InvitationStatusExpired  = "expired"
	InvitationStatusRevoked  = "revoked"
)

// Default workspace roles
var DefaultWorkspaceRoles = []WorkspaceRole{
	{Name: "pm", DisplayName: "Project Manager", Color: "#3B82F6", SortOrder: 1},
	{Name: "ba", DisplayName: "Business Analyst", Color: "#8B5CF6", SortOrder: 2},
	{Name: "dev", DisplayName: "Developer", Color: "#10B981", SortOrder: 3},
	{Name: "tester", DisplayName: "Tester/QA", Color: "#F59E0B", SortOrder: 4},
	{Name: "designer", DisplayName: "Designer", Color: "#EC4899", SortOrder: 5},
	{Name: "devops", DisplayName: "DevOps Engineer", Color: "#6366F1", SortOrder: 6},
}
