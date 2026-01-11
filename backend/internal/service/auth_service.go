package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
)

// AuthService handles authentication logic
type AuthService interface {
	Register(req *dto.RegisterRequest) (*dto.LoginResponse, error)
	Login(req *dto.LoginRequest) (*dto.LoginResponse, error)
	RefreshToken(refreshToken string) (*dto.LoginResponse, error)
	GetUserByID(userID uint) (*models.User, error)
}

type authService struct {
	userRepo       repository.UserRepository
	orgRepo        *repository.OrganizationRepository
	invitationRepo *repository.InvitationRepository
	workspaceRepo  *repository.WorkspaceRepository
}

// NewAuthService creates a new auth service
func NewAuthService(
	userRepo repository.UserRepository,
	orgRepo *repository.OrganizationRepository,
	invitationRepo *repository.InvitationRepository,
	workspaceRepo *repository.WorkspaceRepository,
) AuthService {
	return &authService{
		userRepo:       userRepo,
		orgRepo:        orgRepo,
		invitationRepo: invitationRepo,
		workspaceRepo:  workspaceRepo,
	}
}

func (s *authService) Register(req *dto.RegisterRequest) (*dto.LoginResponse, error) {
	// Validate organization options
	hasCreateOrg := req.CreateOrganization && req.OrganizationName != ""
	hasInviteCode := req.InviteCode != ""
	hasInvitationToken := req.InvitationToken != ""

	// Count how many org options are provided
	optionCount := 0
	if hasCreateOrg {
		optionCount++
	}
	if hasInviteCode {
		optionCount++
	}
	if hasInvitationToken {
		optionCount++
	}

	// Must have exactly one organization option
	if optionCount == 0 {
		return nil, errors.New("must either create a new organization, join with invite code, or accept an invitation")
	}
	if optionCount > 1 {
		return nil, errors.New("can only use one organization option: create, invite code, or invitation token")
	}

	// Check if user already exists
	existingUser, _ := s.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// Validate organization options before creating user
	var pendingInvitation *models.Invitation
	var joinOrg *models.Organization

	if hasInvitationToken {
		// Validate invitation token
		invitation, err := s.invitationRepo.GetByToken(req.InvitationToken)
		if err != nil {
			return nil, errors.New("invalid or expired invitation token")
		}
		if invitation.Status != models.InvitationStatusPending {
			return nil, errors.New("invitation has already been used or expired")
		}
		if invitation.Email != req.Email {
			return nil, errors.New("invitation was sent to a different email address")
		}
		pendingInvitation = invitation
	} else if hasInviteCode {
		// Validate organization invite code
		org, err := s.orgRepo.GetByInviteCode(req.InviteCode)
		if err != nil {
			return nil, errors.New("invalid organization invite code")
		}
		if !org.IsActive {
			return nil, errors.New("organization is not active")
		}
		joinOrg = org
	} else if hasCreateOrg {
		// Check if organization slug already exists
		slug := req.OrganizationSlug
		if slug == "" {
			slug = utils.GenerateSlug(req.OrganizationName)
		}
		existing, _ := s.orgRepo.GetBySlug(slug)
		if existing != nil {
			return nil, fmt.Errorf("organization slug '%s' is already taken", slug)
		}
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         "user",
		IsActive:     true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, errors.New("failed to create user")
	}

	// Handle organization membership
	if hasCreateOrg {
		// Create new organization with user as owner
		if err := s.createOrganizationForUser(user, req.OrganizationName, req.OrganizationSlug); err != nil {
			// Rollback user creation
			s.userRepo.Delete(user.ID)
			return nil, fmt.Errorf("failed to create organization: %v", err)
		}
	} else if hasInviteCode {
		// Join organization via invite code
		if err := s.joinOrganization(user, joinOrg); err != nil {
			// Rollback user creation
			s.userRepo.Delete(user.ID)
			return nil, fmt.Errorf("failed to join organization: %v", err)
		}
	} else if hasInvitationToken {
		// Accept invitation
		if err := s.acceptInvitation(user, pendingInvitation); err != nil {
			// Rollback user creation
			s.userRepo.Delete(user.ID)
			return nil, fmt.Errorf("failed to accept invitation: %v", err)
		}
	}

	// Generate tokens
	accessToken, expiresAt, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, _, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Update last login
	s.userRepo.UpdateLastLogin(user.ID)

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User: dto.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}

