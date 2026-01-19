package controller

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// OrganizationController handles organization-related HTTP requests
type OrganizationController struct {
	orgService        service.OrganizationService
	workspaceService  service.WorkspaceService
	invitationService service.InvitationService
	roleService       service.RoleService
}

// NewOrganizationController creates a new organization controller
func NewOrganizationController(
	orgService service.OrganizationService,
	workspaceService service.WorkspaceService,
	invitationService service.InvitationService,
	roleService service.RoleService,
) *OrganizationController {
	return &OrganizationController{
		orgService:        orgService,
		workspaceService:  workspaceService,
		invitationService: invitationService,
		roleService:       roleService,
	}
}

// ============================================================================
// ORGANIZATION CRUD
// ============================================================================

// Create creates a new organization
// @Summary Create organization
// @Tags organizations
// @Accept json
// @Produce json
// @Param request body dto.CreateOrganizationRequest true "Organization data"
// @Success 201 {object} dto.OrganizationResponse
// @Router /api/v1/organizations [post]
func (c *OrganizationController) Create(ctx *gin.Context) {
	var req dto.CreateOrganizationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	org, err := c.orgService.Create(userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, org)
}

// GetByID gets organization by ID
// @Summary Get organization by ID
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {object} dto.OrganizationResponse
// @Router /api/v1/organizations/{id} [get]
func (c *OrganizationController) GetByID(ctx *gin.Context) {
	orgID, err := strconv.Atoi(ctx.Param("org_id"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")

	// Check if details requested
	withDetails := ctx.Query("details") == "true"

	var org *dto.OrganizationResponse
	if withDetails {
		org, err = c.orgService.GetByIDWithDetails(uint(orgID), userID)
	} else {
		org, err = c.orgService.GetByID(uint(orgID), userID)
	}

	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, org)
}

// Update updates an organization
// @Summary Update organization
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body dto.UpdateOrganizationRequest true "Organization data"
// @Success 200 {object} dto.OrganizationResponse
// @Router /api/v1/organizations/{id} [put]
func (c *OrganizationController) Update(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.UpdateOrganizationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	org, err := c.orgService.Update(uint(orgID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, org)
}

// Delete deletes an organization
// @Summary Delete organization
// @Tags organizations
// @Param id path int true "Organization ID"
// @Success 204
// @Router /api/v1/organizations/{id} [delete]
func (c *OrganizationController) Delete(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.orgService.Delete(uint(orgID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// List lists user's organizations
// @Summary List user's organizations
// @Tags organizations
// @Produce json
// @Success 200 {array} dto.OrganizationListResponse
// @Router /api/v1/organizations [get]
func (c *OrganizationController) List(ctx *gin.Context) {
	userID := ctx.GetUint("userID")
	orgs, err := c.orgService.GetUserOrganizations(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, orgs)
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

// GetMembers lists organization members
// @Summary List organization members
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {array} dto.OrganizationMemberResponse
// @Router /api/v1/organizations/{id}/members [get]
func (c *OrganizationController) GetMembers(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	members, err := c.orgService.GetMembers(uint(orgID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, members)
}

// AddMember adds a member to organization
// @Summary Add member to organization
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body dto.AddOrganizationMemberRequest true "Member data"
// @Success 201 {object} dto.OrganizationMemberResponse
// @Router /api/v1/organizations/{id}/members [post]
func (c *OrganizationController) AddMember(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.AddOrganizationMemberRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.orgService.AddMember(uint(orgID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, member)
}

// UpdateMember updates a member's role
// @Summary Update member role
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param uid path int true "User ID"
// @Param request body dto.UpdateOrganizationMemberRequest true "Member data"
// @Success 200 {object} dto.OrganizationMemberResponse
// @Router /api/v1/organizations/{id}/members/{uid} [put]
func (c *OrganizationController) UpdateMember(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	memberUserID, err := strconv.ParseUint(ctx.Param("user_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.UpdateOrganizationMemberRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.orgService.UpdateMember(uint(orgID), uint(memberUserID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, member)
}

// RemoveMember removes a member from organization
// @Summary Remove member from organization
// @Tags organizations
// @Param id path int true "Organization ID"
// @Param uid path int true "User ID"
// @Success 204
// @Router /api/v1/organizations/{id}/members/{uid} [delete]
func (c *OrganizationController) RemoveMember(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	memberUserID, err := strconv.ParseUint(ctx.Param("user_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.orgService.RemoveMember(uint(orgID), uint(memberUserID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ============================================================================
// JOIN ORGANIZATION
// ============================================================================

// GetOrgByInviteCode gets organization info by invite code
// @Summary Get organization by invite code
// @Tags organizations
// @Produce json
// @Param code path string true "Invite code"
// @Success 200 {object} dto.OrganizationPublicInfo
// @Router /api/v1/organizations/join/{code} [get]
func (c *OrganizationController) GetOrgByInviteCode(ctx *gin.Context) {
	code := ctx.Param("invite_code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invite code is required"})
		return
	}

	org, err := c.orgService.GetOrgByInviteCode(code)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Organization found",
		"data":    org,
	})
}

// JoinByInviteCode joins organization by invite code
// @Summary Join organization by invite code
// @Tags organizations
// @Accept json
// @Produce json
// @Param code path string true "Invite code"
// @Success 201 {object} dto.OrganizationMemberResponse
// @Router /api/v1/organizations/join/{code} [post]
func (c *OrganizationController) JoinByInviteCode(ctx *gin.Context) {
	code := ctx.Param("code")
	if code == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invite code is required"})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.orgService.JoinByInviteCode(userID, code)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, member)
}

// RegenerateInviteCode regenerates organization invite code
// @Summary Regenerate invite code
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {object} map[string]string
// @Router /api/v1/organizations/{id}/regenerate-code [post]
func (c *OrganizationController) RegenerateInviteCode(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	code, err := c.orgService.RegenerateInviteCode(uint(orgID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"invite_code": code})
}

// TransferOwnership transfers organization ownership
// @Summary Transfer organization ownership
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body service.TransferOwnershipRequest true "New owner data"
// @Success 200 {object} map[string]string
// @Router /api/v1/organizations/{id}/transfer [post]
func (c *OrganizationController) TransferOwnership(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.TransferOwnershipRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.orgService.TransferOwnership(uint(orgID), userID, &req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "ownership transferred successfully"})
}

// ============================================================================
// WORKSPACE ROLES (Organization-level)
// ============================================================================

// GetRoles lists workspace roles for organization
// @Summary List workspace roles
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {array} dto.WorkspaceRoleResponse
// @Router /api/v1/organizations/{id}/roles [get]
func (c *OrganizationController) GetRoles(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	roles, err := c.roleService.GetByOrganization(uint(orgID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, roles)
}

// CreateRole creates a new workspace role
// @Summary Create workspace role
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body dto.CreateWorkspaceRoleRequest true "Role data"
// @Success 201 {object} dto.WorkspaceRoleResponse
// @Router /api/v1/organizations/{id}/roles [post]
func (c *OrganizationController) CreateRole(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.CreateWorkspaceRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	role, err := c.roleService.Create(uint(orgID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, role)
}

// UpdateRole updates a workspace role
// @Summary Update workspace role
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param rid path int true "Role ID"
// @Param request body dto.UpdateWorkspaceRoleRequest true "Role data"
// @Success 200 {object} dto.WorkspaceRoleResponse
// @Router /api/v1/organizations/{id}/roles/{rid} [put]
func (c *OrganizationController) UpdateRole(ctx *gin.Context) {
	roleID, err := strconv.ParseUint(ctx.Param("role_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	var req dto.UpdateWorkspaceRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	role, err := c.roleService.Update(uint(roleID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, role)
}

// DeleteRole deletes a workspace role
// @Summary Delete workspace role
// @Tags organizations
// @Param id path int true "Organization ID"
// @Param rid path int true "Role ID"
// @Success 204
// @Router /api/v1/organizations/{id}/roles/{rid} [delete]
func (c *OrganizationController) DeleteRole(ctx *gin.Context) {
	roleID, err := strconv.ParseUint(ctx.Param("role_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.roleService.Delete(uint(roleID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ============================================================================
// WORKSPACES (under organization)
// ============================================================================

// GetWorkspaces lists workspaces in organization
// @Summary List organization workspaces
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {array} dto.WorkspaceListResponse
// @Router /api/v1/organizations/{id}/workspaces [get]
func (c *OrganizationController) GetWorkspaces(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	workspaces, err := c.workspaceService.GetWorkspacesByOrg(uint(orgID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, workspaces)
}

// CreateWorkspace creates a new workspace in organization
// @Summary Create workspace
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body dto.CreateWorkspaceRequest true "Workspace data"
// @Success 201 {object} dto.WorkspaceResponse
// @Router /api/v1/organizations/{id}/workspaces [post]
func (c *OrganizationController) CreateWorkspace(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.CreateWorkspaceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	workspace, err := c.workspaceService.Create(uint(orgID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, workspace)
}

// ============================================================================
// INVITATIONS (under organization)
// ============================================================================

// GetInvitations lists pending invitations for organization
// @Summary List organization invitations
// @Tags organizations
// @Produce json
// @Param id path int true "Organization ID"
// @Success 200 {array} dto.InvitationResponse
// @Router /api/v1/organizations/{id}/invitations [get]
func (c *OrganizationController) GetInvitations(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	userID := ctx.GetUint("userID")
	invitations, err := c.invitationService.GetPendingByOrg(uint(orgID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, invitations)
}

// CreateInvitation creates a new invitation
// @Summary Create invitation
// @Tags organizations
// @Accept json
// @Produce json
// @Param id path int true "Organization ID"
// @Param request body dto.CreateInvitationRequest true "Invitation data"
// @Success 201 {object} dto.InvitationResponse
// @Router /api/v1/organizations/{id}/invitations [post]
func (c *OrganizationController) CreateInvitation(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("org_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.CreateInvitationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	invitation, err := c.invitationService.Create(uint(orgID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, invitation)
}

// RevokeInvitation revokes an invitation
// @Summary Revoke invitation
// @Tags organizations
// @Param id path int true "Organization ID"
// @Param invitation_id path int true "Invitation ID"
// @Success 204
// @Router /api/v1/organizations/{id}/invitations/{invitation_id} [delete]
func (c *OrganizationController) RevokeInvitation(ctx *gin.Context) {
	invitationID, err := strconv.ParseUint(ctx.Param("invitation_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid invitation ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.invitationService.Revoke(uint(invitationID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}
