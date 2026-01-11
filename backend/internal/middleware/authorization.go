package middleware

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

const (
	// System-level permissions
	PermSystemAdmin = "system:admin"

	// Organization-level permissions
	PermOrgOwner  = "org:owner"
	PermOrgAdmin  = "org:admin"
	PermOrgMember = "org:member"

	// Workspace-level permissions
	PermWorkspaceAdmin  = "workspace:admin"
	PermWorkspaceMember = "workspace:member"
)

// ============================================================================
// AUTHORIZATION MIDDLEWARE FACTORY
// ============================================================================

// AuthorizationMiddleware creates middleware instances for permission checks
type AuthorizationMiddleware struct {
	orgService       service.OrganizationService
	workspaceService service.WorkspaceService
}

// NewAuthorizationMiddleware creates a new authorization middleware factory
func NewAuthorizationMiddleware(
	orgService service.OrganizationService,
	workspaceService service.WorkspaceService,
) *AuthorizationMiddleware {
	return &AuthorizationMiddleware{
		orgService:       orgService,
		workspaceService: workspaceService,
	}
}

// ============================================================================
// SYSTEM-LEVEL MIDDLEWARE
// ============================================================================

// RequireSystemAdmin requires the user to be a system admin
func RequireSystemAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "Access denied")
			c.Abort()
			return
		}

		// Check system_role from token or user_role for legacy support
		if role != "admin" {
			systemRole, _ := c.Get("system_role")
			if systemRole != "admin" {
				utils.ErrorResponse(c, http.StatusForbidden, "System admin access required")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// ============================================================================
// ORGANIZATION-LEVEL MIDDLEWARE
// ============================================================================

// RequireOrgMember requires the user to be a member of the organization
func (m *AuthorizationMiddleware) RequireOrgMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		orgID, err := m.getOrgIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Organization ID required")
			c.Abort()
			return
		}

		isMember, err := m.orgService.IsMember(orgID, userID)
		if err != nil || !isMember {
			utils.ErrorResponse(c, http.StatusForbidden, "You are not a member of this organization")
			c.Abort()
			return
		}

		// Set org context
		c.Set("orgID", orgID)
		c.Next()
	}
}

// RequireOrgAdmin requires the user to be an admin (owner or admin role) of the organization
func (m *AuthorizationMiddleware) RequireOrgAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		orgID, err := m.getOrgIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Organization ID required")
			c.Abort()
			return
		}

		isAdmin, err := m.orgService.IsAdmin(orgID, userID)
		if err != nil || !isAdmin {
			utils.ErrorResponse(c, http.StatusForbidden, "Organization admin access required")
			c.Abort()
			return
		}

		// Set org context
		c.Set("orgID", orgID)
		c.Set("isOrgAdmin", true)
		c.Next()
	}
}

// RequireOrgOwner requires the user to be the owner of the organization
func (m *AuthorizationMiddleware) RequireOrgOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		orgID, err := m.getOrgIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Organization ID required")
			c.Abort()
			return
		}

		isOwner, err := m.orgService.IsOwner(orgID, userID)
		if err != nil || !isOwner {
			utils.ErrorResponse(c, http.StatusForbidden, "Organization owner access required")
			c.Abort()
			return
		}

		// Set org context
		c.Set("orgID", orgID)
		c.Set("isOrgOwner", true)
		c.Set("isOrgAdmin", true)
		c.Next()
	}
}

// ============================================================================
// WORKSPACE-LEVEL MIDDLEWARE
// ============================================================================

// RequireWorkspaceMember requires the user to be a member of the workspace
func (m *AuthorizationMiddleware) RequireWorkspaceMember() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		workspaceID, err := m.getWorkspaceIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Workspace ID required")
			c.Abort()
			return
		}

		isMember, err := m.workspaceService.IsMember(workspaceID, userID)
		if err != nil || !isMember {
			utils.ErrorResponse(c, http.StatusForbidden, "You are not a member of this workspace")
			c.Abort()
			return
		}

		// Set workspace context
		c.Set("workspaceID", workspaceID)
		c.Next()
	}
}

