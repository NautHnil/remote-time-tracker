package dto

import "time"

// ============================================================================
// ORGANIZATION DTOs
// ============================================================================

// CreateOrganizationRequest represents organization creation request
type CreateOrganizationRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=255"`
	Slug        string `json:"slug" binding:"required,min=2,max=255,alphanum"`
	Description string `json:"description"`
	LogoURL     string `json:"logo_url"`
}

// UpdateOrganizationRequest represents organization update request
type UpdateOrganizationRequest struct {
	Name            *string `json:"name"`
	Description     *string `json:"description"`
	LogoURL         *string `json:"logo_url"`
	AllowInviteLink *bool   `json:"allow_invite_link"`
	ShareInviteCode *bool   `json:"share_invite_code"` // If true, all members can see invite code
	MaxMembers      *int    `json:"max_members"`
	IsActive        *bool   `json:"is_active"`
}

// OrganizationResponse represents organization data in responses
type OrganizationResponse struct {
	ID              uint                         `json:"id"`
	Name            string                       `json:"name"`
	Slug            string                       `json:"slug"`
	Description     string                       `json:"description"`
	LogoURL         string                       `json:"logo_url"`
	OwnerID         uint                         `json:"owner_id"`
	Owner           *UserResponse                `json:"owner,omitempty"`
	InviteCode      string                       `json:"invite_code,omitempty"`
	AllowInviteLink bool                         `json:"allow_invite_link"`
	ShareInviteCode bool                         `json:"share_invite_code"` // If true, all members can see invite code
	MaxMembers      int                          `json:"max_members"`
	IsActive        bool                         `json:"is_active"`
	MemberCount     int64                        `json:"member_count"`
	WorkspaceCount  int64                        `json:"workspace_count"`
	Members         []OrganizationMemberResponse `json:"members,omitempty"`
	Workspaces      []WorkspaceResponse          `json:"workspaces,omitempty"`
	CreatedAt       time.Time                    `json:"created_at"`
	UpdatedAt       time.Time                    `json:"updated_at"`
}

// OrganizationListResponse represents organization in list responses
type OrganizationListResponse struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	LogoURL        string    `json:"logo_url"`
	Role           string    `json:"role"` // User's role in this organization
	MemberCount    int64     `json:"member_count"`
	WorkspaceCount int64     `json:"workspace_count"`
	IsActive       bool      `json:"is_active"`
	JoinedAt       time.Time `json:"joined_at"`
}

// ============================================================================
// ORGANIZATION MEMBER DTOs
// ============================================================================

// AddOrganizationMemberRequest represents adding a member to organization
type AddOrganizationMemberRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"required,oneof=admin member"`
}

// UpdateOrganizationMemberRequest represents updating member role
type UpdateOrganizationMemberRequest struct {
	Role     string `json:"role" binding:"required,oneof=owner admin member"`
	IsActive *bool  `json:"is_active"`
}

// OrganizationMemberResponse represents organization member data
type OrganizationMemberResponse struct {
	ID        uint          `json:"id"`
	UserID    uint          `json:"user_id"`
	User      *UserResponse `json:"user,omitempty"`
	Role      string        `json:"role"`
	JoinedAt  time.Time     `json:"joined_at"`
	IsActive  bool          `json:"is_active"`
	InvitedBy *uint         `json:"invited_by"`
}

// ============================================================================
// WORKSPACE ROLE DTOs
// ============================================================================

// CreateWorkspaceRoleRequest represents workspace role creation
type CreateWorkspaceRoleRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100,alphanum"`
	DisplayName string `json:"display_name" binding:"required,min=2,max=255"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Permissions string `json:"permissions"` // JSON string of permissions
	IsDefault   bool   `json:"is_default"`
	SortOrder   int    `json:"sort_order"`
}

// UpdateWorkspaceRoleRequest represents workspace role update
type UpdateWorkspaceRoleRequest struct {
	DisplayName *string `json:"display_name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Permissions *string `json:"permissions"`
	IsDefault   *bool   `json:"is_default"`
	SortOrder   *int    `json:"sort_order"`
}

