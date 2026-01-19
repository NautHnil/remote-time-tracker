# TODO 10: Backend Admin Statistics API

## Mục tiêu

Triển khai API báo cáo thống kê hệ thống cho admin dashboard.

## Yêu cầu

### 1. API Endpoints

| Method | Endpoint                                 | Mô tả                   |
| ------ | ---------------------------------------- | ----------------------- |
| GET    | `/api/v1/admin/statistics/overview`      | Tổng quan hệ thống      |
| GET    | `/api/v1/admin/statistics/users`         | Thống kê users          |
| GET    | `/api/v1/admin/statistics/organizations` | Thống kê organizations  |
| GET    | `/api/v1/admin/statistics/activity`      | Thống kê hoạt động      |
| GET    | `/api/v1/admin/statistics/trends`        | Xu hướng theo thời gian |
| GET    | `/api/v1/admin/statistics/realtime`      | Dữ liệu realtime        |

## Files cần tạo/chỉnh sửa

```
backend/internal/controller/admin_controller.go (update)
backend/internal/repository/admin_repository.go (update)
backend/internal/dto/admin_dto.go (update)
```

## Tasks chi tiết

### Task 10.1: Thêm Statistics DTOs

```go
// backend/internal/dto/admin_dto.go (thêm vào)

// ============================================================================
// STATISTICS ADMIN DTOs
// ============================================================================

type AdminOverviewStatsResponse struct {
    // Users
    TotalUsers       int64 `json:"total_users"`
    ActiveUsers      int64 `json:"active_users"`
    NewUsersToday    int64 `json:"new_users_today"`
    NewUsersThisWeek int64 `json:"new_users_this_week"`

    // Organizations
    TotalOrganizations   int64 `json:"total_organizations"`
    ActiveOrganizations  int64 `json:"active_organizations"`
    VerifiedOrganizations int64 `json:"verified_organizations"`

    // Workspaces
    TotalWorkspaces  int64 `json:"total_workspaces"`
    ActiveWorkspaces int64 `json:"active_workspaces"`

    // Tasks
    TotalTasks     int64 `json:"total_tasks"`
    ActiveTasks    int64 `json:"active_tasks"`
    CompletedTasks int64 `json:"completed_tasks"`

    // Time Logs
    TotalTimeLogs   int64  `json:"total_timelogs"`
    TotalDuration   int64  `json:"total_duration"`
    TotalDurationHuman string `json:"total_duration_human"`
    TodayDuration   int64  `json:"today_duration"`
    WeekDuration    int64  `json:"week_duration"`
    MonthDuration   int64  `json:"month_duration"`

    // Screenshots
    TotalScreenshots int64  `json:"total_screenshots"`
    TotalStorageSize int64  `json:"total_storage_size"`
    TotalStorageHuman string `json:"total_storage_human"`

    // Activity
    ActiveSessionsNow int64 `json:"active_sessions_now"`

    // Growth
    UserGrowthRate    float64 `json:"user_growth_rate"`    // % change from last month
    OrgGrowthRate     float64 `json:"org_growth_rate"`
    ActivityGrowthRate float64 `json:"activity_growth_rate"`
}

type AdminUserStatsResponse struct {
    TotalUsers      int64 `json:"total_users"`
    ActiveUsers     int64 `json:"active_users"`
    InactiveUsers   int64 `json:"inactive_users"`
    AdminUsers      int64 `json:"admin_users"`
    MemberUsers     int64 `json:"member_users"`

    // Registration trends
    RegistrationsByDay   []DailyCount `json:"registrations_by_day"`
    RegistrationsByMonth []MonthlyCount `json:"registrations_by_month"`

    // Activity
    MostActiveUsers []UserActivityInfo `json:"most_active_users"`
    RecentLogins    []RecentLoginInfo `json:"recent_logins"`

    // Retention
    DailyActiveUsers  int64   `json:"daily_active_users"`
    WeeklyActiveUsers int64   `json:"weekly_active_users"`
    MonthlyActiveUsers int64  `json:"monthly_active_users"`
    RetentionRate     float64 `json:"retention_rate"`
}

type DailyCount struct {
    Date  string `json:"date"`
    Count int64  `json:"count"`
}

type MonthlyCount struct {
    Month string `json:"month"`
    Count int64  `json:"count"`
}

type UserActivityInfo struct {
    UserID        uint   `json:"user_id"`
    Email         string `json:"email"`
    UserName      string `json:"user_name"`
    TotalDuration int64  `json:"total_duration"`
    TasksCount    int64  `json:"tasks_count"`
    LastActive    time.Time `json:"last_active"`
}

type RecentLoginInfo struct {
    UserID     uint      `json:"user_id"`
    Email      string    `json:"email"`
    UserName   string    `json:"user_name"`
    LoginAt    time.Time `json:"login_at"`
    IPAddress  string    `json:"ip_address"`
    DeviceName string    `json:"device_name"`
}

type AdminOrgStatsResponse struct {
    TotalOrganizations    int64 `json:"total_organizations"`
    ActiveOrganizations   int64 `json:"active_organizations"`
    InactiveOrganizations int64 `json:"inactive_organizations"`
    VerifiedOrganizations int64 `json:"verified_organizations"`

    // Size distribution
    SmallOrgs  int64 `json:"small_orgs"`   // 1-10 members
    MediumOrgs int64 `json:"medium_orgs"`  // 11-50 members
    LargeOrgs  int64 `json:"large_orgs"`   // 50+ members

    // Top organizations
    TopOrgsByMembers  []OrgRankInfo `json:"top_orgs_by_members"`
    TopOrgsByActivity []OrgRankInfo `json:"top_orgs_by_activity"`

    // Growth
    NewOrgsThisMonth int64 `json:"new_orgs_this_month"`
    OrgGrowthByMonth []MonthlyCount `json:"org_growth_by_month"`
}

type OrgRankInfo struct {
    OrgID         uint   `json:"org_id"`
    OrgName       string `json:"org_name"`
    MembersCount  int64  `json:"members_count"`
    TotalDuration int64  `json:"total_duration"`
    TasksCount    int64  `json:"tasks_count"`
}

type AdminActivityStatsResponse struct {
    // Today
    TodayTimeLogs     int64 `json:"today_timelogs"`
    TodayDuration     int64 `json:"today_duration"`
    TodayScreenshots  int64 `json:"today_screenshots"`
    TodayActiveUsers  int64 `json:"today_active_users"`

    // This week
    WeekTimeLogs     int64 `json:"week_timelogs"`
    WeekDuration     int64 `json:"week_duration"`
    WeekScreenshots  int64 `json:"week_screenshots"`

    // Activity by hour (last 24 hours)
    ActivityByHour []HourlyActivity `json:"activity_by_hour"`

    // Activity by day (last 30 days)
    ActivityByDay []DailyActivity `json:"activity_by_day"`

    // Peak hours
    PeakHour       int   `json:"peak_hour"`
    PeakHourCount  int64 `json:"peak_hour_count"`

    // Average session duration
    AvgSessionDuration int64 `json:"avg_session_duration"`
}

type HourlyActivity struct {
    Hour          int   `json:"hour"` // 0-23
    TimeLogs      int64 `json:"timelogs"`
    Duration      int64 `json:"duration"`
    Screenshots   int64 `json:"screenshots"`
    ActiveUsers   int64 `json:"active_users"`
}

type DailyActivity struct {
    Date          string `json:"date"`
    TimeLogs      int64  `json:"timelogs"`
    Duration      int64  `json:"duration"`
    DurationHuman string `json:"duration_human"`
    Screenshots   int64  `json:"screenshots"`
    ActiveUsers   int64  `json:"active_users"`
    Tasks         int64  `json:"tasks"`
}

type AdminTrendStatsRequest struct {
    Period    string    `form:"period"` // daily, weekly, monthly
    StartDate time.Time `form:"start_date" time_format:"2006-01-02"`
    EndDate   time.Time `form:"end_date" time_format:"2006-01-02"`
    OrgID     *uint     `form:"org_id"`
}

type AdminTrendStatsResponse struct {
    Period     string           `json:"period"`
    DataPoints []TrendDataPoint `json:"data_points"`
}

type TrendDataPoint struct {
    Date          string  `json:"date"`
    Users         int64   `json:"users"`
    Tasks         int64   `json:"tasks"`
    TimeLogs      int64   `json:"timelogs"`
    Duration      int64   `json:"duration"`
    Screenshots   int64   `json:"screenshots"`
    GrowthRate    float64 `json:"growth_rate"`
}

type AdminRealtimeStatsResponse struct {
    ActiveSessions    int64             `json:"active_sessions"`
    OnlineUsers       []OnlineUserInfo  `json:"online_users"`
    RecentActivity    []RecentActivityInfo `json:"recent_activity"`
    SystemHealth      SystemHealthInfo  `json:"system_health"`
}

type OnlineUserInfo struct {
    UserID       uint      `json:"user_id"`
    Email        string    `json:"email"`
    UserName     string    `json:"user_name"`
    CurrentTask  string    `json:"current_task"`
    SessionStart time.Time `json:"session_start"`
    Duration     int64     `json:"duration"`
    DeviceName   string    `json:"device_name"`
}

type RecentActivityInfo struct {
    Timestamp   time.Time `json:"timestamp"`
    UserEmail   string    `json:"user_email"`
    Action      string    `json:"action"`
    Description string    `json:"description"`
}

type SystemHealthInfo struct {
    DatabaseStatus  string  `json:"database_status"`
    StorageUsed     int64   `json:"storage_used"`
    StorageTotal    int64   `json:"storage_total"`
    StoragePercent  float64 `json:"storage_percent"`
    APIResponseTime int64   `json:"api_response_time"` // ms
    ErrorRate       float64 `json:"error_rate"`
    Uptime          int64   `json:"uptime"` // seconds
}
```

