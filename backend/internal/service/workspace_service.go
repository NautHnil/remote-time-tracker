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

// WorkspaceService handles workspace business logic
type WorkspaceService interface {
	// Workspace CRUD
	Create(orgID, userID uint, req *dto.CreateWorkspaceRequest) (*dto.WorkspaceResponse, error)
	GetByID(workspaceID, userID uint) (*dto.WorkspaceResponse, error)
	GetByIDWithMembers(workspaceID, userID uint) (*dto.WorkspaceResponse, error)
	Update(workspaceID, userID uint, req *dto.UpdateWorkspaceRequest) (*dto.WorkspaceResponse, error)
	Delete(workspaceID, userID uint) error

	// Workspace lists
	GetWorkspacesByOrg(orgID, userID uint) ([]dto.WorkspaceListResponse, error)
	GetUserWorkspaces(userID uint) ([]dto.WorkspaceListResponse, error)
	GetUserWorkspacesByOrg(userID, orgID uint) ([]dto.WorkspaceListResponse, error)

	// Member management
	AddMember(workspaceID, actorID uint, req *dto.AddWorkspaceMemberRequest) (*dto.WorkspaceMemberResponse, error)
	UpdateMember(workspaceID, memberUserID, actorID uint, req *dto.UpdateWorkspaceMemberRequest) (*dto.WorkspaceMemberResponse, error)
	RemoveMember(workspaceID, memberUserID, actorID uint) error
	GetMembers(workspaceID, userID uint) ([]dto.WorkspaceMemberResponse, error)

	// Permission checks (exposed for middleware)
	IsAdmin(workspaceID, userID uint) (bool, error)
	IsMember(workspaceID, userID uint) (bool, error)
	CanManageWorkspace(workspaceID, userID uint) (bool, error)
}

type workspaceService struct {
	workspaceRepo *repository.WorkspaceRepository
	orgRepo       *repository.OrganizationRepository
	userRepo      repository.UserRepository
}

// NewWorkspaceService creates a new workspace service
func NewWorkspaceService(
	workspaceRepo *repository.WorkspaceRepository,
	orgRepo *repository.OrganizationRepository,
	userRepo repository.UserRepository,
) WorkspaceService {
	return &workspaceService{
		workspaceRepo: workspaceRepo,
		orgRepo:       orgRepo,
		userRepo:      userRepo,
	}
}

// ============================================================================
// WORKSPACE CRUD
// ============================================================================

func (s *workspaceService) Create(orgID, userID uint, req *dto.CreateWorkspaceRequest) (*dto.WorkspaceResponse, error) {
	// Check if user is org admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only organization admins can create workspaces")
	}

	// Generate slug from name
	wsSlug := slug.Make(req.Name)

	// Check if slug exists in org
	exists, err := s.workspaceRepo.SlugExistsInOrg(orgID, wsSlug)
	if err != nil {
		return nil, err
	}

	// Append timestamp if slug exists
	if exists {
		wsSlug = wsSlug + "-" + time.Now().Format("20060102150405")
	}

	// Use provided slug if available
	if req.Slug != "" {
		exists, err = s.workspaceRepo.SlugExistsInOrg(orgID, req.Slug)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("slug already exists in this organization")
		}
		wsSlug = strings.ToLower(req.Slug)
	}

	// Set admin
	adminID := userID
	if req.AdminID > 0 {
		// Verify admin is org member
		isMember, err := s.orgRepo.IsMember(orgID, req.AdminID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, errors.New("workspace admin must be a member of the organization")
		}
		adminID = req.AdminID
	}

	// Create workspace
	workspace := &models.Workspace{
		OrganizationID: orgID,
		Name:           req.Name,
		Slug:           wsSlug,
		Description:    req.Description,
		Color:          req.Color,
		Icon:           req.Icon,
		AdminID:        adminID,
		IsActive:       true,
		IsBillable:     req.IsBillable,
		HourlyRate:     req.HourlyRate,
		StartDate:      req.StartDate,
		EndDate:        req.EndDate,
	}

	if err := s.workspaceRepo.Create(workspace); err != nil {
		return nil, err
	}

	// Add admin as workspace member
	member := &models.WorkspaceMember{
		WorkspaceID:    workspace.ID,
		UserID:         adminID,
		IsAdmin:        true,
		CanViewReports: true,
		CanManageTasks: true,
		AddedBy:        &userID,
		JoinedAt:       time.Now(),
		IsActive:       true,
	}

	if err := s.workspaceRepo.AddMember(member); err != nil {
		// Rollback workspace creation
		s.workspaceRepo.Delete(workspace.ID)
		return nil, err
	}

	return s.GetByID(workspace.ID, userID)
}

