package logging

import (
	"strings"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/service"
)

type systemLogWriter struct {
	systemLogService service.SystemLogService
	component        string
}

// NewSystemLogWriter creates an io.Writer that persists standard log output.
func NewSystemLogWriter(systemLogService service.SystemLogService, component string) *systemLogWriter {
	return &systemLogWriter{
		systemLogService: systemLogService,
		component:        component,
	}
}

func (w *systemLogWriter) Write(p []byte) (n int, err error) {
	message := strings.TrimSpace(string(p))
	if message == "" {
		return len(p), nil
	}

	w.systemLogService.LogBackend(service.BackendSystemLogInput{
		Source:     "backend-app",
		Level:      inferLevel(message),
		Component:  w.component,
		Message:    message,
		OccurredAt: time.Now().UTC(),
	})

	return len(p), nil
}

func inferLevel(message string) string {
	lower := strings.ToLower(message)
	switch {
	case strings.Contains(lower, "panic"), strings.Contains(lower, "fatal"), strings.Contains(lower, "error"), strings.Contains(lower, "failed"):
		return "error"
	case strings.Contains(lower, "warn"):
		return "warn"
	case strings.Contains(lower, "debug"):
		return "debug"
	default:
		return "info"
	}
}
