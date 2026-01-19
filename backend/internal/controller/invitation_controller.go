package controller

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// InvitationController handles invitation-related HTTP requests
type InvitationController struct {
	invitationService service.InvitationService
}

// NewInvitationController creates a new invitation controller
func NewInvitationController(invitationService service.InvitationService) *InvitationController {
	return &InvitationController{
		invitationService: invitationService,
	}
}

// ============================================================================
// INVITATION OPERATIONS
// ============================================================================

// GetByToken gets invitation info by token
// @Summary Get invitation by token
// @Description Get invitation details by token (before accepting)
// @Tags invitations
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} dto.InvitationResponse "Invitation details"
// @Failure 400 {object} dto.ErrorResponse "Token required"
// @Failure 404 {object} dto.ErrorResponse "Invitation not found or expired"
// @Router /invitations/{token} [get]
func (c *InvitationController) GetByToken(ctx *gin.Context) {
	token := ctx.Param("token")
	if token == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invitation token is required"})
		return
	}

	invitation, err := c.invitationService.GetByToken(token)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, invitation)
}

// Accept accepts an invitation
// @Summary Accept invitation
// @Description Accept an invitation by token (requires authentication)
// @Tags invitations
// @Produce json
// @Security BearerAuth
// @Param token path string true "Invitation token"
// @Success 200 {object} dto.OrganizationMemberResponse "Invitation accepted"
// @Failure 400 {object} dto.ErrorResponse "Invalid token or already accepted"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /invitations/accept/{token} [post]
func (c *InvitationController) Accept(ctx *gin.Context) {
	token := ctx.Param("token")
	if token == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invitation token is required"})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.invitationService.Accept(token, userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, member)
}

// Revoke revokes an invitation
// @Summary Revoke invitation
// @Description Revoke a pending invitation
// @Tags invitations
// @Security BearerAuth
// @Param id path int true "Invitation ID"
// @Success 204 "Invitation revoked"
// @Failure 400 {object} dto.ErrorResponse "Invalid invitation ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 403 {object} dto.ErrorResponse "Forbidden"
// @Router /invitations/{id} [delete]
func (c *InvitationController) Revoke(ctx *gin.Context) {
	invitationID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
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

// GetMyInvitations gets pending invitations for current user's email
// @Summary Get my pending invitations
// @Description Get all pending invitations for the authenticated user
// @Tags invitations
// @Produce json
// @Security BearerAuth
// @Success 200 {array} dto.InvitationResponse "Pending invitations"
// @Failure 400 {object} dto.ErrorResponse "User email not found"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /invitations/my [get]
func (c *InvitationController) GetMyInvitations(ctx *gin.Context) {
	email := ctx.GetString("userEmail")
	if email == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "user email not found"})
		return
	}

	invitations, err := c.invitationService.GetByEmail(email)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, invitations)
}

// AcceptByBody accepts an invitation (token in body)
// @Summary Accept invitation by token in body
// @Description Accept an invitation with token provided in request body (for public registration flow)
// @Tags invitations
// @Accept json
// @Produce json
// @Param request body dto.AcceptInvitationRequest true "Invitation token"
// @Success 200 {object} dto.OrganizationMemberResponse "Invitation accepted"
// @Failure 400 {object} dto.ErrorResponse "Invalid request or token"
// @Router /invitations/accept [post]
func (c *InvitationController) AcceptByBody(ctx *gin.Context) {
	var req dto.AcceptInvitationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetUint("userID")
	member, err := c.invitationService.Accept(req.Token, userID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, member)
}
