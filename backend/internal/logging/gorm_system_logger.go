package logging

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
	"remote-time-tracker.dev/internal/service"
)

type gormSystemLogger struct {
	base             gormlogger.Interface
	systemLogService service.SystemLogService
}

// NewGormSystemLogger wraps the configured GORM logger and forwards query errors to system_logs.
func NewGormSystemLogger(
	base gormlogger.Interface,
	systemLogService service.SystemLogService,
) gormlogger.Interface {
	if base == nil {
		base = gormlogger.Default
	}

	return &gormSystemLogger{
		base:             base,
		systemLogService: systemLogService,
	}
}

func (l *gormSystemLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	return &gormSystemLogger{
		base:             l.base.LogMode(level),
		systemLogService: l.systemLogService,
	}
}

func (l *gormSystemLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.base.Info(ctx, msg, data...)
}

func (l *gormSystemLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.base.Warn(ctx, msg, data...)
}

func (l *gormSystemLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.base.Error(ctx, msg, data...)
}

func (l *gormSystemLogger) Trace(
	ctx context.Context,
	begin time.Time,
	fc func() (string, int64),
	err error,
) {
	l.base.Trace(ctx, begin, fc, err)

	if l.systemLogService == nil || err == nil || errors.Is(err, gorm.ErrRecordNotFound) {
		return
	}

	sql, rows := fc()
	l.systemLogService.LogBackend(service.BackendSystemLogInput{
		Source:     "backend-app",
		Level:      "error",
		Component:  "gorm-query",
		Message:    "Database query failed",
		OccurredAt: time.Now().UTC(),
		Details: map[string]interface{}{
			"error":         err.Error(),
			"sql":           sql,
			"rows_affected": rows,
			"duration_ms":   time.Since(begin).Milliseconds(),
		},
		StackTrace: "",
	})
}
