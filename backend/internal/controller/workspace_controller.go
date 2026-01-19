package controller

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// WorkspaceController handles workspace-related HTTP requests
type WorkspaceController struct {
	workspaceService service.WorkspaceService
}

// NewWorkspaceController creates a new workspace controller
func NewWorkspaceController(workspaceService service.WorkspaceService) *WorkspaceController {
	return &WorkspaceController{
		workspaceService: workspaceService,
	}
}

// ============================================================================
// WORKSPACE CRUD
// ============================================================================

// GetByID gets workspace by ID
// @Summary Get workspace by ID
// @Description Get workspace details. Use ?members=true to include members list.
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Param members query bool false "Include members list"
// @Success 200 {object} dto.WorkspaceResponse "Workspace details"
// @Failure 400 {object} dto.ErrorResponse "Invalid workspace ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Workspace not found"
// @Router /workspaces/{workspace_id} [get]
func (c *WorkspaceController) GetByID(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	userID := ctx.GetUint("userID")

	// Check if members requested
	withMembers := ctx.Query("members") == "true"

	var workspace *dto.WorkspaceResponse
	if withMembers {
		workspace, err = c.workspaceService.GetByIDWithMembers(uint(workspaceID), userID)
	} else {
		workspace, err = c.workspaceService.GetByID(uint(workspaceID), userID)
	}

	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, workspace)
}

// Update updates a workspace
// @Summary Update workspace
// @Description Update workspace details. Only workspace admin can update.
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Param request body dto.UpdateWorkspaceRequest true "Workspace data"
// @Success 200 {object} dto.WorkspaceResponse "Workspace updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /workspaces/{workspace_id} [put]
func (c *WorkspaceController) Update(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	var req dto.UpdateWorkspaceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	workspace, err := c.workspaceService.Update(uint(workspaceID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, workspace)
}

// Delete deletes a workspace
// @Summary Delete workspace
// @Description Delete a workspace. Only organization owner can delete.
// @Tags workspaces
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Success 204 "Workspace deleted"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /workspaces/{workspace_id} [delete]
func (c *WorkspaceController) Delete(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.workspaceService.Delete(uint(workspaceID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// List lists user's workspaces
// @Summary List user's workspaces
// @Description Get all workspaces the user is a member of. Can filter by organization_id.
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param organization_id query int false "Filter by organization ID"
// @Success 200 {array} dto.WorkspaceListResponse "User's workspaces"
// @Failure 400 {object} dto.ErrorResponse "Invalid organization ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /workspaces [get]
func (c *WorkspaceController) List(ctx *gin.Context) {
	userID := ctx.GetUint("userID")

	// Optional filter by organization
	orgIDStr := ctx.Query("organization_id")
	if orgIDStr != "" {
		orgID, err := strconv.ParseUint(orgIDStr, 10, 32)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
			return
		}

		workspaces, err := c.workspaceService.GetUserWorkspacesByOrg(userID, uint(orgID))
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, workspaces)
		return
	}

	workspaces, err := c.workspaceService.GetUserWorkspaces(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, workspaces)
}

// ============================================================================
// WORKSPACE MEMBERS
// ============================================================================

// GetMembers lists workspace members
// @Summary List workspace members
// @Description Get all members of a workspace with their roles
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Success 200 {array} dto.WorkspaceMemberResponse "Workspace members"
// @Failure 400 {object} dto.ErrorResponse "Invalid workspace ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Not a member"
// @Router /workspaces/{workspace_id}/members [get]
func (c *WorkspaceController) GetMembers(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	userID := ctx.GetUint("userID")
	members, err := c.workspaceService.GetMembers(uint(workspaceID), userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, members)
}

// AddMember adds a member to workspace
// @Summary Add member to workspace
// @Description Add a new member to the workspace. Only workspace admin can add members.
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Param request body dto.AddWorkspaceMemberRequest true "Member data"
// @Success 201 {object} dto.WorkspaceMemberResponse "Member added"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /workspaces/{workspace_id}/members [post]
func (c *WorkspaceController) AddMember(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	var req dto.AddWorkspaceMemberRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.workspaceService.AddMember(uint(workspaceID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, member)
}

// UpdateMember updates a workspace member
// @Summary Update workspace member
// @Description Update a workspace member's role. Only workspace admin can update.
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Param user_id path int true "User ID"
// @Param request body dto.UpdateWorkspaceMemberRequest true "Member data"
// @Success 200 {object} dto.WorkspaceMemberResponse "Member updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /workspaces/{workspace_id}/members/{user_id} [put]
func (c *WorkspaceController) UpdateMember(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	memberUserID, err := strconv.ParseUint(ctx.Param("user_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req dto.UpdateWorkspaceMemberRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.workspaceService.UpdateMember(uint(workspaceID), uint(memberUserID), userID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, member)
}

// RemoveMember removes a member from workspace
// @Summary Remove member from workspace
// @Description Remove a member from the workspace. Only workspace admin can remove.
// @Tags workspaces
// @Security BearerAuth
// @Param workspace_id path int true "Workspace ID"
// @Param user_id path int true "User ID"
// @Success 204 "Member removed"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Cannot remove admin"
// @Router /workspaces/{workspace_id}/members/{user_id} [delete]
func (c *WorkspaceController) RemoveMember(ctx *gin.Context) {
	workspaceID, err := strconv.ParseUint(ctx.Param("workspace_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid workspace ID"})
		return
	}

	memberUserID, err := strconv.ParseUint(ctx.Param("user_id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	userID := ctx.GetUint("userID")
	if err := c.workspaceService.RemoveMember(uint(workspaceID), uint(memberUserID), userID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}
