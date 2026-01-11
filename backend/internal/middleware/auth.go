package middleware

import (
	"net/http"
	"strings"

	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// Try to get token from Authorization header first
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// If no token in header, try query parameter (for image viewing)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// If still no token, return error
		if tokenString == "" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Authorization token required")
			c.Abort()
			return
		}

		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid or expired token")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("userID", claims.UserID) // Also set camelCase version for controllers
		c.Set("user_email", claims.Email)
		c.Set("userEmail", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT tokens but doesn't abort if missing
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString := parts[1]
				claims, err := utils.ValidateToken(tokenString)
				if err == nil {
					c.Set("user_id", claims.UserID)
					c.Set("userID", claims.UserID)
					c.Set("user_email", claims.Email)
					c.Set("userEmail", claims.Email)
					c.Set("user_role", claims.Role)
					c.Set("userRole", claims.Role)
				}
			}
		}
		c.Next()
	}
}

// AdminMiddleware checks if user has admin role
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			utils.ErrorResponse(c, http.StatusForbidden, "Unauthorized access")
			c.Abort()
			return
		}

		if role != "admin" {
			utils.ErrorResponse(c, http.StatusForbidden, "Admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	id, ok := userID.(uint)
	return id, ok
}
