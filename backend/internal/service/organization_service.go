package service

import (
	"errors"
	"strings"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/gosimple/slug"
)

// OrganizationService handles organization business logic
type OrganizationService interface {
	// Organization CRUD
	Create(userID uint, req *dto.CreateOrganizationRequest) (*dto.OrganizationResponse, error)
	GetByID(orgID, userID uint) (*dto.OrganizationResponse, error)
	GetByIDWithDetails(orgID, userID uint) (*dto.OrganizationResponse, error)
	Update(orgID, userID uint, req *dto.UpdateOrganizationRequest) (*dto.OrganizationResponse, error)
	Delete(orgID, userID uint) error

	// User's organizations
	GetUserOrganizations(userID uint) ([]dto.OrganizationListResponse, error)

	// Member management
	AddMember(orgID, actorID uint, req *dto.AddOrganizationMemberRequest) (*dto.OrganizationMemberResponse, error)
	UpdateMember(orgID, memberUserID, actorID uint, req *dto.UpdateOrganizationMemberRequest) (*dto.OrganizationMemberResponse, error)
	RemoveMember(orgID, memberUserID, actorID uint) error
	GetMembers(orgID, userID uint) ([]dto.OrganizationMemberResponse, error)

	// Join by invite code
	GetOrgByInviteCode(code string) (*dto.OrganizationPublicInfo, error)
	JoinByInviteCode(userID uint, code string) (*dto.OrganizationMemberResponse, error)

	// Misc
	RegenerateInviteCode(orgID, userID uint) (string, error)
	TransferOwnership(orgID, actorID uint, req *dto.TransferOwnershipRequest) error

	// Permission checks (exposed for middleware)
	IsOwner(orgID, userID uint) (bool, error)
	IsAdmin(orgID, userID uint) (bool, error)
	IsMember(orgID, userID uint) (bool, error)
	GetMemberRole(orgID, userID uint) (string, error)
}

type organizationService struct {
	orgRepo       *repository.OrganizationRepository
	workspaceRepo *repository.WorkspaceRepository
	userRepo      repository.UserRepository
}

// NewOrganizationService creates a new organization service
func NewOrganizationService(
	orgRepo *repository.OrganizationRepository,
	workspaceRepo *repository.WorkspaceRepository,
	userRepo repository.UserRepository,
) OrganizationService {
	return &organizationService{
		orgRepo:       orgRepo,
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
	}
}

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

func (s *organizationService) Create(userID uint, req *dto.CreateOrganizationRequest) (*dto.OrganizationResponse, error) {
	// Generate slug from name
	orgSlug := slug.Make(req.Name)

	// Check if slug exists
	exists, err := s.orgRepo.SlugExists(orgSlug)
	if err != nil {
		return nil, err
	}

	// Append timestamp if slug exists
	if exists {
		orgSlug = orgSlug + "-" + time.Now().Format("20060102150405")
	}

	// Use provided slug if available
	if req.Slug != "" {
		exists, err = s.orgRepo.SlugExists(req.Slug)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("slug already exists")
		}
		orgSlug = strings.ToLower(req.Slug)
	}

	// Create organization
	org := &models.Organization{
		Name:            req.Name,
		Slug:            orgSlug,
		Description:     req.Description,
		LogoURL:         req.LogoURL,
		OwnerID:         userID,
		AllowInviteLink: true,
		MaxMembers:      100,
		IsActive:        true,
	}

	if err := s.orgRepo.Create(org); err != nil {
		return nil, err
	}

	// Add owner as member with owner role
	member := &models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         userID,
		Role:           models.OrgRoleOwner,
		JoinedAt:       time.Now(),
		IsActive:       true,
	}

	if err := s.orgRepo.AddMember(member); err != nil {
		// Rollback org creation
		s.orgRepo.Delete(org.ID)
		return nil, err
	}

	// Create default workspace roles
	if err := s.workspaceRepo.CreateDefaultRoles(org.ID); err != nil {
		// Log error but don't fail
		// Roles can be created later
	}

	// Create default "General" workspace for the organization
	defaultWorkspace := &models.Workspace{
		OrganizationID: org.ID,
		Name:           "General",
		Slug:           "general",
		Description:    "Default workspace for general tasks",
		AdminID:        userID,
		IsActive:       true,
	}
	if err := s.workspaceRepo.Create(defaultWorkspace); err != nil {
		// Log error but don't fail - workspace can be created later
	} else {
		// Add owner as workspace member with default role (or without role if none exists)
		defaultRole, _ := s.workspaceRepo.GetDefaultRole(org.ID)
		wsMember := &models.WorkspaceMember{
			WorkspaceID: defaultWorkspace.ID,
			UserID:      userID,
			JoinedAt:    time.Now(),
			IsActive:    true,
			IsAdmin:     true, // Owner of org should be admin of default workspace
		}
		if defaultRole != nil {
			wsMember.WorkspaceRoleID = &defaultRole.ID
		}
		s.workspaceRepo.AddMember(wsMember)
	}

	// Get user for response
	user, _ := s.userRepo.FindByID(userID)

	return s.toOrganizationResponse(org, user, 1, 1, models.OrgRoleOwner), nil
}

