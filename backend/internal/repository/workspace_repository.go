package repository

import (
	"strings"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// WorkspaceRepository handles database operations for workspaces
type WorkspaceRepository struct {
	db *gorm.DB
}

// NewWorkspaceRepository creates a new workspace repository
func NewWorkspaceRepository(db *gorm.DB) *WorkspaceRepository {
	return &WorkspaceRepository{db: db}
}

// ============================================================================
// WORKSPACE CRUD
// ============================================================================

// Create creates a new workspace
func (r *WorkspaceRepository) Create(workspace *models.Workspace) error {
	return r.db.Create(workspace).Error
}

// GetByID gets a workspace by ID
func (r *WorkspaceRepository) GetByID(id uint) (*models.Workspace, error) {
	var workspace models.Workspace
	err := r.db.Preload("Admin").
		Preload("Organization").
		First(&workspace, id).Error
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

// GetByIDWithMembers gets a workspace with its members
func (r *WorkspaceRepository) GetByIDWithMembers(id uint) (*models.Workspace, error) {
	var workspace models.Workspace
	err := r.db.Preload("Admin").
		Preload("Organization").
		Preload("Members").
		Preload("Members.User").
		Preload("Members.WorkspaceRole").
		First(&workspace, id).Error
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

// GetBySlugAndOrg gets a workspace by slug and organization
func (r *WorkspaceRepository) GetBySlugAndOrg(orgID uint, slug string) (*models.Workspace, error) {
	var workspace models.Workspace
	err := r.db.Where("organization_id = ? AND slug = ?", orgID, strings.ToLower(slug)).
		First(&workspace).Error
	if err != nil {
		return nil, err
	}
	return &workspace, nil
}

// GetByOrganizationID gets all workspaces of an organization
func (r *WorkspaceRepository) GetByOrganizationID(orgID uint) ([]models.Workspace, error) {
	var workspaces []models.Workspace
	err := r.db.Preload("Admin").
		Where("organization_id = ? AND is_active = true", orgID).
		Find(&workspaces).Error
	return workspaces, err
}

// GetByAdminID gets all workspaces where user is admin
func (r *WorkspaceRepository) GetByAdminID(adminID uint) ([]models.Workspace, error) {
	var workspaces []models.Workspace
	err := r.db.Where("admin_id = ? AND is_active = true", adminID).Find(&workspaces).Error
	return workspaces, err
}

// Update updates a workspace
func (r *WorkspaceRepository) Update(workspace *models.Workspace) error {
	return r.db.Save(workspace).Error
}

// Delete soft deletes a workspace
func (r *WorkspaceRepository) Delete(id uint) error {
	return r.db.Delete(&models.Workspace{}, id).Error
}

// SlugExistsInOrg checks if a slug exists in an organization
func (r *WorkspaceRepository) SlugExistsInOrg(orgID uint, slug string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Workspace{}).
		Where("organization_id = ? AND slug = ?", orgID, strings.ToLower(slug)).
		Count(&count).Error
	return count > 0, err
}

// GetMemberCount gets the member count of a workspace
func (r *WorkspaceRepository) GetMemberCount(workspaceID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND is_active = true AND deleted_at IS NULL", workspaceID).
		Count(&count).Error
	return count, err
}

// GetTaskCount gets the task count of a workspace
func (r *WorkspaceRepository) GetTaskCount(workspaceID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Task{}).
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Count(&count).Error
	return count, err
}

// ============================================================================
// WORKSPACE MEMBER OPERATIONS
// ============================================================================

// AddMember adds a member to a workspace
func (r *WorkspaceRepository) AddMember(member *models.WorkspaceMember) error {
	return r.db.Create(member).Error
}

// GetMember gets a member by workspace and user ID
func (r *WorkspaceRepository) GetMember(workspaceID, userID uint) (*models.WorkspaceMember, error) {
	var member models.WorkspaceMember
	err := r.db.Preload("WorkspaceRole").
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

// GetMemberWithDetails gets a member with user and role details
func (r *WorkspaceRepository) GetMemberWithDetails(workspaceID, userID uint) (*models.WorkspaceMember, error) {
	var member models.WorkspaceMember
	err := r.db.Preload("User").
		Preload("WorkspaceRole").
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

// GetMembersByWorkspaceID gets all members of a workspace
func (r *WorkspaceRepository) GetMembersByWorkspaceID(workspaceID uint) ([]models.WorkspaceMember, error) {
	var members []models.WorkspaceMember
	err := r.db.Preload("User").
		Preload("WorkspaceRole").
		Where("workspace_id = ? AND is_active = true", workspaceID).
		Find(&members).Error
	return members, err
}

// GetUserWorkspaces gets all workspaces a user belongs to
func (r *WorkspaceRepository) GetUserWorkspaces(userID uint) ([]models.WorkspaceMember, error) {
	var memberships []models.WorkspaceMember
	err := r.db.Preload("Workspace").
		Preload("Workspace.Admin").
		Preload("Workspace.Organization").
		Preload("WorkspaceRole").
		Where("user_id = ? AND is_active = true", userID).
		Find(&memberships).Error
	return memberships, err
}

// GetUserWorkspacesByOrg gets all workspaces in an org that a user belongs to
func (r *WorkspaceRepository) GetUserWorkspacesByOrg(userID, orgID uint) ([]models.WorkspaceMember, error) {
	var memberships []models.WorkspaceMember
	err := r.db.Preload("Workspace").
		Preload("WorkspaceRole").
		Joins("JOIN workspaces ON workspaces.id = workspace_members.workspace_id").
		Where("workspace_members.user_id = ? AND workspaces.organization_id = ? AND workspace_members.is_active = true", userID, orgID).
		Find(&memberships).Error
	return memberships, err
}

// UpdateMember updates a workspace member
func (r *WorkspaceRepository) UpdateMember(member *models.WorkspaceMember) error {
	// Use Updates with Select to explicitly update all fields including pointer fields
	return r.db.Model(member).Select(
		"workspace_role_id",
		"role_name",
		"is_admin",
		"can_view_reports",
		"can_manage_tasks",
		"is_active",
		"updated_at",
	).Updates(member).Error
}

// RemoveMember removes a member from a workspace (soft delete)
func (r *WorkspaceRepository) RemoveMember(workspaceID, userID uint) error {
	return r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Delete(&models.WorkspaceMember{}).Error
}

// IsMember checks if a user is a member of a workspace
func (r *WorkspaceRepository) IsMember(workspaceID, userID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ? AND is_active = true AND deleted_at IS NULL", workspaceID, userID).
		Count(&count).Error
	return count > 0, err
}

// IsAdmin checks if a user is an admin of a workspace
func (r *WorkspaceRepository) IsAdmin(workspaceID, userID uint) (bool, error) {
	// First check if workspace admin
	var workspace models.Workspace
	err := r.db.Select("admin_id").Where("id = ?", workspaceID).First(&workspace).Error
	if err != nil {
		return false, err
	}
	if workspace.AdminID == userID {
		return true, nil
	}

	// Check if member with admin flag
	var count int64
	err = r.db.Model(&models.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ? AND is_admin = true AND is_active = true AND deleted_at IS NULL", workspaceID, userID).
		Count(&count).Error
	return count > 0, err
}

// ============================================================================
// WORKSPACE ROLE OPERATIONS
// ============================================================================

// CreateRole creates a new workspace role
func (r *WorkspaceRepository) CreateRole(role *models.WorkspaceRole) error {
	return r.db.Create(role).Error
}

// GetRoleByID gets a role by ID
func (r *WorkspaceRepository) GetRoleByID(id uint) (*models.WorkspaceRole, error) {
	var role models.WorkspaceRole
	err := r.db.First(&role, id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// GetRolesByOrgID gets all roles of an organization
func (r *WorkspaceRepository) GetRolesByOrgID(orgID uint) ([]models.WorkspaceRole, error) {
	var roles []models.WorkspaceRole
	err := r.db.Where("organization_id = ?", orgID).Order("sort_order ASC").Find(&roles).Error
	return roles, err
}

// GetRoleByNameAndOrg gets a role by name and organization
func (r *WorkspaceRepository) GetRoleByNameAndOrg(orgID uint, name string) (*models.WorkspaceRole, error) {
	var role models.WorkspaceRole
	err := r.db.Where("organization_id = ? AND name = ?", orgID, strings.ToLower(name)).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// UpdateRole updates a workspace role
func (r *WorkspaceRepository) UpdateRole(role *models.WorkspaceRole) error {
	return r.db.Save(role).Error
}

// DeleteRole soft deletes a workspace role
func (r *WorkspaceRepository) DeleteRole(id uint) error {
	return r.db.Delete(&models.WorkspaceRole{}, id).Error
}

// GetDefaultRole gets the default role for an organization
func (r *WorkspaceRepository) GetDefaultRole(orgID uint) (*models.WorkspaceRole, error) {
	var role models.WorkspaceRole
	err := r.db.Where("organization_id = ? AND is_default = true", orgID).First(&role).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return first role if no default
			err = r.db.Where("organization_id = ?", orgID).Order("sort_order ASC").First(&role).Error
			if err != nil {
				return nil, err
			}
			return &role, nil
		}
		return nil, err
	}
	return &role, nil
}

// CreateDefaultRoles creates default workspace roles for an organization
func (r *WorkspaceRepository) CreateDefaultRoles(orgID uint) error {
	for _, defaultRole := range models.DefaultWorkspaceRoles {
		role := models.WorkspaceRole{
			OrganizationID: orgID,
			Name:           defaultRole.Name,
			DisplayName:    defaultRole.DisplayName,
			Color:          defaultRole.Color,
			SortOrder:      defaultRole.SortOrder,
			IsDefault:      defaultRole.Name == "dev", // Developer is default
		}
		if err := r.db.Create(&role).Error; err != nil {
			return err
		}
	}
	return nil
}

// RoleNameExistsInOrg checks if a role name exists in an organization
func (r *WorkspaceRepository) RoleNameExistsInOrg(orgID uint, name string) (bool, error) {
	var count int64
	err := r.db.Model(&models.WorkspaceRole{}).
		Where("organization_id = ? AND name = ?", orgID, strings.ToLower(name)).
		Count(&count).Error
	return count > 0, err
}
