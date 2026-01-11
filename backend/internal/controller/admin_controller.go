package controller

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// AdminController handles admin-only HTTP requests
type AdminController struct {
	userRepo    repository.UserRepository
	authService service.AuthService
}

// NewAdminController creates a new admin controller
func NewAdminController(
	userRepo repository.UserRepository,
	authService service.AuthService,
) *AdminController {
	return &AdminController{
		userRepo:    userRepo,
		authService: authService,
	}
}

// ============================================================================
// USER MANAGEMENT (System Admin Only)
// ============================================================================

// ListUsers lists all users
// @Summary List all users (admin only)
// @Tags admin
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/admin/users [get]
func (c *AdminController) ListUsers(ctx *gin.Context) {
	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	users, total, err := c.userRepo.FindAllPaginated(limit, offset)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert to response format
	userResponses := make([]dto.UserResponse, 0, len(users))
	for _, u := range users {
		userResponses = append(userResponses, dto.UserResponse{
			ID:          u.ID,
			Email:       u.Email,
			FirstName:   u.FirstName,
			LastName:    u.LastName,
			Role:        u.Role,
			IsActive:    u.IsActive,
			LastLoginAt: u.LastLoginAt,
			CreatedAt:   u.CreatedAt,
		})
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	ctx.JSON(http.StatusOK, gin.H{
		"users":       userResponses,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

// GetUser gets a user by ID
// @Summary Get user by ID (admin only)
// @Tags admin
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} dto.UserResponse
// @Router /api/v1/admin/users/{id} [get]
func (c *AdminController) GetUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := c.userRepo.FindByID(uint(userID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	ctx.JSON(http.StatusOK, dto.UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		Role:        user.Role,
		IsActive:    user.IsActive,
		LastLoginAt: user.LastLoginAt,
		CreatedAt:   user.CreatedAt,
	})
}

// UpdateUser updates a user
// @Summary Update user (admin only)
// @Tags admin
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param request body AdminUpdateUserRequest true "User data"
// @Success 200 {object} dto.UserResponse
// @Router /api/v1/admin/users/{id} [put]
func (c *AdminController) UpdateUser(ctx *gin.Context) {
	userID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req AdminUpdateUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.userRepo.FindByID(uint(userID))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Update fields
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.SystemRole != nil {
		user.SystemRole = *req.SystemRole
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if err := c.userRepo.Update(user); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	ctx.JSON(http.StatusOK, dto.UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		Role:        user.Role,
		IsActive:    user.IsActive,
		LastLoginAt: user.LastLoginAt,
		CreatedAt:   user.CreatedAt,
	})
}

// DeleteUser deletes a user
// @Summary Delete user (admin only)
// @Tags admin
// @Param id path int true "User ID"
// @Success 204
// @Router /api/v1/admin/users/{id} [delete]
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

	if err := c.userRepo.Delete(uint(userID)); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	ctx.JSON(http.StatusNoContent, nil)
}

// ============================================================================
// STATS & REPORTS (System Admin Only)
// ============================================================================

// GetSystemStats gets system-wide statistics
// @Summary Get system statistics (admin only)
// @Tags admin
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/admin/stats [get]
func (c *AdminController) GetSystemStats(ctx *gin.Context) {
	// Get user count
	userCount, _ := c.userRepo.Count()

	// TODO: Add more stats from other repositories
	// - Total tasks
	// - Total time logged
	// - Total screenshots
	// - Active users (last 7 days)
	// - Organization count
	// - Workspace count

	ctx.JSON(http.StatusOK, gin.H{
		"total_users": userCount,
		// Add more stats here
	})
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

// AdminUpdateUserRequest represents admin user update request
type AdminUpdateUserRequest struct {
	FirstName  *string `json:"first_name"`
	LastName   *string `json:"last_name"`
	Role       *string `json:"role"`
	SystemRole *string `json:"system_role"`
	IsActive   *bool   `json:"is_active"`
}

// AdminCreateUserRequest represents admin user creation request
type AdminCreateUserRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=8"`
	FirstName  string `json:"first_name" binding:"required"`
	LastName   string `json:"last_name" binding:"required"`
	Role       string `json:"role"`
	SystemRole string `json:"system_role"`
}