func (s *organizationService) GetByID(orgID, userID uint) (*dto.OrganizationResponse, error) {
	// Check if user is member
	isMember, err := s.orgRepo.IsMember(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("access denied: not a member of this organization")
	}

	org, err := s.orgRepo.GetByID(orgID)
	if err != nil {
		return nil, err
	}

	memberCount, _ := s.orgRepo.GetMemberCount(orgID)
	workspaceCount, _ := s.orgRepo.GetWorkspaceCount(orgID)
	role, _ := s.orgRepo.GetMemberRole(orgID, userID)

	var owner *models.User
	if org.OwnerID > 0 {
		owner, _ = s.userRepo.FindByID(org.OwnerID)
	}

	return s.toOrganizationResponse(org, owner, memberCount, workspaceCount, role), nil
}

func (s *organizationService) GetByIDWithDetails(orgID, userID uint) (*dto.OrganizationResponse, error) {
	// Check if user is member
	isMember, err := s.orgRepo.IsMember(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("access denied: not a member of this organization")
	}

	org, err := s.orgRepo.GetByIDWithDetails(orgID)
	if err != nil {
		return nil, err
	}

	memberCount := int64(len(org.Members))
	workspaceCount := int64(len(org.Workspaces))
	role, _ := s.orgRepo.GetMemberRole(orgID, userID)

	response := s.toOrganizationResponse(org, &org.Owner, memberCount, workspaceCount, role)

	// Add members
	members := make([]dto.OrganizationMemberResponse, 0, len(org.Members))
	for _, m := range org.Members {
		members = append(members, *s.toMemberResponse(&m))
	}
	response.Members = members

	// Add workspaces
	workspaces := make([]dto.WorkspaceResponse, 0, len(org.Workspaces))
	for _, w := range org.Workspaces {
		wsMemberCount, _ := s.workspaceRepo.GetMemberCount(w.ID)
		wsTaskCount, _ := s.workspaceRepo.GetTaskCount(w.ID)
		workspaces = append(workspaces, *s.toWorkspaceResponse(&w, wsMemberCount, wsTaskCount))
	}
	response.Workspaces = workspaces

	return response, nil
}

func (s *organizationService) Update(orgID, userID uint, req *dto.UpdateOrganizationRequest) (*dto.OrganizationResponse, error) {
	// Check if user is admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only admins can update organization")
	}

	org, err := s.orgRepo.GetByID(orgID)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != nil {
		org.Name = *req.Name
	}
	if req.Description != nil {
		org.Description = *req.Description
	}
	if req.LogoURL != nil {
		org.LogoURL = *req.LogoURL
	}
	if req.AllowInviteLink != nil {
		org.AllowInviteLink = *req.AllowInviteLink
	}
	if req.ShareInviteCode != nil {
		org.ShareInviteCode = *req.ShareInviteCode
	}
	if req.MaxMembers != nil {
		org.MaxMembers = *req.MaxMembers
	}
	if req.IsActive != nil {
		org.IsActive = *req.IsActive
	}

	if err := s.orgRepo.Update(org); err != nil {
		return nil, err
	}

	return s.GetByID(orgID, userID)
}

