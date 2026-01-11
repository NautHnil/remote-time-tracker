package service

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

// InvitationService handles invitation business logic
type InvitationService interface {
	// Invitation CRUD
	Create(orgID, inviterID uint, req *dto.CreateInvitationRequest) (*dto.InvitationResponse, error)
	GetByID(invitationID, userID uint) (*dto.InvitationResponse, error)
	GetByToken(token string) (*dto.InvitationResponse, error)
	Revoke(invitationID, userID uint) error

	// Invitation lists
	GetPendingByOrg(orgID, userID uint) ([]dto.InvitationResponse, error)
	GetByEmail(email string) ([]dto.InvitationResponse, error)

	// Accept invitation
	Accept(token string, userID uint) (*dto.OrganizationMemberResponse, error)

	// Maintenance
	ExpireOldInvitations() error
}

type invitationService struct {
	invitationRepo *repository.InvitationRepository
	orgRepo        *repository.OrganizationRepository
	workspaceRepo  *repository.WorkspaceRepository
	userRepo       repository.UserRepository
}

// NewInvitationService creates a new invitation service
func NewInvitationService(
	invitationRepo *repository.InvitationRepository,
	orgRepo *repository.OrganizationRepository,
	workspaceRepo *repository.WorkspaceRepository,
	userRepo repository.UserRepository,
) InvitationService {
	return &invitationService{
		invitationRepo: invitationRepo,
		orgRepo:        orgRepo,
		workspaceRepo:  workspaceRepo,
		userRepo:       userRepo,
	}
}

// ============================================================================
// INVITATION CRUD
// ============================================================================

func (s *invitationService) Create(orgID, inviterID uint, req *dto.CreateInvitationRequest) (*dto.InvitationResponse, error) {
	// Check if inviter is org admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, inviterID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only organization admins can create invitations")
	}

	// Check if email already has pending invitation
	hasPending, err := s.invitationRepo.HasPendingInvitation(orgID, req.Email)
	if err != nil {
		return nil, err
	}
	if hasPending {
		return nil, errors.New("this email already has a pending invitation to this organization")
	}

	// Check if user with this email is already a member
	user, _ := s.userRepo.FindByEmail(req.Email)
	if user != nil {
		isMember, _ := s.orgRepo.IsMember(orgID, user.ID)
		if isMember {
			return nil, errors.New("user with this email is already a member of this organization")
		}
	}

	// Validate workspace if provided
	if req.WorkspaceID != nil {
		workspace, err := s.workspaceRepo.GetByID(*req.WorkspaceID)
		if err != nil {
			return nil, errors.New("workspace not found")
		}
		if workspace.OrganizationID != orgID {
			return nil, errors.New("workspace does not belong to this organization")
		}
	}

	// Set expiry (default 7 days)
	expiresInDays := req.ExpiresInDays
	if expiresInDays <= 0 {
		expiresInDays = 7
	}
	expiresAt := time.Now().AddDate(0, 0, expiresInDays)

	// Create invitation
	invitation := &models.Invitation{
		OrganizationID:  orgID,
		WorkspaceID:     req.WorkspaceID,
		Email:           req.Email,
		OrgRole:         req.OrgRole,
		WorkspaceRoleID: req.WorkspaceRoleID,
		InvitedBy:       inviterID,
		Status:          models.InvitationStatusPending,
		ExpiresAt:       expiresAt,
		Message:         req.Message,
	}

	if err := s.invitationRepo.Create(invitation); err != nil {
		return nil, err
	}

	// Load full invitation with relations
	fullInvitation, err := s.invitationRepo.GetByID(invitation.ID)
	if err != nil {
		return nil, err
	}

	return s.toInvitationResponse(fullInvitation, true), nil
}

func (s *invitationService) GetByID(invitationID, userID uint) (*dto.InvitationResponse, error) {
	invitation, err := s.invitationRepo.GetByID(invitationID)
	if err != nil {
		return nil, err
	}

	// Check if user is org admin or the invitee
	user, _ := s.userRepo.FindByID(userID)
	isAdmin, _ := s.orgRepo.IsAdmin(invitation.OrganizationID, userID)
	isInvitee := user != nil && user.Email == invitation.Email

	if !isAdmin && !isInvitee {
		return nil, errors.New("access denied")
	}

	return s.toInvitationResponse(invitation, isAdmin), nil
}