### Task 10.2: Thêm Repository Methods

```go
// backend/internal/repository/admin_repository.go (thêm vào)

// Statistics
func (r *adminRepository) GetOverviewStats() (*dto.AdminOverviewStatsResponse, error) {
    stats := &dto.AdminOverviewStatsResponse{}

    // Users
    r.db.Model(&models.User{}).Count(&stats.TotalUsers)
    r.db.Model(&models.User{}).Where("is_active = true").Count(&stats.ActiveUsers)
    r.db.Model(&models.User{}).Where("DATE(created_at) = CURRENT_DATE").Count(&stats.NewUsersToday)
    r.db.Model(&models.User{}).Where("created_at >= NOW() - INTERVAL '7 days'").Count(&stats.NewUsersThisWeek)

    // Organizations
    r.db.Model(&models.Organization{}).Count(&stats.TotalOrganizations)
    r.db.Model(&models.Organization{}).Where("is_active = true").Count(&stats.ActiveOrganizations)
    r.db.Model(&models.Organization{}).Where("is_verified = true").Count(&stats.VerifiedOrganizations)

    // Workspaces
    r.db.Model(&models.Workspace{}).Count(&stats.TotalWorkspaces)
    r.db.Model(&models.Workspace{}).Where("is_active = true").Count(&stats.ActiveWorkspaces)

    // Tasks
    r.db.Model(&models.Task{}).Count(&stats.TotalTasks)
    r.db.Model(&models.Task{}).Where("status = 'active'").Count(&stats.ActiveTasks)
    r.db.Model(&models.Task{}).Where("status = 'completed'").Count(&stats.CompletedTasks)

    // Time Logs
    r.db.Model(&models.TimeLog{}).Count(&stats.TotalTimeLogs)

    var durationStats struct {
        TotalDuration int64
        TodayDuration int64
        WeekDuration  int64
        MonthDuration int64
    }
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0) as total_duration").
        Scan(&durationStats)
    stats.TotalDuration = durationStats.TotalDuration
    stats.TotalDurationHuman = formatDurationHuman(stats.TotalDuration)

    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0)").
        Where("DATE(start_time) = CURRENT_DATE").
        Scan(&stats.TodayDuration)

    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0)").
        Where("start_time >= NOW() - INTERVAL '7 days'").
        Scan(&stats.WeekDuration)

    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0)").
        Where("start_time >= NOW() - INTERVAL '30 days'").
        Scan(&stats.MonthDuration)

    // Screenshots
    r.db.Model(&models.Screenshot{}).Count(&stats.TotalScreenshots)
    var storageSize int64
    r.db.Model(&models.Screenshot{}).Select("COALESCE(SUM(file_size), 0)").Scan(&storageSize)
    stats.TotalStorageSize = storageSize
    stats.TotalStorageHuman = humanizeBytes(storageSize)

    // Active sessions
    r.db.Model(&models.TimeLog{}).
        Where("status = 'running'").
        Count(&stats.ActiveSessionsNow)

    // Calculate growth rates
    var lastMonthUsers, thisMonthUsers int64
    r.db.Model(&models.User{}).
        Where("created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'").
        Count(&lastMonthUsers)
    r.db.Model(&models.User{}).
        Where("created_at >= NOW() - INTERVAL '30 days'").
        Count(&thisMonthUsers)
    if lastMonthUsers > 0 {
        stats.UserGrowthRate = float64(thisMonthUsers-lastMonthUsers) / float64(lastMonthUsers) * 100
    }

    return stats, nil
}

func (r *adminRepository) GetUserStats() (*dto.AdminUserStatsResponse, error) {
    stats := &dto.AdminUserStatsResponse{}

    r.db.Model(&models.User{}).Count(&stats.TotalUsers)
    r.db.Model(&models.User{}).Where("is_active = true").Count(&stats.ActiveUsers)
    r.db.Model(&models.User{}).Where("is_active = false").Count(&stats.InactiveUsers)
    r.db.Model(&models.User{}).Where("system_role = 'admin'").Count(&stats.AdminUsers)
    r.db.Model(&models.User{}).Where("system_role = 'member'").Count(&stats.MemberUsers)

    // Registrations by day (last 30 days)
    var dailyRegs []dto.DailyCount
    r.db.Table("users").
        Select("DATE(created_at) as date, COUNT(*) as count").
        Where("created_at >= NOW() - INTERVAL '30 days'").
        Group("DATE(created_at)").
        Order("date DESC").
        Scan(&dailyRegs)
    stats.RegistrationsByDay = dailyRegs

    // Registrations by month (last 12 months)
    var monthlyRegs []dto.MonthlyCount
    r.db.Table("users").
        Select("TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count").
        Where("created_at >= NOW() - INTERVAL '12 months'").
        Group("TO_CHAR(created_at, 'YYYY-MM')").
        Order("month DESC").
        Scan(&monthlyRegs)
    stats.RegistrationsByMonth = monthlyRegs

    // Most active users
    var mostActive []dto.UserActivityInfo
    r.db.Table("users").
        Select(`
            users.id as user_id,
            users.email,
            CONCAT(users.first_name, ' ', users.last_name) as user_name,
            COALESCE(SUM(time_logs.duration), 0) as total_duration,
            COUNT(DISTINCT tasks.id) as tasks_count,
            MAX(time_logs.start_time) as last_active
        `).
        Joins("LEFT JOIN time_logs ON time_logs.user_id = users.id").
        Joins("LEFT JOIN tasks ON tasks.user_id = users.id").
        Group("users.id, users.email, users.first_name, users.last_name").
        Order("total_duration DESC").
        Limit(10).
        Scan(&mostActive)
    stats.MostActiveUsers = mostActive

    // Active user counts
    r.db.Model(&models.TimeLog{}).
        Select("COUNT(DISTINCT user_id)").
        Where("DATE(start_time) = CURRENT_DATE").
        Scan(&stats.DailyActiveUsers)

    r.db.Model(&models.TimeLog{}).
        Select("COUNT(DISTINCT user_id)").
        Where("start_time >= NOW() - INTERVAL '7 days'").
        Scan(&stats.WeeklyActiveUsers)

    r.db.Model(&models.TimeLog{}).
        Select("COUNT(DISTINCT user_id)").
        Where("start_time >= NOW() - INTERVAL '30 days'").
        Scan(&stats.MonthlyActiveUsers)

    return stats, nil
}

func (r *adminRepository) GetActivityStats() (*dto.AdminActivityStatsResponse, error) {
    stats := &dto.AdminActivityStatsResponse{}

    // Today stats
    r.db.Model(&models.TimeLog{}).
        Where("DATE(start_time) = CURRENT_DATE").
        Count(&stats.TodayTimeLogs)

    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0)").
        Where("DATE(start_time) = CURRENT_DATE").
        Scan(&stats.TodayDuration)

    r.db.Model(&models.Screenshot{}).
        Where("DATE(captured_at) = CURRENT_DATE").
        Count(&stats.TodayScreenshots)

    r.db.Model(&models.TimeLog{}).
        Select("COUNT(DISTINCT user_id)").
        Where("DATE(start_time) = CURRENT_DATE").
        Scan(&stats.TodayActiveUsers)

    // Week stats
    r.db.Model(&models.TimeLog{}).
        Where("start_time >= NOW() - INTERVAL '7 days'").
        Count(&stats.WeekTimeLogs)

    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(SUM(duration), 0)").
        Where("start_time >= NOW() - INTERVAL '7 days'").
        Scan(&stats.WeekDuration)

    r.db.Model(&models.Screenshot{}).
        Where("captured_at >= NOW() - INTERVAL '7 days'").
        Count(&stats.WeekScreenshots)

    // Activity by hour (last 24 hours)
    var hourlyActivity []dto.HourlyActivity
    r.db.Table("time_logs").
        Select(`
            EXTRACT(HOUR FROM start_time) as hour,
            COUNT(*) as timelogs,
            COALESCE(SUM(duration), 0) as duration,
            COUNT(DISTINCT user_id) as active_users
        `).
        Where("start_time >= NOW() - INTERVAL '24 hours'").
        Group("EXTRACT(HOUR FROM start_time)").
        Order("hour").
        Scan(&hourlyActivity)
    stats.ActivityByHour = hourlyActivity

    // Activity by day (last 30 days)
    var dailyActivity []dto.DailyActivity
    r.db.Table("time_logs").
        Select(`
            DATE(start_time) as date,
            COUNT(*) as timelogs,
            COALESCE(SUM(duration), 0) as duration,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(DISTINCT task_id) as tasks
        `).
        Where("start_time >= NOW() - INTERVAL '30 days'").
        Group("DATE(start_time)").
        Order("date DESC").
        Scan(&dailyActivity)

    for i := range dailyActivity {
        dailyActivity[i].DurationHuman = formatDurationHuman(dailyActivity[i].Duration)
    }
    stats.ActivityByDay = dailyActivity

    // Peak hour
    if len(hourlyActivity) > 0 {
        maxIdx := 0
        for i, h := range hourlyActivity {
            if h.TimeLogs > hourlyActivity[maxIdx].TimeLogs {
                maxIdx = i
            }
        }
        stats.PeakHour = hourlyActivity[maxIdx].Hour
        stats.PeakHourCount = hourlyActivity[maxIdx].TimeLogs
    }

    // Average session duration
    var avgDuration float64
    r.db.Model(&models.TimeLog{}).
        Select("COALESCE(AVG(duration), 0)").
        Where("status = 'stopped'").
        Scan(&avgDuration)
    stats.AvgSessionDuration = int64(avgDuration)

    return stats, nil
}

func (r *adminRepository) GetRealtimeStats() (*dto.AdminRealtimeStatsResponse, error) {
    stats := &dto.AdminRealtimeStatsResponse{}

    // Active sessions
    r.db.Model(&models.TimeLog{}).
        Where("status = 'running'").
        Count(&stats.ActiveSessions)

    // Online users (with running sessions)
    var onlineUsers []dto.OnlineUserInfo
    r.db.Table("time_logs").
        Select(`
            users.id as user_id,
            users.email,
            CONCAT(users.first_name, ' ', users.last_name) as user_name,
            time_logs.task_title as current_task,
            time_logs.start_time as session_start,
            EXTRACT(EPOCH FROM (NOW() - time_logs.start_time))::bigint as duration,
            COALESCE(device_info.device_name, 'Unknown') as device_name
        `).
        Joins("JOIN users ON users.id = time_logs.user_id").
        Joins("LEFT JOIN device_info ON device_info.id = time_logs.device_id").
        Where("time_logs.status = 'running'").
        Order("time_logs.start_time DESC").
        Limit(20).
        Scan(&onlineUsers)
    stats.OnlineUsers = onlineUsers

    // Recent activity (last 10 audit logs)
    var recentActivity []dto.RecentActivityInfo
    r.db.Table("audit_logs").
        Select(`
            audit_logs.created_at as timestamp,
            COALESCE(users.email, 'System') as user_email,
            audit_logs.action,
            audit_logs.entity_type || ' ' || audit_logs.action as description
        `).
        Joins("LEFT JOIN users ON users.id = audit_logs.user_id").
        Order("audit_logs.created_at DESC").
        Limit(10).
        Scan(&recentActivity)
    stats.RecentActivity = recentActivity

    // System health
    stats.SystemHealth = dto.SystemHealthInfo{
        DatabaseStatus: "healthy",
        // Storage stats would be calculated separately
    }

    return stats, nil
}

func formatDurationHuman(seconds int64) string {
    hours := seconds / 3600
    minutes := (seconds % 3600) / 60

    if hours > 0 {
        return fmt.Sprintf("%dh %dm", hours, minutes)
    }
    return fmt.Sprintf("%dm", minutes)
}
```

