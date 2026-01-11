package service

import (
	"errors"
	"strings"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

// RoleService handles workspace role business logic
type RoleService interface {
	// Role CRUD
	Create(orgID, userID uint, req *dto.CreateWorkspaceRoleRequest) (*dto.WorkspaceRoleResponse, error)
	GetByID(roleID uint) (*dto.WorkspaceRoleResponse, error)
	Update(roleID, userID uint, req *dto.UpdateWorkspaceRoleRequest) (*dto.WorkspaceRoleResponse, error)
	Delete(roleID, userID uint) error

	// Role lists
	GetByOrganization(orgID, userID uint) ([]dto.WorkspaceRoleResponse, error)

	// Helpers
	CreateDefaultRoles(orgID uint) error
}

type roleService struct {
	workspaceRepo *repository.WorkspaceRepository
	orgRepo       *repository.OrganizationRepository
}

// NewRoleService creates a new role service
func NewRoleService(
	workspaceRepo *repository.WorkspaceRepository,
	orgRepo *repository.OrganizationRepository,
) RoleService {
	return &roleService{
		workspaceRepo: workspaceRepo,
		orgRepo:       orgRepo,
	}
}

// ============================================================================
// ROLE CRUD
// ============================================================================

func (s *roleService) Create(orgID, userID uint, req *dto.CreateWorkspaceRoleRequest) (*dto.WorkspaceRoleResponse, error) {
	// Check if user is org admin
	isAdmin, err := s.orgRepo.IsAdmin(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only organization admins can create roles")
	}

	// Check if role name already exists
	roleName := strings.ToLower(req.Name)
	exists, err := s.workspaceRepo.RoleNameExistsInOrg(orgID, roleName)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("role name already exists in this organization")
	}

	// Get max sort order
	roles, _ := s.workspaceRepo.GetRolesByOrgID(orgID)
	maxSortOrder := 0
	for _, r := range roles {
		if r.SortOrder > maxSortOrder {
			maxSortOrder = r.SortOrder
		}
	}

	sortOrder := req.SortOrder
	if sortOrder == 0 {
		sortOrder = maxSortOrder + 1
	}

	// Create role
	role := &models.WorkspaceRole{
		OrganizationID: orgID,
		Name:           roleName,
		DisplayName:    req.DisplayName,
		Description:    req.Description,
		Color:          req.Color,
		Permissions:    req.Permissions,
		IsDefault:      req.IsDefault,
		SortOrder:      sortOrder,
	}

	// If this is set as default, unset other defaults
	if req.IsDefault {
		s.unsetDefaultRole(orgID)
	}

	if err := s.workspaceRepo.CreateRole(role); err != nil {
		return nil, err
	}

	return s.toRoleResponse(role), nil
}

func (s *roleService) GetByID(roleID uint) (*dto.WorkspaceRoleResponse, error) {
	role, err := s.workspaceRepo.GetRoleByID(roleID)
	if err != nil {
		return nil, err
	}

	return s.toRoleResponse(role), nil
}

func (s *roleService) Update(roleID, userID uint, req *dto.UpdateWorkspaceRoleRequest) (*dto.WorkspaceRoleResponse, error) {
	role, err := s.workspaceRepo.GetRoleByID(roleID)
	if err != nil {
		return nil, err
	}

	// Check if user is org admin
	isAdmin, err := s.orgRepo.IsAdmin(role.OrganizationID, userID)
	if err != nil {
		return nil, err
	}
	if !isAdmin {
		return nil, errors.New("access denied: only organization admins can update roles")
	}

	// Update fields
	if req.DisplayName != nil {
		role.DisplayName = *req.DisplayName
	}
	if req.Description != nil {
		role.Description = *req.Description
	}
	if req.Color != nil {
		role.Color = *req.Color
	}
	if req.Permissions != nil {
		role.Permissions = *req.Permissions
	}
	if req.IsDefault != nil {
		if *req.IsDefault {
			s.unsetDefaultRole(role.OrganizationID)
		}
		role.IsDefault = *req.IsDefault
	}
	if req.SortOrder != nil {
		role.SortOrder = *req.SortOrder
	}

	if err := s.workspaceRepo.UpdateRole(role); err != nil {
		return nil, err
	}

	return s.toRoleResponse(role), nil
}

func (s *roleService) Delete(roleID, userID uint) error {
	role, err := s.workspaceRepo.GetRoleByID(roleID)
	if err != nil {
		return err
	}

	// Only org owner can delete roles
	isOwner, err := s.orgRepo.IsOwner(role.OrganizationID, userID)
	if err != nil {
		return err
	}
	if !isOwner {
		return errors.New("access denied: only organization owner can delete roles")
	}

	return s.workspaceRepo.DeleteRole(roleID)
}

// ============================================================================
// ROLE LISTS
// ============================================================================

func (s *roleService) GetByOrganization(orgID, userID uint) ([]dto.WorkspaceRoleResponse, error) {
	// Check if user is org member
	isMember, err := s.orgRepo.IsMember(orgID, userID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, errors.New("access denied: not a member of this organization")
	}

	roles, err := s.workspaceRepo.GetRolesByOrgID(orgID)
	if err != nil {
		return nil, err
	}

	result := make([]dto.WorkspaceRoleResponse, 0, len(roles))
	for _, r := range roles {
		result = append(result, *s.toRoleResponse(&r))
	}

	return result, nil
}

// ============================================================================
// HELPERS
// ============================================================================

func (s *roleService) CreateDefaultRoles(orgID uint) error {
	return s.workspaceRepo.CreateDefaultRoles(orgID)
}

func (s *roleService) unsetDefaultRole(orgID uint) {
	roles, _ := s.workspaceRepo.GetRolesByOrgID(orgID)
	for _, r := range roles {
		if r.IsDefault {
			r.IsDefault = false
			s.workspaceRepo.UpdateRole(&r)
		}
	}
}

func (s *roleService) toRoleResponse(r *models.WorkspaceRole) *dto.WorkspaceRoleResponse {
	return &dto.WorkspaceRoleResponse{
		ID:             r.ID,
		OrganizationID: r.OrganizationID,
		Name:           r.Name,
		DisplayName:    r.DisplayName,
		Description:    r.Description,
		Color:          r.Color,
		Permissions:    r.Permissions,
		IsDefault:      r.IsDefault,
		SortOrder:      r.SortOrder,
		CreatedAt:      r.CreatedAt,
	}
}