func (s *organizationService) Delete(orgID, userID uint) error {
	// Only owner can delete organization
	isOwner, err := s.orgRepo.IsOwner(orgID, userID)
	if err != nil {
		return err
	}
	if !isOwner {
		return errors.New("access denied: only owner can delete organization")
	}

	return s.orgRepo.Delete(orgID)
}

// ============================================================================
// USER'S ORGANIZATIONS
// ============================================================================

func (s *organizationService) GetUserOrganizations(userID uint) ([]dto.OrganizationListResponse, error) {
	memberships, err := s.orgRepo.GetUserOrganizations(userID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OrganizationListResponse, 0, len(memberships))
	for _, m := range memberships {
		memberCount, _ := s.orgRepo.GetMemberCount(m.OrganizationID)
		workspaceCount, _ := s.orgRepo.GetWorkspaceCount(m.OrganizationID)

		result = append(result, dto.OrganizationListResponse{
			ID:             m.Organization.ID,
			Name:           m.Organization.Name,
			Slug:           m.Organization.Slug,
			LogoURL:        m.Organization.LogoURL,
			Role:           m.Role,
			MemberCount:    memberCount,
			WorkspaceCount: workspaceCount,
			IsActive:       m.Organization.IsActive,
			JoinedAt:       m.JoinedAt,
		})
	}

	return result, nil
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

func (s *organizationService) AddMember(orgID, actorID uint, req *dto.AddOrganizationMemberRequest) (*dto.OrganizationMemberResponse, error) {
	// Check if actor is admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, actorID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only admins can add members")
	}

	// Check if target user exists
	user, err := s.userRepo.FindByID(req.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Check if already a member
	isMember, err := s.orgRepo.IsMember(orgID, req.UserID)
	if err != nil {
		return nil, err
	}
	if isMember {
		return nil, errors.New("user is already a member of this organization")
	}

	// Check member limit
	org, err := s.orgRepo.GetByID(orgID)
	if err != nil {
		return nil, err
	}

	memberCount, _ := s.orgRepo.GetMemberCount(orgID)
	if int(memberCount) >= org.MaxMembers {
		return nil, errors.New("organization has reached maximum member limit")
	}

	// Create member
	member := &models.OrganizationMember{
		OrganizationID: orgID,
		UserID:         req.UserID,
		Role:           req.Role,
		InvitedBy:      &actorID,
		JoinedAt:       time.Now(),
		IsActive:       true,
	}

	if err := s.orgRepo.AddMember(member); err != nil {
		return nil, err
	}

	member.User = *user
	return s.toMemberResponse(member), nil
}

func (s *organizationService) UpdateMember(orgID, memberUserID, actorID uint, req *dto.UpdateOrganizationMemberRequest) (*dto.OrganizationMemberResponse, error) {
	// Check if actor is admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, actorID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only admins can update members")
	}

	// Get member
	member, err := s.orgRepo.GetMemberWithUser(orgID, memberUserID)
	if err != nil {
		return nil, errors.New("member not found")
	}

	// Prevent changing owner role unless by owner
	if member.Role == models.OrgRoleOwner && req.Role != models.OrgRoleOwner {
		isOwner, _ := s.orgRepo.IsOwner(orgID, actorID)
		if !isOwner {
			return nil, errors.New("only owner can change their own role")
		}
	}

	// Update fields
	if req.Role != "" {
		member.Role = req.Role
	}
	if req.IsActive != nil {
		member.IsActive = *req.IsActive
	}

	if err := s.orgRepo.UpdateMember(member); err != nil {
		return nil, err
	}

	return s.toMemberResponse(member), nil
}

func (s *organizationService) RemoveMember(orgID, memberUserID, actorID uint) error {
	// Check if actor is admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, actorID)
	if err != nil {
		return err
	}
	if !isAdmin {
		return errors.New("access denied: only admins can remove members")
	}

	// Prevent removing owner
	isOwner, err := s.orgRepo.IsOwner(orgID, memberUserID)
	if err != nil {
		return err
	}
	if isOwner {
		return errors.New("cannot remove organization owner")
	}

	return s.orgRepo.RemoveMember(orgID, memberUserID)
}

