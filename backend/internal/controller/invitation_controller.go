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
// @Tags invitations
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} dto.InvitationResponse
// @Router /api/v1/invitations/accept/{token} [get]
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
// @Tags invitations
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} dto.OrganizationMemberResponse
// @Router /api/v1/invitations/accept/{token} [post]
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
// @Tags invitations
// @Param id path int true "Invitation ID"
// @Success 204
// @Router /api/v1/invitations/{id} [delete]
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
// @Tags invitations
// @Produce json
// @Success 200 {array} dto.InvitationResponse
// @Router /api/v1/invitations/me [get]
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
// @Tags invitations
// @Accept json
// @Produce json
// @Param request body dto.AcceptInvitationRequest true "Invitation token"
// @Success 200 {object} dto.OrganizationMemberResponse
// @Router /api/v1/invitations/accept [post]
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