func (s *workspaceService) GetByID(workspaceID, userID uint) (*dto.WorkspaceResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return nil, err
	}

	// Check access: must be org member or workspace member
	isMember, _ := s.workspaceRepo.IsMember(workspaceID, userID)
	isOrgMember, _ := s.orgRepo.IsMember(workspace.OrganizationID, userID)

	if !isMember && !isOrgMember {
		return nil, errors.New("access denied: not a member of this workspace or organization")
	}

	memberCount, _ := s.workspaceRepo.GetMemberCount(workspaceID)
	taskCount, _ := s.workspaceRepo.GetTaskCount(workspaceID)

	return s.toWorkspaceResponse(workspace, memberCount, taskCount), nil
}

func (s *workspaceService) GetByIDWithMembers(workspaceID, userID uint) (*dto.WorkspaceResponse, error) {
	workspace, err := s.workspaceRepo.GetByIDWithMembers(workspaceID)
	if err != nil {
		return nil, err
	}

	// Check access
	isMember, _ := s.workspaceRepo.IsMember(workspaceID, userID)
	isOrgMember, _ := s.orgRepo.IsMember(workspace.OrganizationID, userID)

	if !isMember && !isOrgMember {
		return nil, errors.New("access denied: not a member of this workspace or organization")
	}

	memberCount := int64(len(workspace.Members))
	taskCount, _ := s.workspaceRepo.GetTaskCount(workspaceID)

	response := s.toWorkspaceResponse(workspace, memberCount, taskCount)

	// Add members
	members := make([]dto.WorkspaceMemberResponse, 0, len(workspace.Members))
	for _, m := range workspace.Members {
		members = append(members, *s.toMemberResponse(&m))
	}
	response.Members = members

	return response, nil
}

func (s *workspaceService) Update(workspaceID, userID uint, req *dto.UpdateWorkspaceRequest) (*dto.WorkspaceResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return nil, err
	}

	// Check if user can manage workspace (org owner, org admin, or workspace admin)
	canManage, err := s.CanManageWorkspace(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("access denied: you cannot manage this workspace")
	}

	// Update fields
	if req.Name != nil {
		workspace.Name = *req.Name
	}
	if req.Description != nil {
		workspace.Description = *req.Description
	}
	if req.Color != nil {
		workspace.Color = *req.Color
	}
	if req.Icon != nil {
		workspace.Icon = *req.Icon
	}
	if req.AdminID != nil {
		// Verify new admin is org member
		isMember, err := s.orgRepo.IsMember(workspace.OrganizationID, *req.AdminID)
		if err != nil {
			return nil, err
		}
		if !isMember {
			return nil, errors.New("workspace admin must be a member of the organization")
		}
		workspace.AdminID = *req.AdminID
	}
	if req.IsActive != nil {
		workspace.IsActive = *req.IsActive
	}
	if req.IsBillable != nil {
		workspace.IsBillable = *req.IsBillable
	}
	if req.HourlyRate != nil {
		workspace.HourlyRate = *req.HourlyRate
	}
	if req.StartDate != nil {
		workspace.StartDate = req.StartDate
	}
	if req.EndDate != nil {
		workspace.EndDate = req.EndDate
	}

	if err := s.workspaceRepo.Update(workspace); err != nil {
		return nil, err
	}

	return s.GetByID(workspaceID, userID)
}

