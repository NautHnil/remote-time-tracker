package middleware

import (
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// Logger middleware logs request details
func Logger(systemLogService service.SystemLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(startTime)

		// Get status code
		statusCode := c.Writer.Status()

		// Get request details
		method := c.Request.Method
		path := c.Request.URL.Path
		clientIP := c.ClientIP()

		if systemLogService != nil {
			systemLogService.LogBackend(service.BackendSystemLogInput{
				Source:     "backend-api",
				Level:      levelFromStatus(statusCode),
				Component:  "http-middleware",
				Message:    method + " " + path,
				OccurredAt: time.Now().UTC(),
				Details: gin.H{
					"status_code": statusCode,
					"latency_ms":  latency.Milliseconds(),
					"client_ip":   clientIP,
					"user_agent":  c.Request.UserAgent(),
					"query":       c.Request.URL.RawQuery,
				},
			})
		}
	}
}

func levelFromStatus(statusCode int) string {
	if statusCode >= 500 {
		return "error"
	}
	if statusCode >= 400 {
		return "warn"
	}
	return "info"
}