// RequireWorkspaceAdmin requires the user to be an admin of the workspace
func (m *AuthorizationMiddleware) RequireWorkspaceAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		workspaceID, err := m.getWorkspaceIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Workspace ID required")
			c.Abort()
			return
		}

		isAdmin, err := m.workspaceService.IsAdmin(workspaceID, userID)
		if err != nil || !isAdmin {
			utils.ErrorResponse(c, http.StatusForbidden, "Workspace admin access required")
			c.Abort()
			return
		}

		// Set workspace context
		c.Set("workspaceID", workspaceID)
		c.Set("isWorkspaceAdmin", true)
		c.Next()
	}
}

// RequireWorkspaceManager requires the user to be able to manage the workspace
// (org owner, org admin, or workspace admin)
func (m *AuthorizationMiddleware) RequireWorkspaceManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not authenticated")
			c.Abort()
			return
		}

		workspaceID, err := m.getWorkspaceIDFromContext(c)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "Workspace ID required")
			c.Abort()
			return
		}

		canManage, err := m.workspaceService.CanManageWorkspace(workspaceID, userID)
		if err != nil || !canManage {
			utils.ErrorResponse(c, http.StatusForbidden, "You cannot manage this workspace")
			c.Abort()
			return
		}

		// Set workspace context
		c.Set("workspaceID", workspaceID)
		c.Set("canManageWorkspace", true)
		c.Next()
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// getOrgIDFromContext extracts organization ID from request
func (m *AuthorizationMiddleware) getOrgIDFromContext(c *gin.Context) (uint, error) {
	// Try path parameter
	orgIDStr := c.Param("id")
	if orgIDStr == "" {
		orgIDStr = c.Param("orgID")
	}
	if orgIDStr == "" {
		orgIDStr = c.Param("org_id")
	}

	// Try query parameter
	if orgIDStr == "" {
		orgIDStr = c.Query("organization_id")
	}
	if orgIDStr == "" {
		orgIDStr = c.Query("org_id")
	}

	// Try from context (set by previous middleware)
	if orgIDStr == "" {
		if orgID, exists := c.Get("orgID"); exists {
			return orgID.(uint), nil
		}
	}

	if orgIDStr == "" {
		return 0, http.ErrNotSupported
	}

	orgID, err := strconv.ParseUint(orgIDStr, 10, 32)
	if err != nil {
		return 0, err
	}

	return uint(orgID), nil
}

// getWorkspaceIDFromContext extracts workspace ID from request
func (m *AuthorizationMiddleware) getWorkspaceIDFromContext(c *gin.Context) (uint, error) {
	// Try path parameter
	wsIDStr := c.Param("id")
	if wsIDStr == "" {
		wsIDStr = c.Param("workspaceID")
	}
	if wsIDStr == "" {
		wsIDStr = c.Param("workspace_id")
	}

	// Try query parameter
	if wsIDStr == "" {
		wsIDStr = c.Query("workspace_id")
	}

	// Try from context (set by previous middleware)
	if wsIDStr == "" {
		if wsID, exists := c.Get("workspaceID"); exists {
			return wsID.(uint), nil
		}
	}

	if wsIDStr == "" {
		return 0, http.ErrNotSupported
	}

	wsID, err := strconv.ParseUint(wsIDStr, 10, 32)
	if err != nil {
		return 0, err
	}

	return uint(wsID), nil
}

// ============================================================================
// PERMISSION HELPER MIDDLEWARE
// ============================================================================

// SetUserIDMiddleware extracts userID from context and sets as uint
func SetUserIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if userID, exists := c.Get("user_id"); exists {
			switch v := userID.(type) {
			case uint:
				c.Set("userID", v)
			case int:
				c.Set("userID", uint(v))
			case float64:
				c.Set("userID", uint(v))
			}
		}

		if userEmail, exists := c.Get("user_email"); exists {
			c.Set("userEmail", userEmail)
		}

		c.Next()
	}
}

// CanViewAllData checks if user can view all data (system admin)
func CanViewAllData(c *gin.Context) bool {
	role, exists := c.Get("user_role")
	if !exists {
		return false
	}
	return role == "admin"
}

// IsSystemAdmin checks if user is system admin
func IsSystemAdmin(c *gin.Context) bool {
	role, exists := c.Get("user_role")
	if !exists {
		return false
	}
	if role == "admin" {
		return true
	}

	systemRole, _ := c.Get("system_role")
	return systemRole == "admin"
}