func (s *organizationService) GetMembers(orgID, userID uint) ([]dto.OrganizationMemberResponse, error) {
	// Check if user is member
	isMember, err := s.orgRepo.IsMember(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("access denied: not a member of this organization")
	}

	members, err := s.orgRepo.GetMembersByOrgID(orgID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OrganizationMemberResponse, 0, len(members))
	for _, m := range members {
		result = append(result, *s.toMemberResponse(&m))
	}

	return result, nil
}

// ============================================================================
// JOIN BY INVITE CODE
// ============================================================================

func (s *organizationService) GetOrgByInviteCode(code string) (*dto.OrganizationPublicInfo, error) {
	org, err := s.orgRepo.GetByInviteCode(code)
	if err != nil {
		return nil, errors.New("invalid invite code or organization not accepting new members")
	}

	memberCount, _ := s.orgRepo.GetMemberCount(org.ID)

	return &dto.OrganizationPublicInfo{
		ID:          org.ID,
		Name:        org.Name,
		Slug:        org.Slug,
		Description: org.Description,
		LogoURL:     org.LogoURL,
		MemberCount: memberCount,
	}, nil
}

func (s *organizationService) JoinByInviteCode(userID uint, code string) (*dto.OrganizationMemberResponse, error) {
	org, err := s.orgRepo.GetByInviteCode(code)
	if err != nil {
		return nil, errors.New("invalid invite code or organization not accepting new members")
	}

	// Check if already a member
	isMember, err := s.orgRepo.IsMember(org.ID, userID)
	if err != nil {
		return nil, err
	}
	if isMember {
		return nil, errors.New("you are already a member of this organization")
	}

	// Check member limit
	memberCount, _ := s.orgRepo.GetMemberCount(org.ID)
	if int(memberCount) >= org.MaxMembers {
		return nil, errors.New("organization has reached maximum member limit")
	}

	// Add as member
	member := &models.OrganizationMember{
		OrganizationID: org.ID,
		UserID:         userID,
		Role:           models.OrgRoleMember,
		JoinedAt:       time.Now(),
		IsActive:       true,
	}

	if err := s.orgRepo.AddMember(member); err != nil {
		return nil, err
	}

	user, _ := s.userRepo.FindByID(userID)
	member.User = *user

	return s.toMemberResponse(member), nil
}

// ============================================================================
// MISC
// ============================================================================

func (s *organizationService) RegenerateInviteCode(orgID, userID uint) (string, error) {
	// Check if user is admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, userID)
	if err != nil {
		return "", err
	}
	if !isAdmin {
		return "", errors.New("access denied: only admins can regenerate invite code")
	}

	return s.orgRepo.RegenerateInviteCode(orgID)
}

func (s *organizationService) TransferOwnership(orgID, actorID uint, req *dto.TransferOwnershipRequest) error {
	// Only current owner can transfer ownership
	isOwner, err := s.orgRepo.IsOwner(orgID, actorID)
	if err != nil {
		return err
	}
	if !isOwner {
		return errors.New("access denied: only owner can transfer ownership")
	}

	// Check if new owner is a member
	isMember, err := s.orgRepo.IsMember(orgID, req.NewOwnerID)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("new owner must be a member of the organization")
	}

	// Update old owner's role to admin
	oldMember, _ := s.orgRepo.GetMember(orgID, actorID)
	if oldMember != nil {
		oldMember.Role = models.OrgRoleAdmin
		s.orgRepo.UpdateMember(oldMember)
	}

	return s.orgRepo.TransferOwnership(orgID, req.NewOwnerID)
}

// ============================================================================
// PERMISSION CHECKS (PUBLIC)
// ============================================================================

func (s *organizationService) IsOwner(orgID, userID uint) (bool, error) {
	return s.orgRepo.IsOwner(orgID, userID)
}

func (s *organizationService) IsAdmin(orgID, userID uint) (bool, error) {
	return s.orgRepo.IsAdmin(orgID, userID)
}

func (s *organizationService) IsMember(orgID, userID uint) (bool, error) {
	return s.orgRepo.IsMember(orgID, userID)
}