// createOrganizationForUser creates a new organization with user as owner
func (s *authService) createOrganizationForUser(user *models.User, orgName, orgSlug string) error {
	slug := orgSlug
	if slug == "" {
		slug = utils.GenerateSlug(orgName)
	}

	// Generate invite code
	inviteCode := utils.GenerateInviteCode()

	org := &models.Organization{
		Name:       orgName,
		Slug:       slug,
		OwnerID:    user.ID,
		InviteCode: inviteCode,
		IsActive:   true,
	}

	if err := s.orgRepo.Create(org); err != nil {
		return err
	}

	// Add user as owner member
	member := &models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         user.ID,
		Role:           models.OrgRoleOwner,
	}

	if err := s.orgRepo.AddMember(member); err != nil {
		return err
	}

	// Create default workspace roles for this organization
	defaultRoles := []struct {
		Name        string
		Description string
	}{
		{"Project Manager", "Manages project timeline, resources, and deliverables"},
		{"Business Analyst", "Gathers requirements and bridges business and technical teams"},
		{"Developer", "Implements features and fixes bugs"},
		{"Designer", "Creates UI/UX designs and visual assets"},
		{"QA Engineer", "Tests software and ensures quality standards"},
		{"DevOps", "Manages infrastructure and deployment pipelines"},
	}

	for _, role := range defaultRoles {
		workspaceRole := &models.WorkspaceRole{
			OrganizationID: org.ID,
			Name:           role.Name,
			Description:    role.Description,
		}
		s.workspaceRepo.CreateRole(workspaceRole)
	}

	// Create default "General" workspace for the organization
	defaultWorkspace := &models.Workspace{
		OrganizationID: org.ID,
		Name:           "General",
		Slug:           "general",
		Description:    "Default workspace for general tasks",
		AdminID:        user.ID,
		IsActive:       true,
	}
	if err := s.workspaceRepo.Create(defaultWorkspace); err != nil {
		// Log error but don't fail - workspace can be created later
	} else {
		// Add owner as workspace member with default role (or without role if none exists)
		defaultRole, _ := s.workspaceRepo.GetDefaultRole(org.ID)
		wsMember := &models.WorkspaceMember{
			WorkspaceID: defaultWorkspace.ID,
			UserID:      user.ID,
			JoinedAt:    time.Now(),
			IsActive:    true,
			IsAdmin:     true, // Owner of org should be admin of default workspace
		}
		if defaultRole != nil {
			wsMember.WorkspaceRoleID = &defaultRole.ID
		}
		s.workspaceRepo.AddMember(wsMember)
	}

	return nil
}

// joinOrganization adds user to an existing organization
func (s *authService) joinOrganization(user *models.User, org *models.Organization) error {
	member := &models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         user.ID,
		Role:           models.OrgRoleMember,
	}

	return s.orgRepo.AddMember(member)
}

// acceptInvitation accepts a pending invitation
func (s *authService) acceptInvitation(user *models.User, invitation *models.Invitation) error {
	// Add user to organization
	orgMember := &models.OrganizationMember{
		OrganizationID: invitation.OrganizationID,
		UserID:         user.ID,
		Role:           models.OrgRoleMember,
	}

	if err := s.orgRepo.AddMember(orgMember); err != nil {
		return err
	}

	// If workspace is specified, add user to workspace
	if invitation.WorkspaceID != nil && invitation.WorkspaceRoleID != nil {
		workspaceMember := &models.WorkspaceMember{
			WorkspaceID:     *invitation.WorkspaceID,
			UserID:          user.ID,
			WorkspaceRoleID: invitation.WorkspaceRoleID,
		}

		if err := s.workspaceRepo.AddMember(workspaceMember); err != nil {
			return err
		}
	}

	// Mark invitation as accepted
	return s.invitationRepo.Accept(invitation.ID, user.ID)
}

func (s *authService) Login(req *dto.LoginRequest) (*dto.LoginResponse, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check if user is active
	if !user.IsActive {
		return nil, errors.New("user account is inactive")
	}

	// Check password
	if err := utils.CheckPassword(req.Password, user.PasswordHash); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	accessToken, expiresAt, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, _, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Update last login
	s.userRepo.UpdateLastLogin(user.ID)

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User: dto.UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			FirstName:   user.FirstName,
			LastName:    user.LastName,
			Role:        user.Role,
			IsActive:    user.IsActive,
			LastLoginAt: user.LastLoginAt,
			CreatedAt:   user.CreatedAt,
		},
	}, nil
}

func (s *authService) RefreshToken(refreshToken string) (*dto.LoginResponse, error) {
	// Validate refresh token
	claims, err := utils.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Get user
	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if !user.IsActive {
		return nil, errors.New("user account is inactive")
	}

	// Generate new tokens
	accessToken, expiresAt, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	newRefreshToken, _, err := utils.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    expiresAt,
		User: dto.UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			FirstName:   user.FirstName,
			LastName:    user.LastName,
			Role:        user.Role,
			IsActive:    user.IsActive,
			LastLoginAt: user.LastLoginAt,
			CreatedAt:   user.CreatedAt,
		},
	}, nil
}

// GetUserByID retrieves a user by ID for verification
func (s *authService) GetUserByID(userID uint) (*models.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if !user.IsActive {
		return nil, errors.New("user account is inactive")
	}

	return user, nil
}