// WorkspaceRoleResponse represents workspace role data
type WorkspaceRoleResponse struct {
	ID             uint      `json:"id"`
	OrganizationID uint      `json:"organization_id"`
	Name           string    `json:"name"`
	DisplayName    string    `json:"display_name"`
	Description    string    `json:"description"`
	Color          string    `json:"color"`
	Permissions    string    `json:"permissions"`
	IsDefault      bool      `json:"is_default"`
	SortOrder      int       `json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
}

// ============================================================================
// WORKSPACE DTOs
// ============================================================================

// CreateWorkspaceRequest represents workspace creation request
type CreateWorkspaceRequest struct {
	Name        string     `json:"name" binding:"required,min=2,max=255"`
	Slug        string     `json:"slug" binding:"required,min=2,max=255,alphanum"`
	Description string     `json:"description"`
	Color       string     `json:"color"`
	Icon        string     `json:"icon"`
	AdminID     uint       `json:"admin_id"` // If not provided, creator becomes admin
	IsBillable  bool       `json:"is_billable"`
	HourlyRate  float64    `json:"hourly_rate"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

// UpdateWorkspaceRequest represents workspace update request
type UpdateWorkspaceRequest struct {
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

// WorkspaceResponse represents workspace data in responses
type WorkspaceResponse struct {
	ID             uint                      `json:"id"`
	OrganizationID uint                      `json:"organization_id"`
	Name           string                    `json:"name"`
	Slug           string                    `json:"slug"`
	Description    string                    `json:"description"`
	Color          string                    `json:"color"`
	Icon           string                    `json:"icon"`
	AdminID        uint                      `json:"admin_id"`
	Admin          *UserResponse             `json:"admin,omitempty"`
	IsActive       bool                      `json:"is_active"`
	IsBillable     bool                      `json:"is_billable"`
	HourlyRate     float64                   `json:"hourly_rate"`
	StartDate      *time.Time                `json:"start_date"`
	EndDate        *time.Time                `json:"end_date"`
	MemberCount    int64                     `json:"member_count"`
	TaskCount      int64                     `json:"task_count"`
	Members        []WorkspaceMemberResponse `json:"members,omitempty"`
	CreatedAt      time.Time                 `json:"created_at"`
	UpdatedAt      time.Time                 `json:"updated_at"`
}

// WorkspaceListResponse represents workspace in list responses
type WorkspaceListResponse struct {
	ID               uint      `json:"id"`
	OrganizationID   uint      `json:"organization_id"`
	OrganizationName string    `json:"organization_name,omitempty"` // Organization name for display
	Name             string    `json:"name"`
	Slug             string    `json:"slug"`
	Description      string    `json:"description,omitempty"`
	Color            string    `json:"color"`
	Icon             string    `json:"icon"`
	IsAdmin          bool      `json:"is_admin"` // Whether current user is admin of this workspace
	WorkspaceRoleID  *uint     `json:"workspace_role_id,omitempty"`
	RoleName         string    `json:"role_name"`
	MemberCount      int64     `json:"member_count"`
	TaskCount        int64     `json:"task_count"`
	IsActive         bool      `json:"is_active"`
	JoinedAt         time.Time `json:"joined_at"`
}

// ============================================================================
// WORKSPACE MEMBER DTOs
// ============================================================================

// AddWorkspaceMemberRequest represents adding a member to workspace
type AddWorkspaceMemberRequest struct {
	UserID          uint   `json:"user_id" binding:"required"`
	WorkspaceRoleID *uint  `json:"workspace_role_id"`
	RoleName        string `json:"role_name"`
	IsAdmin         bool   `json:"is_admin"`
	CanViewReports  bool   `json:"can_view_reports"`
	CanManageTasks  bool   `json:"can_manage_tasks"`
}

// UpdateWorkspaceMemberRequest represents updating workspace member
type UpdateWorkspaceMemberRequest struct {
	WorkspaceRoleID *uint   `json:"workspace_role_id"`
	RoleName        *string `json:"role_name"`
	IsAdmin         *bool   `json:"is_admin"`
	CanViewReports  *bool   `json:"can_view_reports"`
	CanManageTasks  *bool   `json:"can_manage_tasks"`
	IsActive        *bool   `json:"is_active"`
}

// WorkspaceMemberResponse represents workspace member data
type WorkspaceMemberResponse struct {
	ID              uint                   `json:"id"`
	UserID          uint                   `json:"user_id"`
	User            *UserResponse          `json:"user,omitempty"`
	WorkspaceRoleID *uint                  `json:"workspace_role_id"`
	WorkspaceRole   *WorkspaceRoleResponse `json:"workspace_role,omitempty"`
	RoleName        string                 `json:"role_name"`
	IsAdmin         bool                   `json:"is_admin"`
	CanViewReports  bool                   `json:"can_view_reports"`
	CanManageTasks  bool                   `json:"can_manage_tasks"`
	JoinedAt        time.Time              `json:"joined_at"`
	IsActive        bool                   `json:"is_active"`
	AddedBy         *uint                  `json:"added_by"`
}

// ============================================================================
// INVITATION DTOs
// ============================================================================

// CreateInvitationRequest represents invitation creation
type CreateInvitationRequest struct {
	Email           string `json:"email" binding:"required,email"`
	OrgRole         string `json:"org_role" binding:"required,oneof=admin member"`
	WorkspaceID     *uint  `json:"workspace_id"`
	WorkspaceRoleID *uint  `json:"workspace_role_id"`
	Message         string `json:"message"`
	ExpiresInDays   int    `json:"expires_in_days"` // Default: 7 days
}

// InvitationResponse represents invitation data
type InvitationResponse struct {
	ID              uint                   `json:"id"`
	OrganizationID  uint                   `json:"organization_id"`
	Organization    *OrganizationResponse  `json:"organization,omitempty"`
	WorkspaceID     *uint                  `json:"workspace_id"`
	Workspace       *WorkspaceResponse     `json:"workspace,omitempty"`
	Email           string                 `json:"email"`
	Token           string                 `json:"token,omitempty"` // Only shown to creator
	OrgRole         string                 `json:"org_role"`
	WorkspaceRoleID *uint                  `json:"workspace_role_id"`
	WorkspaceRole   *WorkspaceRoleResponse `json:"workspace_role,omitempty"`
	InvitedBy       uint                   `json:"invited_by"`
	Inviter         *UserResponse          `json:"inviter,omitempty"`
	Status          string                 `json:"status"`
	ExpiresAt       time.Time              `json:"expires_at"`
	AcceptedAt      *time.Time             `json:"accepted_at"`
	Message         string                 `json:"message"`
	InviteLink      string                 `json:"invite_link,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
}

// AcceptInvitationRequest represents accepting an invitation
type AcceptInvitationRequest struct {
	Token string `json:"token" binding:"required"`
}

// JoinByCodeRequest represents joining org by invite code
type JoinByCodeRequest struct {
	InviteCode string `json:"invite_code" binding:"required"`
}

// ============================================================================
// EXTENDED REGISTRATION DTOs
// ============================================================================

// RegisterWithOrgRequest represents registration with organization choice
type RegisterWithOrgRequest struct {
	// User fields
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`

	// Organization choice: create new or join existing
	CreateOrganization bool   `json:"create_organization"` // true: create new, false: join existing
	OrganizationName   string `json:"organization_name"`   // Required if create_organization is true
	OrganizationSlug   string `json:"organization_slug"`   // Required if create_organization is true
	InviteCode         string `json:"invite_code"`         // Required if create_organization is false
	InvitationToken    string `json:"invitation_token"`    // Alternative to invite_code (from email link)
}

// RegisterWithOrgResponse represents registration with organization response
type RegisterWithOrgResponse struct {
	User         UserResponse         `json:"user"`
	Organization OrganizationResponse `json:"organization"`
	AccessToken  string               `json:"access_token"`
	RefreshToken string               `json:"refresh_token"`
	ExpiresAt    time.Time            `json:"expires_at"`
}

// ============================================================================
// PERMISSION & AUTHORIZATION DTOs
// ============================================================================

// UserPermissions represents a user's permissions in various contexts
type UserPermissions struct {
	IsSystemAdmin bool                  `json:"is_system_admin"`
	Organizations []OrgPermission       `json:"organizations"`
	Workspaces    []WorkspacePermission `json:"workspaces"`
}

// OrgPermission represents user's permission in an organization
type OrgPermission struct {
	OrganizationID uint   `json:"organization_id"`
	Role           string `json:"role"` // owner, admin, member
	CanManageOrg   bool   `json:"can_manage_org"`
	CanInvite      bool   `json:"can_invite"`
	CanRemove      bool   `json:"can_remove"`
}

// WorkspacePermission represents user's permission in a workspace
type WorkspacePermission struct {
	WorkspaceID    uint   `json:"workspace_id"`
	OrganizationID uint   `json:"organization_id"`
	RoleName       string `json:"role_name"`
	IsAdmin        bool   `json:"is_admin"`
	CanViewReports bool   `json:"can_view_reports"`
	CanManageTasks bool   `json:"can_manage_tasks"`
}

// ContextInfo represents current user's context (selected org/workspace)
type ContextInfo struct {
	CurrentOrganization *OrganizationResponse `json:"current_organization"`
	CurrentWorkspace    *WorkspaceResponse    `json:"current_workspace"`
	Permissions         UserPermissions       `json:"permissions"`
}

// OrganizationPublicInfo represents public organization info for invite code lookup
type OrganizationPublicInfo struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	LogoURL     string `json:"logo_url"`
	MemberCount int64  `json:"member_count"`
}

// TransferOwnershipRequest represents ownership transfer request
type TransferOwnershipRequest struct {
	NewOwnerID uint `json:"new_owner_id" binding:"required"`
}
