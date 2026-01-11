package repository

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// InvitationRepository handles database operations for invitations
type InvitationRepository struct {
	db *gorm.DB
}

// NewInvitationRepository creates a new invitation repository
func NewInvitationRepository(db *gorm.DB) *InvitationRepository {
	return &InvitationRepository{db: db}
}

// ============================================================================
// INVITATION CRUD
// ============================================================================

// Create creates a new invitation
func (r *InvitationRepository) Create(invitation *models.Invitation) error {
	// Generate token if not provided
	if invitation.Token == "" {
		invitation.Token = generateInvitationToken()
	}
	return r.db.Create(invitation).Error
}

// GetByID gets an invitation by ID
func (r *InvitationRepository) GetByID(id uint) (*models.Invitation, error) {
	var invitation models.Invitation
	err := r.db.Preload("Organization").
		Preload("Workspace").
		Preload("Inviter").
		Preload("WorkspaceRole").
		First(&invitation, id).Error
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

// GetByToken gets an invitation by token
func (r *InvitationRepository) GetByToken(token string) (*models.Invitation, error) {
	var invitation models.Invitation
	err := r.db.Preload("Organization").
		Preload("Workspace").
		Preload("Inviter").
		Preload("WorkspaceRole").
		Where("token = ?", token).
		First(&invitation).Error
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

// GetByEmail gets invitations by email
func (r *InvitationRepository) GetByEmail(email string) ([]models.Invitation, error) {
	var invitations []models.Invitation
	err := r.db.Preload("Organization").
		Preload("Workspace").
		Preload("Inviter").
		Where("email = ? AND status = ?", email, models.InvitationStatusPending).
		Find(&invitations).Error
	return invitations, err
}

// GetByOrganizationID gets all invitations for an organization
func (r *InvitationRepository) GetByOrganizationID(orgID uint) ([]models.Invitation, error) {
	var invitations []models.Invitation
	err := r.db.Preload("Workspace").
		Preload("Inviter").
		Preload("WorkspaceRole").
		Where("organization_id = ?", orgID).
		Order("created_at DESC").
		Find(&invitations).Error
	return invitations, err
}

// GetPendingByOrganizationID gets pending invitations for an organization
func (r *InvitationRepository) GetPendingByOrganizationID(orgID uint) ([]models.Invitation, error) {
	var invitations []models.Invitation
	err := r.db.Preload("Workspace").
		Preload("Inviter").
		Preload("WorkspaceRole").
		Where("organization_id = ? AND status = ?", orgID, models.InvitationStatusPending).
		Order("created_at DESC").
		Find(&invitations).Error
	return invitations, err
}

// Update updates an invitation
func (r *InvitationRepository) Update(invitation *models.Invitation) error {
	return r.db.Save(invitation).Error
}

// Delete soft deletes an invitation
func (r *InvitationRepository) Delete(id uint) error {
	return r.db.Delete(&models.Invitation{}, id).Error
}

// ============================================================================
// INVITATION ACTIONS
// ============================================================================

// Accept accepts an invitation
func (r *InvitationRepository) Accept(invitationID, accepterID uint) error {
	now := time.Now()
	return r.db.Model(&models.Invitation{}).
		Where("id = ?", invitationID).
		Updates(map[string]interface{}{
			"status":      models.InvitationStatusAccepted,
			"accepted_at": now,
			"accepted_by": accepterID,
		}).Error
}

// Revoke revokes an invitation
func (r *InvitationRepository) Revoke(invitationID uint) error {
	return r.db.Model(&models.Invitation{}).
		Where("id = ?", invitationID).
		Update("status", models.InvitationStatusRevoked).Error
}

// ExpireOldInvitations marks expired invitations
func (r *InvitationRepository) ExpireOldInvitations() error {
	return r.db.Model(&models.Invitation{}).
		Where("status = ? AND expires_at < ?", models.InvitationStatusPending, time.Now()).
		Update("status", models.InvitationStatusExpired).Error
}

// ============================================================================
// VALIDATION
// ============================================================================

// IsValid checks if an invitation is valid (pending and not expired)
func (r *InvitationRepository) IsValid(invitation *models.Invitation) bool {
	return invitation.Status == models.InvitationStatusPending && invitation.ExpiresAt.After(time.Now())
}

// HasPendingInvitation checks if an email has a pending invitation for an organization
func (r *InvitationRepository) HasPendingInvitation(orgID uint, email string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Invitation{}).
		Where("organization_id = ? AND email = ? AND status = ? AND expires_at > ?",
			orgID, email, models.InvitationStatusPending, time.Now()).
		Count(&count).Error
	return count > 0, err
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// generateInvitationToken generates a random invitation token
func generateInvitationToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