func (s *workspaceService) Delete(workspaceID, userID uint) error {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return err
	}

	// Only org owner can delete workspace
	isOrgOwner, err := s.orgRepo.IsOwner(workspace.OrganizationID, userID)
	if err != nil {
		return err
	}
	if !isOrgOwner {
		return errors.New("access denied: only organization owner can delete workspaces")
	}

	return s.workspaceRepo.Delete(workspaceID)
}

// ============================================================================
// WORKSPACE LISTS
// ============================================================================

func (s *workspaceService) GetWorkspacesByOrg(orgID, userID uint) ([]dto.WorkspaceListResponse, error) {
	// Check if user is org member
	isMember, err := s.orgRepo.IsMember(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("access denied: not a member of this organization")
	}

	workspaces, err := s.workspaceRepo.GetByOrganizationID(orgID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.WorkspaceListResponse, 0, len(workspaces))
	for _, w := range workspaces {
		memberCount, _ := s.workspaceRepo.GetMemberCount(w.ID)
		taskCount, _ := s.workspaceRepo.GetTaskCount(w.ID)
		isAdmin, _ := s.workspaceRepo.IsAdmin(w.ID, userID)

		// Get user's membership info
		member, _ := s.workspaceRepo.GetMember(w.ID, userID)
		var roleName string
		var joinedAt time.Time
		if member != nil {
			roleName = member.RoleName
			joinedAt = member.JoinedAt
		}

		result = append(result, dto.WorkspaceListResponse{
			ID:             w.ID,
			OrganizationID: w.OrganizationID,
			Name:           w.Name,
			Slug:           w.Slug,
			Color:          w.Color,
			Icon:           w.Icon,
			IsAdmin:        isAdmin,
			RoleName:       roleName,
			MemberCount:    memberCount,
			TaskCount:      taskCount,
			IsActive:       w.IsActive,
			JoinedAt:       joinedAt,
		})
	}

	return result, nil
}

func (s *workspaceService) GetUserWorkspaces(userID uint) ([]dto.WorkspaceListResponse, error) {
	memberships, err := s.workspaceRepo.GetUserWorkspaces(userID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.WorkspaceListResponse, 0, len(memberships))
	for _, m := range memberships {
		memberCount, _ := s.workspaceRepo.GetMemberCount(m.WorkspaceID)
		taskCount, _ := s.workspaceRepo.GetTaskCount(m.WorkspaceID)

		result = append(result, dto.WorkspaceListResponse{
			ID:             m.Workspace.ID,
			OrganizationID: m.Workspace.OrganizationID,
			Name:           m.Workspace.Name,
			Slug:           m.Workspace.Slug,
			Color:          m.Workspace.Color,
			Icon:           m.Workspace.Icon,
			IsAdmin:        m.IsAdmin,
			RoleName:       m.RoleName,
			MemberCount:    memberCount,
			TaskCount:      taskCount,
			IsActive:       m.Workspace.IsActive,
			JoinedAt:       m.JoinedAt,
		})
	}

	return result, nil
}

