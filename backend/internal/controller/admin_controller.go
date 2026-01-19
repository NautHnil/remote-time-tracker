package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// AdminController handles admin-only HTTP requests
type AdminController struct {
	adminService service.AdminService
}

// NewAdminController creates a new admin controller
func NewAdminController(adminService service.AdminService) *AdminController {
	return &AdminController{
		adminService: adminService,
	}
}

// ============================================================================
// USER MANAGEMENT (System Admin Only)
// ============================================================================

// ListUsers lists all users with filtering
// @Summary List all users (admin only)
// @Description Get paginated list of all users with filtering options
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param search query string false "Search by email/name"
// @Param role query string false "Filter by role"
// @Param system_role query string false "Filter by system role"
// @Param is_active query bool false "Filter by active status"
// @Param org_id query int false "Filter by organization"
// @Param sort_by query string false "Sort field"
// @Param sort_order query string false "Sort order (asc/desc)"
// @Success 200 {object} dto.AdminUserListResponse "User list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/users [get]
func (c *AdminController) ListUsers(ctx *gin.Context) {
	params := &dto.AdminUserListParams{
		Page:       parseIntParam(ctx, "page", 1),
		PageSize:   parseIntParam(ctx, "page_size", 20),
		Search:     ctx.Query("search"),
		Role:       ctx.Query("role"),
		SystemRole: ctx.Query("system_role"),
		SortBy:     ctx.Query("sort_by"),
		SortOrder:  ctx.Query("sort_order"),
	}

	if ctx.Query("is_active") != "" {
		isActive := ctx.Query("is_active") == "true"
		params.IsActive = &isActive
	}

	if ctx.Query("org_id") != "" {
		orgID := uint(parseIntParam(ctx, "org_id", 0))
		params.OrgID = &orgID
	}

	result, err := c.adminService.ListUsers(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetUser gets a user by ID with full details
// @Summary Get user by ID (admin only)
// @Description Get detailed information about a specific user
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} dto.AdminUserDetailResponse "User details"
// @Failure 400 {object} dto.ErrorResponse "Invalid user ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "User not found"
// @Router /admin/users/{id} [get]
func (c *AdminController) GetUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := c.adminService.GetUser(uint(userID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// CreateUser creates a new user
// @Summary Create user (admin only)
// @Description Create a new user account
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.AdminCreateUserRequest true "User data"
// @Success 201 {object} dto.AdminUserResponse "Created user"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/users [post]
func (c *AdminController) CreateUser(ctx *gin.Context) {
	var req dto.AdminCreateUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.adminService.CreateUser(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, user)
}

// UpdateUser updates a user
// @Summary Update user (admin only)
// @Description Update user information
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param request body dto.AdminUpdateUserRequest true "User data"
// @Success 200 {object} dto.AdminUserResponse "Updated user"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/users/{id} [put]
func (c *AdminController) UpdateUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.AdminUpdateUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.adminService.UpdateUser(uint(userID), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// DeleteUser deletes a user
// @Summary Delete user (admin only)
// @Description Delete a user account (cannot delete self)
// @Tags admin
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 204 "User deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid user ID or self-deletion"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/users/{id} [delete]
func (c *AdminController) DeleteUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Prevent self-deletion
	actorID := ctx.GetUint("userID")
	if uint(userID) == actorID {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete your own account"})
		return
	}

	if err := c.adminService.DeleteUser(uint(userID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ActivateUser activates/deactivates a user
// @Summary Activate/Deactivate user (admin only)
// @Description Toggle user active status
// @Tags admin
// @Accept json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param request body dto.AdminActivateUserRequest true "Activation status"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/users/{id}/activate [put]
func (c *AdminController) ActivateUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.AdminActivateUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.adminService.ActivateUser(uint(userID), req.Active); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := "deactivated"
	if req.Active {
		status = "activated"
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "user " + status + " successfully"})
}

// ChangeUserRole changes a user's role
// @Summary Change user role (admin only)
// @Description Change user's role within organization
// @Tags admin
// @Accept json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param request body dto.AdminChangeRoleRequest true "New role"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/users/{id}/role [put]
func (c *AdminController) ChangeUserRole(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.AdminChangeRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.adminService.ChangeUserRole(uint(userID), req.Role); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "user role changed successfully"})
}

// ChangeUserSystemRole changes a user's system role
// @Summary Change user system role (admin only)
// @Description Change user's system-wide role (cannot change own role)
// @Tags admin
// @Accept json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param request body dto.AdminChangeSystemRoleRequest true "New system role"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request or self-modification"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/users/{id}/system-role [put]
func (c *AdminController) ChangeUserSystemRole(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.AdminChangeSystemRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prevent changing own system role
	actorID := ctx.GetUint("userID")
	if uint(userID) == actorID {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "cannot change your own system role"})
		return
	}

	if err := c.adminService.ChangeUserSystemRole(uint(userID), req.SystemRole); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "user system role changed successfully"})
}

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