### Task 10.3: Thêm Controller Methods

```go
// backend/internal/controller/admin_controller.go (thêm vào)

// ============================================================================
// STATISTICS
// ============================================================================

// GetOverviewStats gets system overview statistics
func (c *AdminController) GetOverviewStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetOverviewStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// GetUserStats gets user statistics
func (c *AdminController) GetUserStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetUserStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// GetOrgStats gets organization statistics
func (c *AdminController) GetOrgStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetOrgStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// GetActivityStats gets activity statistics
func (c *AdminController) GetActivityStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetActivityStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// GetTrendStats gets trend statistics
func (c *AdminController) GetTrendStats(ctx *gin.Context) {
    var req dto.AdminTrendStatsRequest
    if err := ctx.ShouldBindQuery(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if req.Period == "" {
        req.Period = "daily"
    }

    stats, err := c.adminRepo.GetTrendStats(&req)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}

// GetRealtimeStats gets realtime statistics
func (c *AdminController) GetRealtimeStats(ctx *gin.Context) {
    stats, err := c.adminRepo.GetRealtimeStats()
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    stats,
    })
}
```

## Acceptance Criteria

- [ ] Overview stats trả về đầy đủ thông tin tổng quan
- [ ] User stats hiển thị đúng registration trends
- [ ] Organization stats hiển thị đúng size distribution
- [ ] Activity stats hiển thị đúng activity by hour/day
- [ ] Trend stats hỗ trợ daily/weekly/monthly period
- [ ] Realtime stats hiển thị online users và active sessions
- [ ] Growth rates được tính đúng
- [ ] Duration được format human-readable

## Dependencies

- TODO 09: Backend Admin Screenshots API

## Estimated Time

- 4-5 giờ

## Testing

```bash
# Get overview stats
curl -X GET "http://localhost:8080/api/v1/admin/statistics/overview" \
  -H "Authorization: Bearer <admin_token>"

# Get user stats
curl -X GET "http://localhost:8080/api/v1/admin/statistics/users" \
  -H "Authorization: Bearer <admin_token>"

# Get activity stats
curl -X GET "http://localhost:8080/api/v1/admin/statistics/activity" \
  -H "Authorization: Bearer <admin_token>"

# Get trend stats
curl -X GET "http://localhost:8080/api/v1/admin/statistics/trends?period=daily&start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer <admin_token>"

# Get realtime stats
curl -X GET "http://localhost:8080/api/v1/admin/statistics/realtime" \
  -H "Authorization: Bearer <admin_token>"
```
