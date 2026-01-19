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
// @Description Create a new organization. The creator automatically becomes the owner.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.CreateOrganizationRequest true "Organization data"
// @Success 201 {object} dto.OrganizationResponse "Organization created successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /organizations [post]
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
// @Description Get organization details. Use ?details=true to include members and workspaces.
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param details query bool false "Include members and workspaces"
// @Success 200 {object} dto.OrganizationResponse "Organization details"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Organization not found"
// @Router /organizations/{org_id} [get]
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
// @Description Update organization details. Only owner or admin can update.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.UpdateOrganizationRequest true "Organization data"
// @Success 200 {object} dto.OrganizationResponse "Organization updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id} [put]
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
// @Description Delete an organization. Only owner can delete. All workspaces and data will be removed.
// @Tags organizations
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 204 "Organization deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden - only owner can delete"
// @Router /organizations/{org_id} [delete]
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
// @Description Get all organizations the authenticated user is a member of
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Success 200 {array} dto.OrganizationListResponse "User's organizations"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /organizations [get]
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
// @Description Get all members of an organization with their roles
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 200 {array} dto.OrganizationMemberResponse "Organization members"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Not a member"
// @Router /organizations/{org_id}/members [get]
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
// @Description Add a new member to the organization. Only owner or admin can add members.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.AddOrganizationMemberRequest true "Member data"
// @Success 201 {object} dto.OrganizationMemberResponse "Member added"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/members [post]
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
// @Description Update an organization member's role. Only owner or admin can update.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param user_id path int true "User ID"
// @Param request body dto.UpdateOrganizationMemberRequest true "Member data"
// @Success 200 {object} dto.OrganizationMemberResponse "Member updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/members/{user_id} [put]
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
// @Description Remove a member from the organization. Only owner or admin can remove.
// @Tags organizations
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param user_id path int true "User ID"
// @Success 204 "Member removed"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Cannot remove owner"
// @Router /organizations/{org_id}/members/{user_id} [delete]
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
// @Description Get public organization info by invite code (used before joining)
// @Tags organizations
// @Produce json
// @Param invite_code path string true "Invite code"
// @Success 200 {object} dto.SuccessResponse "Organization found"
// @Failure 400 {object} dto.ErrorResponse "Invite code required"
// @Failure 404 {object} dto.ErrorResponse "Organization not found"
// @Router /organizations/join/{invite_code} [get]
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
// @Description Join an organization using its invite code
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param invite_code path string true "Invite code"
// @Success 201 {object} dto.OrganizationMemberResponse "Joined successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid invite code or already member"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /organizations/join/{invite_code} [post]
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
// @Description Generate a new invite code for the organization. Only owner or admin can regenerate.
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 200 {object} map[string]string "New invite code"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/regenerate-invite-code [post]
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
// @Description Transfer organization ownership to another member. Only owner can transfer.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.TransferOwnershipRequest true "New owner data"
// @Success 200 {object} map[string]string "Ownership transferred"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Only owner can transfer"
// @Router /organizations/{org_id}/transfer-ownership [post]
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
// @Description Get all workspace roles defined in the organization
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 200 {array} dto.WorkspaceRoleResponse "Workspace roles"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /organizations/{org_id}/roles [get]
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
// @Description Create a new workspace role in the organization. Only owner or admin can create.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.CreateWorkspaceRoleRequest true "Role data"
// @Success 201 {object} dto.WorkspaceRoleResponse "Role created"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/roles [post]
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
// @Description Update a workspace role. Only owner or admin can update.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param role_id path int true "Role ID"
// @Param request body dto.UpdateWorkspaceRoleRequest true "Role data"
// @Success 200 {object} dto.WorkspaceRoleResponse "Role updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/roles/{role_id} [put]
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
// @Description Delete a workspace role from the organization. Only owner can delete.
// @Tags organizations
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param role_id path int true "Role ID"
// @Success 204 "Role deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/roles/{role_id} [delete]
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
// @Description Get all workspaces in an organization that the user has access to
// @Tags organizations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 200 {array} dto.WorkspaceListResponse "Workspaces list"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /organizations/{org_id}/workspaces [get]
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
// @Description Create a new workspace/project in the organization. Only owner or admin can create.
// @Tags organizations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.CreateWorkspaceRequest true "Workspace data"
// @Success 201 {object} dto.WorkspaceResponse "Workspace created"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/workspaces [post]
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
// @Description Get all pending invitations for the organization
// @Tags invitations
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Success 200 {array} dto.InvitationResponse "Pending invitations"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /organizations/{org_id}/invitations [get]
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
// @Description Create a new invitation to join the organization. Only owner or admin can create.
// @Tags invitations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param request body dto.CreateInvitationRequest true "Invitation data"
// @Success 201 {object} dto.InvitationResponse "Invitation created"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/invitations [post]
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
// @Description Revoke a pending invitation. Only owner or admin can revoke.
// @Tags invitations
// @Security BearerAuth
// @Param org_id path int true "Organization ID"
// @Param invitation_id path int true "Invitation ID"
// @Success 204 "Invitation revoked"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /organizations/{org_id}/invitations/{invitation_id} [delete]
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