func (s *invitationService) GetByToken(token string) (*dto.InvitationResponse, error) {
	invitation, err := s.invitationRepo.GetByToken(token)
	if err != nil {
		return nil, errors.New("invitation not found")
	}

	// Check if still valid
	if !s.invitationRepo.IsValid(invitation) {
		if invitation.Status == models.InvitationStatusPending && invitation.ExpiresAt.Before(time.Now()) {
			// Mark as expired
			s.invitationRepo.Revoke(invitation.ID)
			return nil, errors.New("invitation has expired")
		}
		return nil, errors.New("invitation is no longer valid")
	}

	return s.toInvitationResponse(invitation, false), nil
}

func (s *invitationService) Revoke(invitationID, userID uint) error {
	invitation, err := s.invitationRepo.GetByID(invitationID)
	if err != nil {
		return err
	}

	// Check if user is org admin
	isAdmin, err := s.orgRepo.IsAdmin(invitation.OrganizationID, userID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("access denied: only organization admins can revoke invitations")
	}

	return s.invitationRepo.Revoke(invitationID)
}

// ============================================================================
// INVITATION LISTS
// ============================================================================

func (s *invitationService) GetPendingByOrg(orgID, userID uint) ([]dto.InvitationResponse, error) {
	// Check if user is org admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only organization admins can view invitations")
	}

	invitations, err := s.invitationRepo.GetPendingByOrganizationID(orgID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.InvitationResponse, 0, len(invitations))
	for _, inv := range invitations {
		result = append(result, *s.toInvitationResponse(&inv, true))
	}

	return result, nil
}

func (s *invitationService) GetByEmail(email string) ([]dto.InvitationResponse, error) {
	invitations, err := s.invitationRepo.GetByEmail(email)
	if err != nil {
		return nil, err
	}

	result := make([]dto.InvitationResponse, 0, len(invitations))
	for _, inv := range invitations {
		result = append(result, *s.toInvitationResponse(&inv, false))
	}

	return result, nil
}

// ============================================================================
// ACCEPT INVITATION
// ============================================================================

func (s *invitationService) Accept(token string, userID uint) (*dto.OrganizationMemberResponse, error) {
	invitation, err := s.invitationRepo.GetByToken(token)
	if err != nil {
		return nil, errors.New("invitation not found")
	}

	// Check if still valid
	if !s.invitationRepo.IsValid(invitation) {
		return nil, errors.New("invitation is no longer valid or has expired")
	}

	// Get user
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Check if email matches (optional - can be removed for more flexibility)
	if user.Email != invitation.Email {
		return nil, errors.New("invitation was sent to a different email address")
	}

	// Check if already a member
	isMember, err := s.orgRepo.IsMember(invitation.OrganizationID, userID)
	if err != nil {
		return nil, err
	}
	if isMember {
		// Mark invitation as accepted anyway
		s.invitationRepo.Accept(invitation.ID, userID)
		return nil, errors.New("you are already a member of this organization")
	}

	// Check member limit
	org, err := s.orgRepo.GetByID(invitation.OrganizationID)
	if err != nil {
		return nil, err
	}

	memberCount, _ := s.orgRepo.GetMemberCount(org.ID)
	if int(memberCount) >= org.MaxMembers {
		return nil, errors.New("organization has reached maximum member limit")
	}

	// Add to organization
	orgMember := &models.OrganizationMember{
		OrganizationID: invitation.OrganizationID,
		UserID:         userID,
		Role:           invitation.OrgRole,
		InvitedBy:      &invitation.InvitedBy,
		JoinedAt:       time.Now(),
		IsActive:       true,
	}

	if err := s.orgRepo.AddMember(orgMember); err != nil {
		return nil, err
	}

	// If workspace specified, add to workspace too
	if invitation.WorkspaceID != nil {
		wsMember := &models.WorkspaceMember{
			WorkspaceID:     *invitation.WorkspaceID,
			UserID:          userID,
			WorkspaceRoleID: invitation.WorkspaceRoleID,
			AddedBy:         &invitation.InvitedBy,
			JoinedAt:        time.Now(),
			IsActive:        true,
		}

		// Set role name if role ID provided
		if invitation.WorkspaceRoleID != nil {
			role, _ := s.workspaceRepo.GetRoleByID(*invitation.WorkspaceRoleID)
			if role != nil {
				wsMember.RoleName = role.Name
			}
		}

		s.workspaceRepo.AddMember(wsMember)
	}

	// Mark invitation as accepted
	s.invitationRepo.Accept(invitation.ID, userID)

	orgMember.User = *user

	return &dto.OrganizationMemberResponse{
		ID:        orgMember.ID,
		UserID:    orgMember.UserID,
		User:      s.toUserResponse(user),
		Role:      orgMember.Role,
		JoinedAt:  orgMember.JoinedAt,
		IsActive:  orgMember.IsActive,
		InvitedBy: orgMember.InvitedBy,
	}, nil
}

