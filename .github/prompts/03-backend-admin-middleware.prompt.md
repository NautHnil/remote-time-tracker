# TODO 03: Backend Admin Middleware

## Mục tiêu

Tạo middleware bảo mật để kiểm tra quyền admin system trước khi cho phép truy cập các API quản trị.

## Yêu cầu

### 1. Middleware SystemAdminRequired

- Kiểm tra user có `system_role = "admin"`
- Chặn request nếu không phải admin
- Return 403 Forbidden với message rõ ràng

### 2. Middleware AdminAuditLog

- Ghi log tất cả action của admin
- Lưu thông tin: user_id, action, entity, ip, user_agent, timestamp

### 3. Middleware RateLimit cho Admin API

- Giới hạn số request/phút cho admin API
- Chống abuse và brute force

## Files cần tạo/chỉnh sửa

```
backend/internal/middleware/admin_middleware.go (create)
backend/internal/middleware/audit_middleware.go (create)
backend/internal/middleware/rate_limit_middleware.go (update/create)
backend/internal/router/admin_routes.go (create)
```

## Tasks chi tiết

### Task 3.1: Tạo Admin Middleware

```go
// backend/internal/middleware/admin_middleware.go
package middleware

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/beuphecan/remote-time-tracker/internal/models"
)

// SystemAdminRequired middleware checks if user has system admin role
func SystemAdminRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get user from context (set by AuthMiddleware)
        userInterface, exists := c.Get("user")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "User not found in context",
                "code":  "UNAUTHORIZED",
            })
            c.Abort()
            return
        }

        user, ok := userInterface.(*models.User)
        if !ok {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "Invalid user type in context",
                "code":  "INTERNAL_ERROR",
            })
            c.Abort()
            return
        }

        // Check system admin role
        if !user.IsSystemAdmin() {
            c.JSON(http.StatusForbidden, gin.H{
                "error":   "Access denied. System admin role required.",
                "code":    "FORBIDDEN",
                "details": "This endpoint requires system administrator privileges.",
            })
            c.Abort()
            return
        }

        // Set admin flag for downstream handlers
        c.Set("is_admin", true)
        c.Set("admin_user", user)

        c.Next()
    }
}

// OrgOwnerOrAdminRequired checks if user is org owner or system admin
func OrgOwnerOrAdminRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        userInterface, exists := c.Get("user")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }

        user := userInterface.(*models.User)

        // System admin can access all
        if user.IsSystemAdmin() {
            c.Set("is_admin", true)
            c.Next()
            return
        }

        // Check if user is org owner (will be checked in handler)
        c.Set("check_org_owner", true)
        c.Next()
    }
}
```

### Task 3.2: Tạo Audit Middleware