func (s *workspaceService) GetUserWorkspacesByOrg(userID, orgID uint) ([]dto.WorkspaceListResponse, error) {
	memberships, err := s.workspaceRepo.GetUserWorkspacesByOrg(userID, orgID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.WorkspaceListResponse, 0, len(memberships))
	for _, m := range memberships {
		memberCount, _ := s.workspaceRepo.GetMemberCount(m.WorkspaceID)
		taskCount, _ := s.workspaceRepo.GetTaskCount(m.WorkspaceID)

		result = append(result, dto.WorkspaceListResponse{
			ID:             m.Workspace.ID,
			OrganizationID: m.Workspace.OrganizationID,
			Name:           m.Workspace.Name,
			Slug:           m.Workspace.Slug,
			Color:          m.Workspace.Color,
			Icon:           m.Workspace.Icon,
			IsAdmin:        m.IsAdmin,
			RoleName:       m.RoleName,
			MemberCount:    memberCount,
			TaskCount:      taskCount,
			IsActive:       m.Workspace.IsActive,
			JoinedAt:       m.JoinedAt,
		})
	}

	return result, nil
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

func (s *workspaceService) AddMember(workspaceID, actorID uint, req *dto.AddWorkspaceMemberRequest) (*dto.WorkspaceMemberResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return nil, err
	}

	// Check if actor can manage workspace
	canManage, err := s.CanManageWorkspace(workspaceID, actorID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("access denied: you cannot add members to this workspace")
	}

	// Target user must be org member
	isOrgMember, err := s.orgRepo.IsMember(workspace.OrganizationID, req.UserID)
	if err != nil {
		return nil, err
	}
	if !isOrgMember {
		return nil, errors.New("user must be a member of the organization first")
	}

	// Check if already a member
	isMember, err := s.workspaceRepo.IsMember(workspaceID, req.UserID)
	if err != nil {
		return nil, err
	}
	if isMember {
		return nil, errors.New("user is already a member of this workspace")
	}

	// Get user
	user, err := s.userRepo.FindByID(req.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Create member
	member := &models.WorkspaceMember{
		WorkspaceID:     workspaceID,
		UserID:          req.UserID,
		WorkspaceRoleID: req.WorkspaceRoleID,
		RoleName:        req.RoleName,
		IsAdmin:         req.IsAdmin,
		CanViewReports:  req.CanViewReports,
		CanManageTasks:  req.CanManageTasks,
		AddedBy:         &actorID,
		JoinedAt:        time.Now(),
		IsActive:        true,
	}

	if err := s.workspaceRepo.AddMember(member); err != nil {
		return nil, err
	}

	member.User = *user

	// Load role if set
	if req.WorkspaceRoleID != nil {
		role, _ := s.workspaceRepo.GetRoleByID(*req.WorkspaceRoleID)
		if role != nil {
			member.WorkspaceRole = role
			member.RoleName = role.Name
		}
	}

	return s.toMemberResponse(member), nil
}

func (s *workspaceService) UpdateMember(workspaceID, memberUserID, actorID uint, req *dto.UpdateWorkspaceMemberRequest) (*dto.WorkspaceMemberResponse, error) {
	// Check if actor can manage workspace
	canManage, err := s.CanManageWorkspace(workspaceID, actorID)
	if err != nil {
		return nil, err
	}
	if !canManage {
		return nil, errors.New("access denied: you cannot update members in this workspace")
	}

	// Get member
	member, err := s.workspaceRepo.GetMemberWithDetails(workspaceID, memberUserID)
	if err != nil {
		return nil, errors.New("member not found")
	}

	// Update fields
	if req.WorkspaceRoleID != nil {
		member.WorkspaceRoleID = req.WorkspaceRoleID
		// Load role name
		role, _ := s.workspaceRepo.GetRoleByID(*req.WorkspaceRoleID)
		if role != nil {
			member.RoleName = role.Name
		}
	}
	if req.RoleName != nil {
		member.RoleName = *req.RoleName
	}
	if req.IsAdmin != nil {
		member.IsAdmin = *req.IsAdmin
	}
	if req.CanViewReports != nil {
		member.CanViewReports = *req.CanViewReports
	}
	if req.CanManageTasks != nil {
		member.CanManageTasks = *req.CanManageTasks
	}
	if req.IsActive != nil {
		member.IsActive = *req.IsActive
	}

	if err := s.workspaceRepo.UpdateMember(member); err != nil {
		return nil, err
	}

	return s.toMemberResponse(member), nil
}

func (s *workspaceService) RemoveMember(workspaceID, memberUserID, actorID uint) error {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return err
	}

	// Check if actor can manage workspace
	canManage, err := s.CanManageWorkspace(workspaceID, actorID)
	if err != nil {
		return err
	}
	if !canManage {
		return errors.New("access denied: you cannot remove members from this workspace")
	}

	// Prevent removing workspace admin
	if workspace.AdminID == memberUserID {
		return errors.New("cannot remove workspace admin, transfer admin rights first")
	}

	return s.workspaceRepo.RemoveMember(workspaceID, memberUserID)
}

