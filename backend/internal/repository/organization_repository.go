package repository

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// OrganizationRepository handles database operations for organizations
type OrganizationRepository struct {
	db *gorm.DB
}

// NewOrganizationRepository creates a new organization repository
func NewOrganizationRepository(db *gorm.DB) *OrganizationRepository {
	return &OrganizationRepository{db: db}
}

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

// Create creates a new organization
func (r *OrganizationRepository) Create(org *models.Organization) error {
	// Generate invite code if not provided
	if org.InviteCode == "" {
		org.InviteCode = generateInviteCode()
	}
	return r.db.Create(org).Error
}

// GetByID gets an organization by ID
func (r *OrganizationRepository) GetByID(id uint) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Preload("Owner").First(&org, id).Error
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetByIDWithMembers gets an organization with its members
func (r *OrganizationRepository) GetByIDWithMembers(id uint) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Preload("Owner").
		Preload("Members").
		Preload("Members.User").
		First(&org, id).Error
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetByIDWithDetails gets an organization with all details
func (r *OrganizationRepository) GetByIDWithDetails(id uint) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Preload("Owner").
		Preload("Members").
		Preload("Members.User").
		Preload("Workspaces").
		Preload("Workspaces.Admin").
		Preload("Roles").
		First(&org, id).Error
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetBySlug gets an organization by slug
func (r *OrganizationRepository) GetBySlug(slug string) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Where("slug = ?", strings.ToLower(slug)).First(&org).Error
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetByInviteCode gets an organization by invite code
func (r *OrganizationRepository) GetByInviteCode(code string) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Where("invite_code = ? AND allow_invite_link = true AND is_active = true", code).First(&org).Error
	if err != nil {
		return nil, err
	}
	return &org, nil
}

// GetByOwnerID gets all organizations owned by a user
func (r *OrganizationRepository) GetByOwnerID(ownerID uint) ([]models.Organization, error) {
	var orgs []models.Organization
	err := r.db.Where("owner_id = ?", ownerID).Find(&orgs).Error
	return orgs, err
}

// Update updates an organization
func (r *OrganizationRepository) Update(org *models.Organization) error {
	return r.db.Save(org).Error
}

// Delete soft deletes an organization
func (r *OrganizationRepository) Delete(id uint) error {
	return r.db.Delete(&models.Organization{}, id).Error
}

// GetMemberCount gets the member count of an organization
func (r *OrganizationRepository) GetMemberCount(orgID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND is_active = true AND deleted_at IS NULL", orgID).
		Count(&count).Error
	return count, err
}

// GetWorkspaceCount gets the workspace count of an organization
func (r *OrganizationRepository) GetWorkspaceCount(orgID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Workspace{}).
		Where("organization_id = ? AND is_active = true AND deleted_at IS NULL", orgID).
		Count(&count).Error
	return count, err
}

// SlugExists checks if a slug already exists
func (r *OrganizationRepository) SlugExists(slug string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Organization{}).Where("slug = ?", strings.ToLower(slug)).Count(&count).Error
	return count > 0, err
}

// RegenerateInviteCode generates a new invite code for the organization
func (r *OrganizationRepository) RegenerateInviteCode(orgID uint) (string, error) {
	newCode := generateInviteCode()
	err := r.db.Model(&models.Organization{}).Where("id = ?", orgID).Update("invite_code", newCode).Error
	return newCode, err
}

// ============================================================================
// ORGANIZATION MEMBER OPERATIONS
// ============================================================================

// AddMember adds a member to an organization
func (r *OrganizationRepository) AddMember(member *models.OrganizationMember) error {
	return r.db.Create(member).Error
}

// GetMember gets a member by organization and user ID
func (r *OrganizationRepository) GetMember(orgID, userID uint) (*models.OrganizationMember, error) {
	var member models.OrganizationMember
	err := r.db.Where("organization_id = ? AND user_id = ?", orgID, userID).First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

// GetMemberWithUser gets a member with user details
func (r *OrganizationRepository) GetMemberWithUser(orgID, userID uint) (*models.OrganizationMember, error) {
	var member models.OrganizationMember
	err := r.db.Preload("User").
		Where("organization_id = ? AND user_id = ?", orgID, userID).
		First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, nil
}

// GetMembersByOrgID gets all members of an organization
func (r *OrganizationRepository) GetMembersByOrgID(orgID uint) ([]models.OrganizationMember, error) {
	var members []models.OrganizationMember
	err := r.db.Preload("User").
		Where("organization_id = ? AND is_active = true", orgID).
		Find(&members).Error
	return members, err
}

// GetUserOrganizations gets all organizations a user belongs to
func (r *OrganizationRepository) GetUserOrganizations(userID uint) ([]models.OrganizationMember, error) {
	var memberships []models.OrganizationMember
	err := r.db.Preload("Organization").
		Preload("Organization.Owner").
		Where("user_id = ? AND is_active = true", userID).
		Find(&memberships).Error
	return memberships, err
}

// UpdateMember updates a member
func (r *OrganizationRepository) UpdateMember(member *models.OrganizationMember) error {
	return r.db.Save(member).Error
}

// RemoveMember removes a member from an organization (soft delete)
func (r *OrganizationRepository) RemoveMember(orgID, userID uint) error {
	return r.db.Where("organization_id = ? AND user_id = ?", orgID, userID).
		Delete(&models.OrganizationMember{}).Error
}

// IsMember checks if a user is a member of an organization
func (r *OrganizationRepository) IsMember(orgID, userID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND user_id = ? AND is_active = true AND deleted_at IS NULL", orgID, userID).
		Count(&count).Error
	return count > 0, err
}

// IsOwner checks if a user is the owner of an organization
func (r *OrganizationRepository) IsOwner(orgID, userID uint) (bool, error) {
	var org models.Organization
	err := r.db.Select("owner_id").Where("id = ?", orgID).First(&org).Error
	if err != nil {
		return false, err
	}
	return org.OwnerID == userID, nil
}

// IsAdmin checks if a user is an admin (owner or admin role) of an organization
func (r *OrganizationRepository) IsAdmin(orgID, userID uint) (bool, error) {
	// Check if owner
	isOwner, err := r.IsOwner(orgID, userID)
	if err != nil {
		return false, err
	}
	if isOwner {
		return true, nil
	}

	// Check if admin role
	var count int64
	err = r.db.Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND user_id = ? AND role IN ('owner', 'admin') AND is_active = true AND deleted_at IS NULL", orgID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetMemberRole gets the role of a member in an organization
func (r *OrganizationRepository) GetMemberRole(orgID, userID uint) (string, error) {
	// First check if owner
	isOwner, err := r.IsOwner(orgID, userID)
	if err != nil {
		return "", err
	}
	if isOwner {
		return models.OrgRoleOwner, nil
	}

	// Get member role
	member, err := r.GetMember(orgID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil // Not a member
		}
		return "", err
	}
	return member.Role, nil
}

// TransferOwnership transfers organization ownership to another user
func (r *OrganizationRepository) TransferOwnership(orgID, newOwnerID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Update organization owner
		if err := tx.Model(&models.Organization{}).
			Where("id = ?", orgID).
			Update("owner_id", newOwnerID).Error; err != nil {
			return err
		}

		// Update the new owner's role to owner
		if err := tx.Model(&models.OrganizationMember{}).
			Where("organization_id = ? AND user_id = ?", orgID, newOwnerID).
			Update("role", models.OrgRoleOwner).Error; err != nil {
			return err
		}

		return nil
	})
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// generateInviteCode generates a random invite code
func generateInviteCode() string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	return strings.ToUpper(hex.EncodeToString(bytes))[:8]
}