```go
// backend/internal/middleware/audit_middleware.go
package middleware

import (
    "bytes"
    "encoding/json"
    "io"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/beuphecan/remote-time-tracker/internal/models"
    "github.com/beuphecan/remote-time-tracker/internal/repository"
)

type auditResponseWriter struct {
    gin.ResponseWriter
    body *bytes.Buffer
}

func (w auditResponseWriter) Write(b []byte) (int, error) {
    w.body.Write(b)
    return w.ResponseWriter.Write(b)
}

// AdminAuditLog logs all admin actions
func AdminAuditLog(auditRepo repository.AuditLogRepository) gin.HandlerFunc {
    return func(c *gin.Context) {
        startTime := time.Now()

        // Read request body
        var requestBody []byte
        if c.Request.Body != nil {
            requestBody, _ = io.ReadAll(c.Request.Body)
            c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
        }

        // Wrap response writer
        blw := &auditResponseWriter{
            body:           bytes.NewBufferString(""),
            ResponseWriter: c.Writer,
        }
        c.Writer = blw

        c.Next()

        // After request
        duration := time.Since(startTime)

        // Get user from context
        var userID *uint
        if userInterface, exists := c.Get("user"); exists {
            if user, ok := userInterface.(*models.User); ok {
                userID = &user.ID
            }
        }

        // Determine action from method and path
        action := determineAction(c.Request.Method, c.FullPath())
        entityType, entityID := extractEntity(c.FullPath(), c.Params)

        // Create audit log
        status := "success"
        if c.Writer.Status() >= 400 {
            status = "failed"
        }

        details := map[string]interface{}{
            "method":       c.Request.Method,
            "path":         c.Request.URL.Path,
            "query":        c.Request.URL.RawQuery,
            "status_code":  c.Writer.Status(),
            "duration_ms":  duration.Milliseconds(),
            "request_body": sanitizeRequestBody(requestBody),
        }
        detailsJSON, _ := json.Marshal(details)

        auditLog := &models.AuditLog{
            UserID:     userID,
            Action:     action,
            EntityType: entityType,
            EntityID:   entityID,
            IPAddress:  c.ClientIP(),
            UserAgent:  c.Request.UserAgent(),
            Details:    string(detailsJSON),
            Status:     status,
        }

        // Save async to not block response
        go auditRepo.Create(auditLog)
    }
}

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

func extractEntity(path string, params gin.Params) (string, *uint) {
    // Extract entity type from path
    // e.g., /api/v1/admin/users/123 -> "user", 123
    // Implementation depends on your route structure
    return "", nil
}

func sanitizeRequestBody(body []byte) string {
    // Remove sensitive fields like password
    var data map[string]interface{}
    if err := json.Unmarshal(body, &data); err != nil {
        return ""
    }

    sensitiveFields := []string{"password", "token", "secret", "api_key"}
    for _, field := range sensitiveFields {
        if _, exists := data[field]; exists {
            data[field] = "[REDACTED]"
        }
    }

    sanitized, _ := json.Marshal(data)
    return string(sanitized)
}
```

### Task 3.3: Tạo Rate Limit Middleware

```go
// backend/internal/middleware/rate_limit_middleware.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type RateLimiter struct {
    visitors map[string]*visitor
    mu       sync.Mutex
    rate     int           // requests per window
    window   time.Duration // time window
}

type visitor struct {
    count    int
    lastSeen time.Time
}

func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
    rl := &RateLimiter{
        visitors: make(map[string]*visitor),
        rate:     rate,
        window:   window,
    }

    // Cleanup goroutine
    go rl.cleanup()

    return rl
}

func (rl *RateLimiter) cleanup() {
    for {
        time.Sleep(time.Minute)
        rl.mu.Lock()
        for ip, v := range rl.visitors {
            if time.Since(v.lastSeen) > rl.window*2 {
                delete(rl.visitors, ip)
            }
        }
        rl.mu.Unlock()
    }
}

func (rl *RateLimiter) isAllowed(ip string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    v, exists := rl.visitors[ip]
    if !exists || time.Since(v.lastSeen) > rl.window {
        rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
        return true
    }

    if v.count >= rl.rate {
        return false
    }

    v.count++
    v.lastSeen = time.Now()
    return true
}

// AdminRateLimit middleware for admin APIs
func AdminRateLimit(limiter *RateLimiter) gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()

        if !limiter.isAllowed(ip) {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error":       "Too many requests",
                "code":        "RATE_LIMIT_EXCEEDED",
                "retry_after": limiter.window.Seconds(),
            })
            c.Abort()
            return
        }

        c.Next()
    }
}
```

### Task 3.4: Tạo Admin Routes