func (s *workspaceService) GetMembers(workspaceID, userID uint) ([]dto.WorkspaceMemberResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return nil, err
	}

	// Check access
	isMember, _ := s.workspaceRepo.IsMember(workspaceID, userID)
	isOrgMember, _ := s.orgRepo.IsMember(workspace.OrganizationID, userID)

	if !isMember && !isOrgMember {
		return nil, errors.New("access denied: not a member of this workspace or organization")
	}

	members, err := s.workspaceRepo.GetMembersByWorkspaceID(workspaceID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.WorkspaceMemberResponse, 0, len(members))
	for _, m := range members {
		result = append(result, *s.toMemberResponse(&m))
	}

	return result, nil
}

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

func (s *workspaceService) IsAdmin(workspaceID, userID uint) (bool, error) {
	return s.workspaceRepo.IsAdmin(workspaceID, userID)
}

func (s *workspaceService) IsMember(workspaceID, userID uint) (bool, error) {
	return s.workspaceRepo.IsMember(workspaceID, userID)
}

func (s *workspaceService) CanManageWorkspace(workspaceID, userID uint) (bool, error) {
	workspace, err := s.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return false, err
	}

	// Org owner can manage any workspace
	isOrgOwner, _ := s.orgRepo.IsOwner(workspace.OrganizationID, userID)
	if isOrgOwner {
		return true, nil
	}

	// Org admin can manage any workspace
	isOrgAdmin, _ := s.orgRepo.IsAdmin(workspace.OrganizationID, userID)
	if isOrgAdmin {
		return true, nil
	}

	// Workspace admin can manage their workspace
	isWsAdmin, _ := s.workspaceRepo.IsAdmin(workspaceID, userID)
	return isWsAdmin, nil
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func (s *workspaceService) toWorkspaceResponse(w *models.Workspace, memberCount, taskCount int64) *dto.WorkspaceResponse {
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

func (s *workspaceService) toMemberResponse(m *models.WorkspaceMember) *dto.WorkspaceMemberResponse {
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

	var roleResp *dto.WorkspaceRoleResponse
	if m.WorkspaceRole != nil {
		roleResp = &dto.WorkspaceRoleResponse{
			ID:             m.WorkspaceRole.ID,
			OrganizationID: m.WorkspaceRole.OrganizationID,
			Name:           m.WorkspaceRole.Name,
			DisplayName:    m.WorkspaceRole.DisplayName,
			Description:    m.WorkspaceRole.Description,
			Color:          m.WorkspaceRole.Color,
			Permissions:    m.WorkspaceRole.Permissions,
			IsDefault:      m.WorkspaceRole.IsDefault,
			SortOrder:      m.WorkspaceRole.SortOrder,
			CreatedAt:      m.WorkspaceRole.CreatedAt,
		}
	}

	return &dto.WorkspaceMemberResponse{
		ID:              m.ID,
		UserID:          m.UserID,
		User:            userResp,
		WorkspaceRoleID: m.WorkspaceRoleID,
		WorkspaceRole:   roleResp,
		RoleName:        m.RoleName,
		IsAdmin:         m.IsAdmin,
		CanViewReports:  m.CanViewReports,
		CanManageTasks:  m.CanManageTasks,
		JoinedAt:        m.JoinedAt,
		IsActive:        m.IsActive,
		AddedBy:         m.AddedBy,
	}
}