// ListOrganizations lists all organizations
// @Summary List organizations (admin only)
// @Description Get paginated list of all organizations
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param search query string false "Search by name"
// @Param is_active query bool false "Filter by active status"
// @Param is_verified query bool false "Filter by verified status"
// @Success 200 {object} dto.AdminOrgListResponse "Organization list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/organizations [get]
func (c *AdminController) ListOrganizations(ctx *gin.Context) {
	params := &dto.AdminOrgListParams{
		Page:      parseIntParam(ctx, "page", 1),
		PageSize:  parseIntParam(ctx, "page_size", 20),
		Search:    ctx.Query("search"),
		SortBy:    ctx.Query("sort_by"),
		SortOrder: ctx.Query("sort_order"),
	}

	if ctx.Query("is_active") != "" {
		isActive := ctx.Query("is_active") == "true"
		params.IsActive = &isActive
	}

	if ctx.Query("is_verified") != "" {
		isVerified := ctx.Query("is_verified") == "true"
		params.IsVerified = &isVerified
	}

	result, err := c.adminService.ListOrganizations(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetOrganization gets organization by ID
// @Summary Get organization (admin only)
// @Description Get detailed organization information
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Organization ID"
// @Success 200 {object} dto.AdminOrgDetailResponse "Organization details"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "Organization not found"
// @Router /admin/organizations/{id} [get]
func (c *AdminController) GetOrganization(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	org, err := c.adminService.GetOrganization(uint(orgID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "organization not found"})
		return
	}

	ctx.JSON(http.StatusOK, org)
}

// UpdateOrganization updates organization
// @Summary Update organization (admin only)
// @Description Update organization information
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Organization ID"
// @Param request body dto.AdminUpdateOrgRequest true "Organization data"
// @Success 200 {object} dto.AdminOrgResponse "Updated organization"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/organizations/{id} [put]
func (c *AdminController) UpdateOrganization(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.AdminUpdateOrgRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	org, err := c.adminService.UpdateOrganization(uint(orgID), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, org)
}

// DeleteOrganization deletes organization
// @Summary Delete organization (admin only)
// @Description Delete an organization and all associated data
// @Tags admin
// @Security BearerAuth
// @Param id path int true "Organization ID"
// @Success 204 "Organization deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/organizations/{id} [delete]
func (c *AdminController) DeleteOrganization(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	if err := c.adminService.DeleteOrganization(uint(orgID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete organization"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// VerifyOrganization verifies/unverifies organization
// @Summary Verify organization (admin only)
// @Description Toggle organization verification status
// @Tags admin
// @Accept json
// @Security BearerAuth
// @Param id path int true "Organization ID"
// @Param request body dto.AdminVerifyOrgRequest true "Verification status"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/organizations/{id}/verify [put]
func (c *AdminController) VerifyOrganization(ctx *gin.Context) {
	orgID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
		return
	}

	var req dto.AdminVerifyOrgRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID := ctx.GetUint("userID")
	if err := c.adminService.VerifyOrganization(uint(orgID), req.Verified, adminID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := "unverified"
	if req.Verified {
		status = "verified"
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "organization " + status + " successfully"})
}

// ============================================================================
// WORKSPACE MANAGEMENT
// ============================================================================

// ListWorkspaces lists all workspaces
// @Summary List workspaces (admin only)
// @Description Get paginated list of all workspaces
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param org_id query int false "Filter by organization"
// @Param is_active query bool false "Filter by active status"
// @Param is_archived query bool false "Filter by archived status"
// @Success 200 {object} dto.AdminWorkspaceListResponse "Workspace list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/workspaces [get]
func (c *AdminController) ListWorkspaces(ctx *gin.Context) {
	params := &dto.AdminWorkspaceListParams{
		Page:      parseIntParam(ctx, "page", 1),
		PageSize:  parseIntParam(ctx, "page_size", 20),
		Search:    ctx.Query("search"),
		SortBy:    ctx.Query("sort_by"),
		SortOrder: ctx.Query("sort_order"),
	}

	if ctx.Query("org_id") != "" {
		orgID := uint(parseIntParam(ctx, "org_id", 0))
		params.OrgID = &orgID
	}

	if ctx.Query("is_active") != "" {
		isActive := ctx.Query("is_active") == "true"
		params.IsActive = &isActive
	}

	if ctx.Query("is_archived") != "" {
		isArchived := ctx.Query("is_archived") == "true"
		params.IsArchived = &isArchived
	}

	result, err := c.adminService.ListWorkspaces(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetWorkspace gets workspace by ID
// @Summary Get workspace (admin only)
// @Description Get detailed workspace information
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Workspace ID"
// @Success 200 {object} dto.AdminWorkspaceDetailResponse "Workspace details"
// @Failure 400 {object} dto.ErrorResponse "Invalid workspace ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "Workspace not found"
// @Router /admin/workspaces/{id} [get]
func (c *AdminController) GetWorkspace(ctx *gin.Context) {
	wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	workspace, err := c.adminService.GetWorkspace(uint(wsID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
		return
	}

	ctx.JSON(http.StatusOK, workspace)
}

// UpdateWorkspace updates workspace
// @Summary Update workspace (admin only)
// @Description Update workspace information
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Workspace ID"
// @Param request body dto.AdminUpdateWorkspaceRequest true "Workspace data"
// @Success 200 {object} dto.AdminWorkspaceResponse "Updated workspace"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/workspaces/{id} [put]
func (c *AdminController) UpdateWorkspace(ctx *gin.Context) {
	wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	var req dto.AdminUpdateWorkspaceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workspace, err := c.adminService.UpdateWorkspace(uint(wsID), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, workspace)
}

// DeleteWorkspace deletes workspace
// @Summary Delete workspace (admin only)
// @Description Delete a workspace and all associated data
// @Tags admin
// @Security BearerAuth
// @Param id path int true "Workspace ID"
// @Success 204 "Workspace deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid workspace ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/workspaces/{id} [delete]
func (c *AdminController) DeleteWorkspace(ctx *gin.Context) {
	wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	if err := c.adminService.DeleteWorkspace(uint(wsID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete workspace"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ArchiveWorkspace archives/unarchives workspace
// @Summary Archive workspace (admin only)
// @Description Toggle workspace archive status
// @Tags admin
// @Accept json
// @Security BearerAuth
// @Param id path int true "Workspace ID"
// @Param request body dto.AdminArchiveWorkspaceRequest true "Archive status"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/workspaces/{id}/archive [put]
func (c *AdminController) ArchiveWorkspace(ctx *gin.Context) {
	wsID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	var req dto.AdminArchiveWorkspaceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID := ctx.GetUint("userID")
	if err := c.adminService.ArchiveWorkspace(uint(wsID), req.Archived, adminID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := "unarchived"
	if req.Archived {
		status = "archived"
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "workspace " + status + " successfully"})
}

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

// ListTasks lists all tasks
// @Summary List tasks (admin only)
// @Description Get paginated list of all tasks with filtering options
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param user_id query int false "Filter by user"
// @Param org_id query int false "Filter by organization"
// @Param workspace_id query int false "Filter by workspace"
// @Param status query string false "Filter by status"
// @Param is_manual query bool false "Filter by manual creation"
// @Success 200 {object} dto.AdminTaskListResponse "Task list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/tasks [get]
func (c *AdminController) ListTasks(ctx *gin.Context) {
	params := &dto.AdminTaskListParams{
		Page:      parseIntParam(ctx, "page", 1),
		PageSize:  parseIntParam(ctx, "page_size", 20),
		Search:    ctx.Query("search"),
		Status:    ctx.Query("status"),
		SortBy:    ctx.Query("sort_by"),
		SortOrder: ctx.Query("sort_order"),
	}

	if ctx.Query("user_id") != "" {
		userID := uint(parseIntParam(ctx, "user_id", 0))
		params.UserID = &userID
	}

	if ctx.Query("org_id") != "" {
		orgID := uint(parseIntParam(ctx, "org_id", 0))
		params.OrgID = &orgID
	}

	if ctx.Query("workspace_id") != "" {
		wsID := uint(parseIntParam(ctx, "workspace_id", 0))
		params.WorkspaceID = &wsID
	}

	if ctx.Query("is_manual") != "" {
		isManual := ctx.Query("is_manual") == "true"
		params.IsManual = &isManual
	}

	result, err := c.adminService.ListTasks(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetTask gets task by ID
// @Summary Get task (admin only)
// @Description Get detailed task information
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Success 200 {object} dto.AdminTaskDetailResponse "Task details"
// @Failure 400 {object} dto.ErrorResponse "Invalid task ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "Task not found"
// @Router /admin/tasks/{id} [get]
func (c *AdminController) GetTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	task, err := c.adminService.GetTask(uint(taskID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	ctx.JSON(http.StatusOK, task)
}

// UpdateTask updates task
// @Summary Update task (admin only)
// @Description Update task information
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Param request body dto.AdminUpdateTaskRequest true "Task data"
// @Success 200 {object} dto.AdminTaskResponse "Updated task"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/tasks/{id} [put]
func (c *AdminController) UpdateTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	var req dto.AdminUpdateTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task, err := c.adminService.UpdateTask(uint(taskID), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, task)
}

// DeleteTask deletes task
// @Summary Delete task (admin only)
// @Description Delete a task and associated data
// @Tags admin
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Success 204 "Task deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid task ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/tasks/{id} [delete]
func (c *AdminController) DeleteTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	if err := c.adminService.DeleteTask(uint(taskID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete task"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ============================================================================
// TIME LOG MANAGEMENT
// ============================================================================

// ListTimeLogs lists all time logs
// @Summary List time logs (admin only)
// @Description Get paginated list of all time logs with filtering
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param user_id query int false "Filter by user"
// @Param task_id query int false "Filter by task"
// @Param status query string false "Filter by status"
// @Param is_approved query bool false "Filter by approval status"
// @Param start_date query string false "Filter by start date (YYYY-MM-DD)"
// @Param end_date query string false "Filter by end date (YYYY-MM-DD)"
// @Success 200 {object} dto.AdminTimeLogListResponse "Time log list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/timelogs [get]
func (c *AdminController) ListTimeLogs(ctx *gin.Context) {
	params := &dto.AdminTimeLogListParams{
		Page:      parseIntParam(ctx, "page", 1),
		PageSize:  parseIntParam(ctx, "page_size", 20),
		Status:    ctx.Query("status"),
		SortBy:    ctx.Query("sort_by"),
		SortOrder: ctx.Query("sort_order"),
	}

	if ctx.Query("user_id") != "" {
		userID := uint(parseIntParam(ctx, "user_id", 0))
		params.UserID = &userID
	}

	if ctx.Query("org_id") != "" {
		orgID := uint(parseIntParam(ctx, "org_id", 0))
		params.OrgID = &orgID
	}

	if ctx.Query("workspace_id") != "" {
		wsID := uint(parseIntParam(ctx, "workspace_id", 0))
		params.WorkspaceID = &wsID
	}

	if ctx.Query("task_id") != "" {
		taskID := uint(parseIntParam(ctx, "task_id", 0))
		params.TaskID = &taskID
	}

	if ctx.Query("is_approved") != "" {
		isApproved := ctx.Query("is_approved") == "true"
		params.IsApproved = &isApproved
	}

	if ctx.Query("start_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("start_date")); err == nil {
			params.StartDate = &t
		}
	}

	if ctx.Query("end_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("end_date")); err == nil {
			t = t.Add(24*time.Hour - time.Second) // End of day
			params.EndDate = &t
		}
	}

	result, err := c.adminService.ListTimeLogs(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetTimeLog gets time log by ID
// @Summary Get time log (admin only)
// @Description Get detailed time log information
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Time Log ID"
// @Success 200 {object} dto.AdminTimeLogDetailResponse "Time log details"
// @Failure 400 {object} dto.ErrorResponse "Invalid time log ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "Time log not found"
// @Router /admin/timelogs/{id} [get]
func (c *AdminController) GetTimeLog(ctx *gin.Context) {
	tlID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid time log ID"})
		return
	}

	timeLog, err := c.adminService.GetTimeLog(uint(tlID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "time log not found"})
		return
	}

	ctx.JSON(http.StatusOK, timeLog)
}

// UpdateTimeLog updates time log
// @Summary Update time log (admin only)
// @Description Update time log information
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Time Log ID"
// @Param request body dto.AdminUpdateTimeLogRequest true "Time log data"
// @Success 200 {object} dto.AdminTimeLogResponse "Updated time log"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /admin/timelogs/{id} [put]
func (c *AdminController) UpdateTimeLog(ctx *gin.Context) {
	tlID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid time log ID"})
		return
	}

	var req dto.AdminUpdateTimeLogRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	timeLog, err := c.adminService.UpdateTimeLog(uint(tlID), &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, timeLog)
}

// DeleteTimeLog deletes time log
// @Summary Delete time log (admin only)
// @Description Delete a time log entry
// @Tags admin
// @Security BearerAuth
// @Param id path int true "Time Log ID"
// @Success 204 "Time log deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid time log ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/timelogs/{id} [delete]
func (c *AdminController) DeleteTimeLog(ctx *gin.Context) {
	tlID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid time log ID"})
		return
	}

	if err := c.adminService.DeleteTimeLog(uint(tlID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete time log"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ApproveTimeLogs bulk approves time logs
// @Summary Bulk approve time logs (admin only)
// @Description Approve or reject multiple time logs at once
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.AdminApproveTimeLogsRequest true "IDs and approval status"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/timelogs/approve [post]
func (c *AdminController) ApproveTimeLogs(ctx *gin.Context) {
	var req dto.AdminApproveTimeLogsRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID := ctx.GetUint("userID")
	if err := c.adminService.ApproveTimeLogs(&req, adminID); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "time logs updated successfully"})
}

// ============================================================================
// SCREENSHOT MANAGEMENT
// ============================================================================

// ListScreenshots lists all screenshots
// @Summary List screenshots (admin only)
// @Description Get paginated list of all screenshots with filtering
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Items per page" default(20)
// @Param user_id query int false "Filter by user"
// @Param task_id query int false "Filter by task"
// @Param timelog_id query int false "Filter by time log"
// @Param start_date query string false "Filter by start date (YYYY-MM-DD)"
// @Param end_date query string false "Filter by end date (YYYY-MM-DD)"
// @Success 200 {object} dto.AdminScreenshotListResponse "Screenshot list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/screenshots [get]
func (c *AdminController) ListScreenshots(ctx *gin.Context) {
	params := &dto.AdminScreenshotListParams{
		Page:      parseIntParam(ctx, "page", 1),
		PageSize:  parseIntParam(ctx, "page_size", 20),
		SortBy:    ctx.Query("sort_by"),
		SortOrder: ctx.Query("sort_order"),
	}

	if ctx.Query("user_id") != "" {
		userID := uint(parseIntParam(ctx, "user_id", 0))
		params.UserID = &userID
	}

	if ctx.Query("org_id") != "" {
		orgID := uint(parseIntParam(ctx, "org_id", 0))
		params.OrgID = &orgID
	}

	if ctx.Query("workspace_id") != "" {
		wsID := uint(parseIntParam(ctx, "workspace_id", 0))
		params.WorkspaceID = &wsID
	}

	if ctx.Query("task_id") != "" {
		taskID := uint(parseIntParam(ctx, "task_id", 0))
		params.TaskID = &taskID
	}

	if ctx.Query("timelog_id") != "" {
		tlID := uint(parseIntParam(ctx, "timelog_id", 0))
		params.TimeLogID = &tlID
	}

	if ctx.Query("start_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("start_date")); err == nil {
			params.StartDate = &t
		}
	}

	if ctx.Query("end_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("end_date")); err == nil {
			t = t.Add(24*time.Hour - time.Second)
			params.EndDate = &t
		}
	}

	result, err := c.adminService.ListScreenshots(params)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, result)
}

// GetScreenshot gets screenshot by ID
// @Summary Get screenshot (admin only)
// @Description Get screenshot details by ID
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param id path int true "Screenshot ID"
// @Success 200 {object} dto.AdminScreenshotResponse "Screenshot details"
// @Failure 400 {object} dto.ErrorResponse "Invalid screenshot ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 404 {object} dto.ErrorResponse "Screenshot not found"
// @Router /admin/screenshots/{id} [get]
func (c *AdminController) GetScreenshot(ctx *gin.Context) {
	ssID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid screenshot ID"})
		return
	}

	screenshot, err := c.adminService.GetScreenshot(uint(ssID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "screenshot not found"})
		return
	}

	ctx.JSON(http.StatusOK, screenshot)
}

// DeleteScreenshot deletes screenshot
// @Summary Delete screenshot (admin only)
// @Description Delete a screenshot by ID
// @Tags admin
// @Security BearerAuth
// @Param id path int true "Screenshot ID"
// @Success 204 "Screenshot deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid screenshot ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/screenshots/{id} [delete]
func (c *AdminController) DeleteScreenshot(ctx *gin.Context) {
	ssID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid screenshot ID"})
		return
	}

	if err := c.adminService.DeleteScreenshot(uint(ssID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete screenshot"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// BulkDeleteScreenshots deletes multiple screenshots
// @Summary Bulk delete screenshots (admin only)
// @Description Delete multiple screenshots at once
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.AdminBulkDeleteRequest true "Screenshot IDs"
// @Success 200 {object} map[string]string "Status message"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/screenshots/bulk-delete [post]
func (c *AdminController) BulkDeleteScreenshots(ctx *gin.Context) {
	var req dto.AdminBulkDeleteRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.adminService.BulkDeleteScreenshots(req.IDs); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "screenshots deleted successfully"})
}

// ============================================================================
// STATISTICS & REPORTS
// ============================================================================

// GetOverviewStats gets system overview statistics
// @Summary Get overview stats (admin only)
// @Description Get system-wide overview statistics
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.AdminOverviewStats "Overview statistics"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats/overview [get]
func (c *AdminController) GetOverviewStats(ctx *gin.Context) {
	stats, err := c.adminService.GetOverviewStats()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

// GetTrendStats gets trend statistics
// @Summary Get trend stats (admin only)
// @Description Get trend statistics over time
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param period query string false "Period (day/week/month)" default(day)
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} dto.AdminTrendStats "Trend statistics"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats/trends [get]
func (c *AdminController) GetTrendStats(ctx *gin.Context) {
	req := &dto.AdminTrendRequest{
		Period: ctx.DefaultQuery("period", "day"),
	}

	// Default to last 30 days
	req.EndDate = time.Now()
	req.StartDate = req.EndDate.AddDate(0, 0, -30)

	if ctx.Query("start_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("start_date")); err == nil {
			req.StartDate = t
		}
	}

	if ctx.Query("end_date") != "" {
		if t, err := time.Parse("2006-01-02", ctx.Query("end_date")); err == nil {
			req.EndDate = t
		}
	}

	stats, err := c.adminService.GetTrendStats(req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

// GetUserPerformanceStats gets user performance statistics
// @Summary Get user performance stats (admin only)
// @Description Get top performing users statistics
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of top users" default(10)
// @Success 200 {array} dto.AdminUserPerformance "User performance list"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats/user-performance [get]
func (c *AdminController) GetUserPerformanceStats(ctx *gin.Context) {
	limit := parseIntParam(ctx, "limit", 10)

	stats, err := c.adminService.GetUserPerformanceStats(limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

// GetOrgDistributionStats gets organization distribution statistics
// @Summary Get organization distribution stats (admin only)
// @Description Get statistics about organization distribution
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.AdminOrgStats "Organization statistics"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats/org-distribution [get]
func (c *AdminController) GetOrgDistributionStats(ctx *gin.Context) {
	stats, err := c.adminService.GetOrgDistributionStats()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

// GetActivityStats gets activity statistics
// @Summary Get activity stats (admin only)
// @Description Get recent activity statistics
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.AdminActivityStats "Activity statistics"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats/activity [get]
func (c *AdminController) GetActivityStats(ctx *gin.Context) {
	stats, err := c.adminService.GetActivityStats()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}

// GetSystemStats is backward compatible stats endpoint
// @Summary Get system statistics (admin only)
// @Description Get system statistics (alias for overview stats)
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.AdminOverviewStats "System statistics"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /admin/stats [get]
func (c *AdminController) GetSystemStats(ctx *gin.Context) {
	c.GetOverviewStats(ctx)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func parseIntParam(ctx *gin.Context, name string, defaultValue int) int {
	if val := ctx.Query(name); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}