```go
// backend/internal/router/admin_routes.go
package router

import (
    "github.com/gin-gonic/gin"
    "github.com/beuphecan/remote-time-tracker/internal/controller"
    "github.com/beuphecan/remote-time-tracker/internal/middleware"
)

func SetupAdminRoutes(
    rg *gin.RouterGroup,
    adminCtrl *controller.AdminController,
    authMiddleware gin.HandlerFunc,
    auditRepo repository.AuditLogRepository,
) {
    // Create rate limiter: 100 requests per minute for admin
    adminRateLimiter := middleware.NewRateLimiter(100, time.Minute)

    admin := rg.Group("/admin")
    admin.Use(authMiddleware)
    admin.Use(middleware.SystemAdminRequired())
    admin.Use(middleware.AdminRateLimit(adminRateLimiter))
    admin.Use(middleware.AdminAuditLog(auditRepo))
    {
        // Users
        admin.GET("/users", adminCtrl.ListUsers)
        admin.GET("/users/:id", adminCtrl.GetUser)
        admin.POST("/users", adminCtrl.CreateUser)
        admin.PUT("/users/:id", adminCtrl.UpdateUser)
        admin.DELETE("/users/:id", adminCtrl.DeleteUser)

        // Organizations
        admin.GET("/organizations", adminCtrl.ListOrganizations)
        admin.GET("/organizations/:id", adminCtrl.GetOrganization)
        admin.PUT("/organizations/:id", adminCtrl.UpdateOrganization)
        admin.DELETE("/organizations/:id", adminCtrl.DeleteOrganization)

        // Workspaces
        admin.GET("/workspaces", adminCtrl.ListWorkspaces)
        admin.GET("/workspaces/:id", adminCtrl.GetWorkspace)
        admin.PUT("/workspaces/:id", adminCtrl.UpdateWorkspace)
        admin.DELETE("/workspaces/:id", adminCtrl.DeleteWorkspace)

        // Tasks
        admin.GET("/tasks", adminCtrl.ListTasks)
        admin.GET("/tasks/:id", adminCtrl.GetTask)
        admin.PUT("/tasks/:id", adminCtrl.UpdateTask)
        admin.DELETE("/tasks/:id", adminCtrl.DeleteTask)

        // Time Logs
        admin.GET("/timelogs", adminCtrl.ListTimeLogs)
        admin.GET("/timelogs/:id", adminCtrl.GetTimeLog)
        admin.PUT("/timelogs/:id", adminCtrl.UpdateTimeLog)
        admin.DELETE("/timelogs/:id", adminCtrl.DeleteTimeLog)

        // Screenshots
        admin.GET("/screenshots", adminCtrl.ListScreenshots)
        admin.GET("/screenshots/:id", adminCtrl.GetScreenshot)
        admin.DELETE("/screenshots/:id", adminCtrl.DeleteScreenshot)

        // Statistics
        admin.GET("/statistics/overview", adminCtrl.GetOverviewStats)
        admin.GET("/statistics/users", adminCtrl.GetUserStats)
        admin.GET("/statistics/organizations", adminCtrl.GetOrgStats)
        admin.GET("/statistics/activity", adminCtrl.GetActivityStats)
    }
}
```

## Acceptance Criteria

- [ ] Middleware SystemAdminRequired chặn đúng user không phải admin
- [ ] Admin có thể truy cập tất cả admin routes
- [ ] Audit log ghi nhận đầy đủ các action
- [ ] Rate limiter hoạt động đúng
- [ ] Password và sensitive data được redact trong audit log
- [ ] Response time không bị ảnh hưởng nhiều bởi audit logging

## Dependencies

- TODO 01: Database Schema Review
- TODO 02: Backend Admin Seed API

## Estimated Time

- 3-4 giờ

## Testing

```bash
# Test với user thường (should fail)
curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer <user_token>"
# Expected: 403 Forbidden

# Test với admin user (should success)
curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer <admin_token>"
# Expected: 200 OK

# Test rate limit (run multiple times quickly)
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X GET http://localhost:8080/api/v1/admin/users \
    -H "Authorization: Bearer <admin_token>"
done
# Expected: 429 after 100 requests
```

## Security Notes

- Middleware order matters: Auth -> Admin Check -> Rate Limit -> Audit
- Audit log chạy async để không block response
- Sensitive data phải được redact trước khi log
- IP address từ X-Forwarded-For nếu behind proxy
