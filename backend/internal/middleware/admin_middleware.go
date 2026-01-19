package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// ============================================================================
// SYSTEM ADMIN MIDDLEWARE
// ============================================================================

// SystemAdminRequired middleware checks if user has system admin role
// This middleware requires AuthMiddleware to be applied first
func SystemAdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user_role from context (set by AuthMiddleware)
		role, roleExists := c.Get("user_role")

		// First check if role is admin
		if roleExists && role == "admin" {
			c.Set("is_system_admin", true)
			c.Next()
			return
		}

		// If not, reject
		utils.ErrorResponse(c, http.StatusForbidden, "Access denied. System admin role required.")
		c.Abort()
	}
}

// SystemAdminRequiredWithUser middleware checks system admin and loads user info
// Use this when you need access to the full user object
func SystemAdminRequiredWithUser(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user_id from context (set by AuthMiddleware)
		userID, exists := c.Get("user_id")
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User not found in context")
			c.Abort()
			return
		}

		// Load user from database
		user, err := userRepo.FindByID(userID.(uint))
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "Failed to load user")
			c.Abort()
			return
		}

		// Check if user is system admin
		if !user.IsSystemAdmin() {
			utils.ErrorResponse(c, http.StatusForbidden, "Access denied. System admin role required.")
			c.Abort()
			return
		}

		// Set user and admin flag in context
		c.Set("user", user)
		c.Set("admin_user", user)
		c.Set("is_system_admin", true)

		c.Next()
	}
}

// ============================================================================
// AUDIT LOG MIDDLEWARE
// ============================================================================

// auditResponseWriter wraps gin.ResponseWriter to capture response body
type auditResponseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w auditResponseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// AdminAuditLog logs all admin actions to database
func AdminAuditLog(auditRepo repository.AuditLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Read request body for logging (non-sensitive data only)
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			// Restore the body for downstream handlers
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Capture response
		writer := &auditResponseWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBufferString(""),
		}
		c.Writer = writer

		// Process request
		c.Next()

		// Get user info
		userID, _ := c.Get("user_id")
		var userIDPtr *uint
		if id, ok := userID.(uint); ok && id > 0 {
			userIDPtr = &id
		}

		// Prepare audit details
		details := map[string]interface{}{
			"method":        c.Request.Method,
			"path":          c.Request.URL.Path,
			"query":         c.Request.URL.RawQuery,
			"status":        c.Writer.Status(),
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"response_size": writer.body.Len(),
		}

		// Add sanitized request body (remove sensitive fields)
		if len(requestBody) > 0 && len(requestBody) < 10000 { // Limit size
			var bodyMap map[string]interface{}
			if err := json.Unmarshal(requestBody, &bodyMap); err == nil {
				// Remove sensitive fields
				delete(bodyMap, "password")
				delete(bodyMap, "token")
				delete(bodyMap, "secret")
				delete(bodyMap, "api_key")
				details["request_body"] = bodyMap
			}
		}

		detailsJSON, _ := json.Marshal(details)

		// Determine action from method and path
		action := determineAction(c.Request.Method, c.Request.URL.Path)

		// Determine status
		status := "success"
		if c.Writer.Status() >= 400 {
			status = "failed"
		}

		// Create audit log entry
		auditLog := &models.AuditLog{
			UserID:     userIDPtr,
			Action:     action,
			EntityType: determineEntityType(c.Request.URL.Path),
			EntityID:   extractEntityID(c),
			IPAddress:  c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			Details:    string(detailsJSON),
			Status:     status,
		}

		// Save audit log asynchronously
		go func() {
			if err := auditRepo.Create(auditLog); err != nil {
				// Log error but don't fail the request
				// You might want to use a proper logger here
			}
		}()
	}
}

// Helper functions for audit logging
func determineAction(method, path string) string {
	switch method {
	case "GET":
		return "view"
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "unknown"
	}
}

func determineEntityType(path string) string {
	// Extract entity type from path like /api/v1/admin/users
	// This is a simplified version
	if contains(path, "/users") {
		return "user"
	}
	if contains(path, "/organizations") {
		return "organization"
	}
	if contains(path, "/workspaces") {
		return "workspace"
	}
	if contains(path, "/tasks") {
		return "task"
	}
	if contains(path, "/timelogs") {
		return "time_log"
	}
	if contains(path, "/screenshots") {
		return "screenshot"
	}
	if contains(path, "/statistics") {
		return "statistics"
	}
	return "system"
}

func contains(s, substr string) bool {
	return bytes.Contains([]byte(s), []byte(substr))
}

func extractEntityID(c *gin.Context) *uint {
	// Try to get entity ID from URL params
	for _, param := range []string{"id", "user_id", "org_id", "workspace_id", "task_id"} {
		if idStr := c.Param(param); idStr != "" {
			// Parse ID
			var id uint
			if _, err := utils.ParseUint(idStr, &id); err == nil && id > 0 {
				return &id
			}
		}
	}
	return nil
}

// ============================================================================
// RATE LIMIT MIDDLEWARE
// ============================================================================

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}

	// Clean up old entries periodically
	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, times := range rl.requests {
			var valid []time.Time
			for _, t := range times {
				if now.Sub(t) < rl.window {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = valid
			}
		}
		rl.mu.Unlock()
	}
}

// Allow checks if a request is allowed under rate limit
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Filter requests within the window
	var valid []time.Time
	for _, t := range rl.requests[key] {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[key] = valid
		return false
	}

	rl.requests[key] = append(valid, now)
	return true
}

// AdminRateLimit middleware limits requests per IP for admin endpoints
func AdminRateLimit(requestsPerMinute int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerMinute, time.Minute)

	return func(c *gin.Context) {
		// Use combination of IP and user ID as key
		key := c.ClientIP()
		if userID, exists := c.Get("user_id"); exists {
			key = key + ":" + utils.UintToString(userID.(uint))
		}

		if !limiter.Allow(key) {
			utils.ErrorResponse(c, http.StatusTooManyRequests, "Rate limit exceeded. Please try again later.")
			c.Abort()
			return
		}

		c.Next()
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// GetAdminUser extracts the admin user from context
func GetAdminUser(c *gin.Context) *models.User {
	user, exists := c.Get("admin_user")
	if !exists {
		return nil
	}
	if u, ok := user.(*models.User); ok {
		return u
	}
	return nil
}