func (s *organizationService) GetMemberRole(orgID, userID uint) (string, error) {
	return s.orgRepo.GetMemberRole(orgID, userID)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func (s *organizationService) toOrganizationResponse(org *models.Organization, owner *models.User, memberCount, workspaceCount int64, userRole string) *dto.OrganizationResponse {
	var ownerResp *dto.UserResponse
	if owner != nil {
		ownerResp = &dto.UserResponse{
			ID:        owner.ID,
			Email:     owner.Email,
			FirstName: owner.FirstName,
			LastName:  owner.LastName,
			Role:      owner.Role,
			IsActive:  owner.IsActive,
			CreatedAt: owner.CreatedAt,
		}
	}

	response := &dto.OrganizationResponse{
		ID:              org.ID,
		Name:            org.Name,
		Slug:            org.Slug,
		Description:     org.Description,
		LogoURL:         org.LogoURL,
		OwnerID:         org.OwnerID,
		Owner:           ownerResp,
		AllowInviteLink: org.AllowInviteLink,
		ShareInviteCode: org.ShareInviteCode,
		MaxMembers:      org.MaxMembers,
		IsActive:        org.IsActive,
		MemberCount:     memberCount,
		WorkspaceCount:  workspaceCount,
		CreatedAt:       org.CreatedAt,
		UpdatedAt:       org.UpdatedAt,
	}

	// Show invite code based on role and share settings:
	// 1. Owner/Admin can always see invite code (if invite link is enabled)
	// 2. Members can only see if ShareInviteCode is enabled by owner/admin
	if org.AllowInviteLink && org.InviteCode != "" {
		isAdmin := userRole == models.OrgRoleOwner || userRole == models.OrgRoleAdmin
		if isAdmin || org.ShareInviteCode {
			response.InviteCode = org.InviteCode
		}
	}

	return response
}

func (s *organizationService) toMemberResponse(m *models.OrganizationMember) *dto.OrganizationMemberResponse {
	var userResp *dto.UserResponse
	if m.User.ID > 0 {
		userResp = &dto.UserResponse{
			ID:        m.User.ID,
			Email:     m.User.Email,
			FirstName: m.User.FirstName,
			LastName:  m.User.LastName,
			Role:      m.User.Role,
			IsActive:  m.User.IsActive,
			CreatedAt: m.User.CreatedAt,
		}
	}

	return &dto.OrganizationMemberResponse{
		ID:        m.ID,
		UserID:    m.UserID,
		User:      userResp,
		Role:      m.Role,
		JoinedAt:  m.JoinedAt,
		IsActive:  m.IsActive,
		InvitedBy: m.InvitedBy,
	}
}

func (s *organizationService) toWorkspaceResponse(w *models.Workspace, memberCount, taskCount int64) *dto.WorkspaceResponse {
	var adminResp *dto.UserResponse
	if w.Admin.ID > 0 {
		adminResp = &dto.UserResponse{
			ID:        w.Admin.ID,
			Email:     w.Admin.Email,
			FirstName: w.Admin.FirstName,
			LastName:  w.Admin.LastName,
			Role:      w.Admin.Role,
			IsActive:  w.Admin.IsActive,
			CreatedAt: w.Admin.CreatedAt,
		}
	}

	return &dto.WorkspaceResponse{
		ID:             w.ID,
		OrganizationID: w.OrganizationID,
		Name:           w.Name,
		Slug:           w.Slug,
		Description:    w.Description,
		Color:          w.Color,
		Icon:           w.Icon,
		AdminID:        w.AdminID,
		Admin:          adminResp,
		IsActive:       w.IsActive,
		IsBillable:     w.IsBillable,
		HourlyRate:     w.HourlyRate,
		StartDate:      w.StartDate,
		EndDate:        w.EndDate,
		MemberCount:    memberCount,
		TaskCount:      taskCount,
		CreatedAt:      w.CreatedAt,
		UpdatedAt:      w.UpdatedAt,
	}
}

// TransferOwnershipRequest DTO for transferring ownership
type TransferOwnershipRequest struct {
	NewOwnerID uint `json:"new_owner_id" binding:"required"`
}

// OrganizationPublicInfo DTO for public organization info (join preview)
type OrganizationPublicInfo struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	LogoURL     string `json:"logo_url"`
	MemberCount int64  `json:"member_count"`
}