// ============================================================================
// MAINTENANCE
// ============================================================================

func (s *invitationService) ExpireOldInvitations() error {
	return s.invitationRepo.ExpireOldInvitations()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func (s *invitationService) toInvitationResponse(inv *models.Invitation, showToken bool) *dto.InvitationResponse {
	response := &dto.InvitationResponse{
		ID:              inv.ID,
		OrganizationID:  inv.OrganizationID,
		WorkspaceID:     inv.WorkspaceID,
		Email:           inv.Email,
		OrgRole:         inv.OrgRole,
		WorkspaceRoleID: inv.WorkspaceRoleID,
		InvitedBy:       inv.InvitedBy,
		Status:          inv.Status,
		ExpiresAt:       inv.ExpiresAt,
		AcceptedAt:      inv.AcceptedAt,
		Message:         inv.Message,
		CreatedAt:       inv.CreatedAt,
	}

	if showToken {
		response.Token = inv.Token
		// Generate invite link (would use config for base URL)
		response.InviteLink = "/invitations/accept/" + inv.Token
	}

	// Organization
	if inv.Organization.ID > 0 {
		memberCount, _ := s.orgRepo.GetMemberCount(inv.Organization.ID)
		wsCount, _ := s.orgRepo.GetWorkspaceCount(inv.Organization.ID)
		response.Organization = &dto.OrganizationResponse{
			ID:             inv.Organization.ID,
			Name:           inv.Organization.Name,
			Slug:           inv.Organization.Slug,
			Description:    inv.Organization.Description,
			LogoURL:        inv.Organization.LogoURL,
			MemberCount:    memberCount,
			WorkspaceCount: wsCount,
		}
	}

	// Workspace
	if inv.Workspace != nil && inv.Workspace.ID > 0 {
		response.Workspace = &dto.WorkspaceResponse{
			ID:             inv.Workspace.ID,
			OrganizationID: inv.Workspace.OrganizationID,
			Name:           inv.Workspace.Name,
			Slug:           inv.Workspace.Slug,
			Color:          inv.Workspace.Color,
			Icon:           inv.Workspace.Icon,
		}
	}

	// Workspace Role
	if inv.WorkspaceRole != nil && inv.WorkspaceRole.ID > 0 {
		response.WorkspaceRole = &dto.WorkspaceRoleResponse{
			ID:          inv.WorkspaceRole.ID,
			Name:        inv.WorkspaceRole.Name,
			DisplayName: inv.WorkspaceRole.DisplayName,
			Color:       inv.WorkspaceRole.Color,
		}
	}

	// Inviter
	if inv.Inviter.ID > 0 {
		response.Inviter = s.toUserResponse(&inv.Inviter)
	}

	return response
}

func (s *invitationService) toUserResponse(u *models.User) *dto.UserResponse {
	return &dto.UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      u.Role,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
}
