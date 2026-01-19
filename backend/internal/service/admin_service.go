package service

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// AdminService handles admin business logic
type AdminService interface {
	// Users
	ListUsers(params *dto.AdminUserListParams) (*dto.AdminUserListResponse, error)
	GetUser(id uint) (*dto.AdminUserDetailResponse, error)
	CreateUser(req *dto.AdminCreateUserRequest) (*dto.AdminUserResponse, error)
	UpdateUser(id uint, req *dto.AdminUpdateUserRequest) (*dto.AdminUserResponse, error)
	DeleteUser(id uint) error
	ActivateUser(id uint, active bool) error
	ChangeUserRole(id uint, role string) error
	ChangeUserSystemRole(id uint, systemRole string) error

	// Organizations
	ListOrganizations(params *dto.AdminOrgListParams) (*dto.AdminOrgListResponse, error)
	GetOrganization(id uint) (*dto.AdminOrgDetailResponse, error)
	UpdateOrganization(id uint, req *dto.AdminUpdateOrgRequest) (*dto.AdminOrgResponse, error)
	DeleteOrganization(id uint) error
	VerifyOrganization(id uint, verified bool, adminID uint) error

	// Workspaces
	ListWorkspaces(params *dto.AdminWorkspaceListParams) (*dto.AdminWorkspaceListResponse, error)
	GetWorkspace(id uint) (*dto.AdminWorkspaceDetailResponse, error)
	UpdateWorkspace(id uint, req *dto.AdminUpdateWorkspaceRequest) (*dto.AdminWorkspaceResponse, error)
	DeleteWorkspace(id uint) error
	ArchiveWorkspace(id uint, archived bool, adminID uint) error

	// Tasks
	ListTasks(params *dto.AdminTaskListParams) (*dto.AdminTaskListResponse, error)
	GetTask(id uint) (*dto.AdminTaskDetailResponse, error)
	UpdateTask(id uint, req *dto.AdminUpdateTaskRequest) (*dto.AdminTaskResponse, error)
	DeleteTask(id uint) error

	// Time Logs
	ListTimeLogs(params *dto.AdminTimeLogListParams) (*dto.AdminTimeLogListResponse, error)
	GetTimeLog(id uint) (*dto.AdminTimeLogDetailResponse, error)
	UpdateTimeLog(id uint, req *dto.AdminUpdateTimeLogRequest) (*dto.AdminTimeLogResponse, error)
	DeleteTimeLog(id uint) error
	ApproveTimeLogs(req *dto.AdminApproveTimeLogsRequest, adminID uint) error

	// Screenshots
	ListScreenshots(params *dto.AdminScreenshotListParams) (*dto.AdminScreenshotListResponse, error)
	GetScreenshot(id uint) (*dto.AdminScreenshotResponse, error)
	DeleteScreenshot(id uint) error
	BulkDeleteScreenshots(ids []uint) error

	// Statistics
	GetOverviewStats() (*dto.AdminOverviewStats, error)
	GetTrendStats(req *dto.AdminTrendRequest) (*dto.AdminTrendStats, error)
	GetUserPerformanceStats(limit int) ([]dto.AdminUserPerformance, error)
	GetOrgDistributionStats() (*dto.AdminOrgStats, error)
	GetActivityStats() (*dto.AdminActivityStats, error)
}

type adminService struct {
	adminRepo      repository.AdminRepository
	userRepo       repository.UserRepository
	orgRepo        *repository.OrganizationRepository
	workspaceRepo  *repository.WorkspaceRepository
	taskRepo       repository.TaskRepository
	timeLogRepo    repository.TimeLogRepository
	screenshotRepo repository.ScreenshotRepository
}

// NewAdminService creates new admin service
func NewAdminService(
	adminRepo repository.AdminRepository,
	userRepo repository.UserRepository,
	orgRepo *repository.OrganizationRepository,
	workspaceRepo *repository.WorkspaceRepository,
	taskRepo repository.TaskRepository,
	timeLogRepo repository.TimeLogRepository,
	screenshotRepo repository.ScreenshotRepository,
) AdminService {
	return &adminService{
		adminRepo:      adminRepo,
		userRepo:       userRepo,
		orgRepo:        orgRepo,
		workspaceRepo:  workspaceRepo,
		taskRepo:       taskRepo,
		timeLogRepo:    timeLogRepo,
		screenshotRepo: screenshotRepo,
	}
}

// ============================================================================
// USER METHODS
// ============================================================================

func (s *adminService) ListUsers(params *dto.AdminUserListParams) (*dto.AdminUserListResponse, error) {
	users, total, err := s.adminRepo.FindUsersWithFilters(params)
	if err != nil {
		return nil, err
	}

	var userResponses []dto.AdminUserResponse
	for _, u := range users {
		userResponses = append(userResponses, s.userToResponse(&u))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminUserListResponse{
		Users: userResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetUser(id uint) (*dto.AdminUserDetailResponse, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetUserStats(id)
	orgs, _ := s.adminRepo.GetUserOrganizations(id)
	workspaces, _ := s.adminRepo.GetUserWorkspaces(id)
	devices, _ := s.adminRepo.GetUserDevices(id)
	recentTasks, _ := s.adminRepo.GetUserRecentTasks(id, 10)
	recentTimeLogs, _ := s.adminRepo.GetUserRecentTimeLogs(id, 10)

	// Convert tasks
	var taskResponses []dto.AdminTaskResponse
	for _, t := range recentTasks {
		taskResponses = append(taskResponses, s.taskToResponse(&t))
	}

	// Convert time logs
	var timeLogResponses []dto.AdminTimeLogResponse
	for _, tl := range recentTimeLogs {
		timeLogResponses = append(timeLogResponses, s.timeLogToResponse(&tl))
	}

	// Convert devices
	var deviceResponses []dto.AdminDeviceResponse
	for _, d := range devices {
		deviceResponses = append(deviceResponses, dto.AdminDeviceResponse{
			ID:         d.ID,
			DeviceUUID: d.DeviceUUID,
			DeviceName: d.DeviceName,
			OS:         d.OS,
			OSVersion:  d.OSVersion,
			AppVersion: d.AppVersion,
			IPAddress:  d.IPAddress,
			LastSeenAt: d.LastSeenAt,
			IsActive:   d.IsActive,
		})
	}

	// Build base response with stats
	baseResponse := s.userToResponse(user)
	if stats != nil {
		baseResponse.OrgsCount = stats.OrgsCount
		baseResponse.WorkspacesCount = stats.WorkspacesCount
		baseResponse.TasksCount = stats.TasksCount
		baseResponse.TimeLogsCount = stats.TimeLogsCount
		baseResponse.TotalDuration = stats.TotalDuration
	}

	return &dto.AdminUserDetailResponse{
		AdminUserResponse: baseResponse,
		Organizations:     orgs,
		Workspaces:        workspaces,
		Devices:           deviceResponses,
		RecentTasks:       taskResponses,
		RecentTimeLogs:    timeLogResponses,
	}, nil
}

func (s *adminService) CreateUser(req *dto.AdminCreateUserRequest) (*dto.AdminUserResponse, error) {
	// Check email exists
	existing, _ := s.userRepo.FindByEmail(req.Email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         req.Role,
		SystemRole:   req.SystemRole,
		IsActive:     true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	response := s.userToResponse(user)
	return &response, nil
}

func (s *adminService) UpdateUser(id uint, req *dto.AdminUpdateUserRequest) (*dto.AdminUserResponse, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Email != "" && req.Email != user.Email {
		existing, _ := s.userRepo.FindByEmail(req.Email)
		if existing != nil && existing.ID != id {
			return nil, errors.New("email already exists")
		}
		user.Email = req.Email
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.SystemRole != "" {
		user.SystemRole = req.SystemRole
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hashedPassword)
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	response := s.userToResponse(user)
	return &response, nil
}

func (s *adminService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

func (s *adminService) ActivateUser(id uint, active bool) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}
	user.IsActive = active
	return s.userRepo.Update(user)
}

func (s *adminService) ChangeUserRole(id uint, role string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}
	user.Role = role
	return s.userRepo.Update(user)
}

func (s *adminService) ChangeUserSystemRole(id uint, systemRole string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}
	user.SystemRole = systemRole
	return s.userRepo.Update(user)
}

// ============================================================================
// ORGANIZATION METHODS
// ============================================================================

func (s *adminService) ListOrganizations(params *dto.AdminOrgListParams) (*dto.AdminOrgListResponse, error) {
	orgs, total, err := s.adminRepo.FindOrgsWithFilters(params)
	if err != nil {
		return nil, err
	}

	var orgResponses []dto.AdminOrgResponse
	for _, o := range orgs {
		stats, _ := s.adminRepo.GetOrgStats(o.ID)
		orgResponses = append(orgResponses, s.orgToResponse(&o, stats))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminOrgListResponse{
		Organizations: orgResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetOrganization(id uint) (*dto.AdminOrgDetailResponse, error) {
	org, err := s.orgRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetOrgStats(id)

	// Get members
	members, _ := s.orgRepo.GetMembersByOrgID(id)
	var memberResponses []dto.AdminOrgMemberResponse
	for _, m := range members {
		memberResponses = append(memberResponses, dto.AdminOrgMemberResponse{
			UserID:    m.UserID,
			UserEmail: m.User.Email,
			UserName:  m.User.FirstName + " " + m.User.LastName,
			Role:      m.Role,
			JoinedAt:  m.JoinedAt,
			IsActive:  m.IsActive,
		})
	}

	// Get workspaces
	workspaces, _ := s.workspaceRepo.GetByOrganizationID(id)
	var workspaceResponses []dto.AdminWorkspaceSummary
	for _, w := range workspaces {
		workspaceResponses = append(workspaceResponses, dto.AdminWorkspaceSummary{
			ID:        w.ID,
			Name:      w.Name,
			Slug:      w.Slug,
			IsActive:  w.IsActive,
			CreatedAt: w.CreatedAt,
		})
	}

	return &dto.AdminOrgDetailResponse{
		AdminOrgResponse: s.orgToResponse(org, stats),
		Members:          memberResponses,
		Workspaces:       workspaceResponses,
	}, nil
}

func (s *adminService) UpdateOrganization(id uint, req *dto.AdminUpdateOrgRequest) (*dto.AdminOrgResponse, error) {
	org, err := s.orgRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		org.Name = req.Name
	}
	if req.Description != "" {
		org.Description = req.Description
	}
	if req.IsActive != nil {
		org.IsActive = *req.IsActive
	}
	if req.AdminNotes != "" {
		org.AdminNotes = req.AdminNotes
	}

	if err := s.orgRepo.Update(org); err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetOrgStats(id)
	response := s.orgToResponse(org, stats)
	return &response, nil
}

func (s *adminService) DeleteOrganization(id uint) error {
	return s.orgRepo.Delete(id)
}

func (s *adminService) VerifyOrganization(id uint, verified bool, adminID uint) error {
	org, err := s.orgRepo.GetByID(id)
	if err != nil {
		return err
	}

	org.IsVerified = verified
	if verified {
		now := time.Now()
		org.VerifiedAt = &now
		org.VerifiedBy = &adminID
	} else {
		org.VerifiedAt = nil
		org.VerifiedBy = nil
	}

	return s.orgRepo.Update(org)
}

// ============================================================================
// WORKSPACE METHODS
// ============================================================================

func (s *adminService) ListWorkspaces(params *dto.AdminWorkspaceListParams) (*dto.AdminWorkspaceListResponse, error) {
	workspaces, total, err := s.adminRepo.FindWorkspacesWithFilters(params)
	if err != nil {
		return nil, err
	}

	var wsResponses []dto.AdminWorkspaceResponse
	for _, w := range workspaces {
		stats, _ := s.adminRepo.GetWorkspaceStats(w.ID)
		wsResponses = append(wsResponses, s.workspaceToResponse(&w, stats))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminWorkspaceListResponse{
		Workspaces: wsResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetWorkspace(id uint) (*dto.AdminWorkspaceDetailResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetWorkspaceStats(id)

	// Get members
	members, _ := s.workspaceRepo.GetMembersByWorkspaceID(id)
	var memberResponses []dto.AdminWorkspaceMemberResponse
	for _, m := range members {
		memberResponses = append(memberResponses, dto.AdminWorkspaceMemberResponse{
			UserID:    m.UserID,
			UserEmail: m.User.Email,
			UserName:  m.User.FirstName + " " + m.User.LastName,
			RoleName:  m.RoleName,
			IsAdmin:   m.IsAdmin,
			JoinedAt:  m.JoinedAt,
			IsActive:  m.IsActive,
		})
	}

	// Get recent tasks
	taskParams := &dto.AdminTaskListParams{
		WorkspaceID: &id,
		Page:        1,
		PageSize:    10,
		SortBy:      "created_at",
		SortOrder:   "desc",
	}
	tasks, _, _ := s.adminRepo.FindTasksWithFilters(taskParams)
	var taskResponses []dto.AdminTaskResponse
	for _, t := range tasks {
		taskResponses = append(taskResponses, s.taskToResponse(&t))
	}

	return &dto.AdminWorkspaceDetailResponse{
		AdminWorkspaceResponse: s.workspaceToResponse(workspace, stats),
		Members:                memberResponses,
		RecentTasks:            taskResponses,
	}, nil
}

func (s *adminService) UpdateWorkspace(id uint, req *dto.AdminUpdateWorkspaceRequest) (*dto.AdminWorkspaceResponse, error) {
	workspace, err := s.workspaceRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		workspace.Name = req.Name
	}
	if req.Description != "" {
		workspace.Description = req.Description
	}
	if req.IsActive != nil {
		workspace.IsActive = *req.IsActive
	}

	if err := s.workspaceRepo.Update(workspace); err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetWorkspaceStats(id)
	response := s.workspaceToResponse(workspace, stats)
	return &response, nil
}

func (s *adminService) DeleteWorkspace(id uint) error {
	return s.workspaceRepo.Delete(id)
}

func (s *adminService) ArchiveWorkspace(id uint, archived bool, adminID uint) error {
	workspace, err := s.workspaceRepo.GetByID(id)
	if err != nil {
		return err
	}

	workspace.IsArchived = archived
	if archived {
		now := time.Now()
		workspace.ArchivedAt = &now
		workspace.ArchivedBy = &adminID
	} else {
		workspace.ArchivedAt = nil
		workspace.ArchivedBy = nil
	}

	return s.workspaceRepo.Update(workspace)
}

// ============================================================================
// TASK METHODS
// ============================================================================

func (s *adminService) ListTasks(params *dto.AdminTaskListParams) (*dto.AdminTaskListResponse, error) {
	tasks, total, err := s.adminRepo.FindTasksWithFilters(params)
	if err != nil {
		return nil, err
	}

	var taskResponses []dto.AdminTaskResponse
	for _, t := range tasks {
		taskResponses = append(taskResponses, s.taskToResponse(&t))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminTaskListResponse{
		Tasks: taskResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetTask(id uint) (*dto.AdminTaskDetailResponse, error) {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	stats, _ := s.adminRepo.GetTaskStats(id)

	// Get time logs
	timeLogParams := &dto.AdminTimeLogListParams{
		TaskID:   &id,
		Page:     1,
		PageSize: 20,
	}
	timeLogs, _, _ := s.adminRepo.FindTimeLogsWithFilters(timeLogParams)
	var timeLogResponses []dto.AdminTimeLogResponse
	for _, tl := range timeLogs {
		timeLogResponses = append(timeLogResponses, s.timeLogToResponse(&tl))
	}

	// Get screenshots
	screenshotParams := &dto.AdminScreenshotListParams{
		TaskID:   &id,
		Page:     1,
		PageSize: 20,
	}
	screenshots, _, _ := s.adminRepo.FindScreenshotsWithFilters(screenshotParams)
	var screenshotResponses []dto.AdminScreenshotResponse
	for _, ss := range screenshots {
		screenshotResponses = append(screenshotResponses, s.screenshotToResponse(&ss))
	}

	return &dto.AdminTaskDetailResponse{
		AdminTaskResponse: s.taskToResponse(task),
		TimeLogsCount:     stats.TimeLogsCount,
		TotalDuration:     stats.TotalDuration,
		ScreenshotCount:   stats.ScreenshotCount,
		TimeLogs:          timeLogResponses,
		Screenshots:       screenshotResponses,
	}, nil
}

func (s *adminService) UpdateTask(id uint, req *dto.AdminUpdateTaskRequest) (*dto.AdminTaskResponse, error) {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Title != "" {
		task.Title = req.Title
	}
	if req.Description != "" {
		task.Description = req.Description
	}
	if req.Status != "" {
		task.Status = req.Status
	}
	if req.AdminNotes != "" {
		task.AdminNotes = req.AdminNotes
	}

	if err := s.taskRepo.Update(task); err != nil {
		return nil, err
	}

	response := s.taskToResponse(task)
	return &response, nil
}

func (s *adminService) DeleteTask(id uint) error {
	return s.taskRepo.Delete(id)
}

// ============================================================================
// TIME LOG METHODS
// ============================================================================

func (s *adminService) ListTimeLogs(params *dto.AdminTimeLogListParams) (*dto.AdminTimeLogListResponse, error) {
	timeLogs, total, err := s.adminRepo.FindTimeLogsWithFilters(params)
	if err != nil {
		return nil, err
	}

	var tlResponses []dto.AdminTimeLogResponse
	for _, tl := range timeLogs {
		tlResponses = append(tlResponses, s.timeLogToResponse(&tl))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminTimeLogListResponse{
		TimeLogs: tlResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetTimeLog(id uint) (*dto.AdminTimeLogDetailResponse, error) {
	timeLog, err := s.timeLogRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Get screenshots
	screenshotParams := &dto.AdminScreenshotListParams{
		TimeLogID: &id,
		Page:      1,
		PageSize:  50,
	}
	screenshots, screenshotCount, _ := s.adminRepo.FindScreenshotsWithFilters(screenshotParams)
	var screenshotResponses []dto.AdminScreenshotResponse
	for _, ss := range screenshots {
		screenshotResponses = append(screenshotResponses, s.screenshotToResponse(&ss))
	}

	return &dto.AdminTimeLogDetailResponse{
		AdminTimeLogResponse: s.timeLogToResponse(timeLog),
		ScreenshotCount:      screenshotCount,
		Screenshots:          screenshotResponses,
	}, nil
}

func (s *adminService) UpdateTimeLog(id uint, req *dto.AdminUpdateTimeLogRequest) (*dto.AdminTimeLogResponse, error) {
	timeLog, err := s.timeLogRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Status != "" {
		timeLog.Status = req.Status
	}
	if req.IsApproved != nil {
		timeLog.IsApproved = *req.IsApproved
	}
	if req.AdminNotes != "" {
		timeLog.AdminNotes = req.AdminNotes
	}

	if err := s.timeLogRepo.Update(timeLog); err != nil {
		return nil, err
	}

	response := s.timeLogToResponse(timeLog)
	return &response, nil
}

func (s *adminService) DeleteTimeLog(id uint) error {
	return s.timeLogRepo.Delete(id)
}

func (s *adminService) ApproveTimeLogs(req *dto.AdminApproveTimeLogsRequest, adminID uint) error {
	return s.adminRepo.BulkApproveTimeLogs(req.IDs, adminID, req.Approved)
}

// ============================================================================
// SCREENSHOT METHODS
// ============================================================================

func (s *adminService) ListScreenshots(params *dto.AdminScreenshotListParams) (*dto.AdminScreenshotListResponse, error) {
	screenshots, total, err := s.adminRepo.FindScreenshotsWithFilters(params)
	if err != nil {
		return nil, err
	}

	var ssResponses []dto.AdminScreenshotResponse
	for _, ss := range screenshots {
		ssResponses = append(ssResponses, s.screenshotToResponse(&ss))
	}

	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	return &dto.AdminScreenshotListResponse{
		Screenshots: ssResponses,
		Pagination: dto.AdminPaginationResponse{
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalItems: total,
			TotalPages: totalPages,
			HasNext:    params.Page < totalPages,
			HasPrev:    params.Page > 1,
		},
	}, nil
}

func (s *adminService) GetScreenshot(id uint) (*dto.AdminScreenshotResponse, error) {
	screenshot, err := s.screenshotRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	response := s.screenshotToResponse(screenshot)
	return &response, nil
}

func (s *adminService) DeleteScreenshot(id uint) error {
	return s.screenshotRepo.Delete(id)
}

func (s *adminService) BulkDeleteScreenshots(ids []uint) error {
	for _, id := range ids {
		if err := s.screenshotRepo.Delete(id); err != nil {
			return err
		}
	}
	return nil
}

// ============================================================================
// STATISTICS METHODS
// ============================================================================

func (s *adminService) GetOverviewStats() (*dto.AdminOverviewStats, error) {
	return s.adminRepo.GetOverviewStats()
}

func (s *adminService) GetTrendStats(req *dto.AdminTrendRequest) (*dto.AdminTrendStats, error) {
	return s.adminRepo.GetTrendStats(req.Period, req.StartDate, req.EndDate)
}

func (s *adminService) GetUserPerformanceStats(limit int) ([]dto.AdminUserPerformance, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.adminRepo.GetUserPerformanceStats(limit)
}

func (s *adminService) GetOrgDistributionStats() (*dto.AdminOrgStats, error) {
	return s.adminRepo.GetOrgDistributionStats()
}

func (s *adminService) GetActivityStats() (*dto.AdminActivityStats, error) {
	return s.adminRepo.GetActivityStats()
}

// ============================================================================
// HELPER METHODS - Convert models to DTOs
// ============================================================================

func (s *adminService) userToResponse(u *models.User) dto.AdminUserResponse {
	return dto.AdminUserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Role:        u.Role,
		SystemRole:  u.SystemRole,
		IsActive:    u.IsActive,
		LastLoginAt: u.LastLoginAt,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func (s *adminService) orgToResponse(o *models.Organization, stats *repository.OrgStats) dto.AdminOrgResponse {
	resp := dto.AdminOrgResponse{
		ID:          o.ID,
		Name:        o.Name,
		Slug:        o.Slug,
		Description: o.Description,
		OwnerID:     o.OwnerID,
		IsActive:    o.IsActive,
		IsVerified:  o.IsVerified,
		VerifiedAt:  o.VerifiedAt,
		AdminNotes:  o.AdminNotes,
		CreatedAt:   o.CreatedAt,
		UpdatedAt:   o.UpdatedAt,
	}

	if o.Owner.ID > 0 {
		resp.OwnerEmail = o.Owner.Email
		resp.OwnerName = o.Owner.FirstName + " " + o.Owner.LastName
	}

	if stats != nil {
		resp.MemberCount = stats.MemberCount
		resp.WorkspaceCount = stats.WorkspaceCount
	}

	return resp
}

func (s *adminService) workspaceToResponse(w *models.Workspace, stats *repository.WorkspaceStats) dto.AdminWorkspaceResponse {
	resp := dto.AdminWorkspaceResponse{
		ID:          w.ID,
		Name:        w.Name,
		Slug:        w.Slug,
		Description: w.Description,
		OrgID:       w.OrganizationID,
		AdminID:     w.AdminID,
		IsActive:    w.IsActive,
		IsArchived:  w.IsArchived,
		ArchivedAt:  w.ArchivedAt,
		CreatedAt:   w.CreatedAt,
		UpdatedAt:   w.UpdatedAt,
	}

	if w.Organization.ID > 0 {
		resp.OrgName = w.Organization.Name
	}

	if w.Admin.ID > 0 {
		resp.AdminEmail = w.Admin.Email
		resp.AdminName = w.Admin.FirstName + " " + w.Admin.LastName
	}

	if stats != nil {
		resp.MemberCount = stats.MemberCount
		resp.TaskCount = stats.TaskCount
	}

	return resp
}

func (s *adminService) taskToResponse(t *models.Task) dto.AdminTaskResponse {
	resp := dto.AdminTaskResponse{
		ID:          t.ID,
		Title:       t.Title,
		Description: t.Description,
		Status:      t.Status,
		Priority:    t.Priority,
		Color:       t.Color,
		IsManual:    t.IsManual,
		UserID:      t.UserID,
		OrgID:       t.OrganizationID,
		WorkspaceID: t.WorkspaceID,
		AdminNotes:  t.AdminNotes,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}

	if t.User.ID > 0 {
		resp.UserEmail = t.User.Email
		resp.UserName = t.User.FirstName + " " + t.User.LastName
	}

	if t.Organization != nil && t.Organization.ID > 0 {
		resp.OrgName = t.Organization.Name
	}

	if t.Workspace != nil && t.Workspace.ID > 0 {
		resp.WorkspaceName = t.Workspace.Name
	}

	return resp
}

func (s *adminService) timeLogToResponse(tl *models.TimeLog) dto.AdminTimeLogResponse {
	resp := dto.AdminTimeLogResponse{
		ID:          tl.ID,
		UserID:      tl.UserID,
		TaskID:      tl.TaskID,
		OrgID:       tl.OrganizationID,
		WorkspaceID: tl.WorkspaceID,
		StartTime:   tl.StartTime,
		EndTime:     tl.EndTime,
		Duration:    tl.Duration,
		Status:      tl.Status,
		IsManual:    tl.IsManual,
		IsApproved:  tl.IsApproved,
		ApprovedBy:  tl.ApprovedBy,
		ApprovedAt:  tl.ApprovedAt,
		AdminNotes:  tl.AdminNotes,
		CreatedAt:   tl.CreatedAt,
	}

	if tl.User.ID > 0 {
		resp.UserEmail = tl.User.Email
		resp.UserName = tl.User.FirstName + " " + tl.User.LastName
	}

	if tl.Task != nil && tl.Task.ID > 0 {
		resp.TaskTitle = tl.Task.Title
	}

	if tl.Organization != nil && tl.Organization.ID > 0 {
		resp.OrgName = tl.Organization.Name
	}

	if tl.Workspace != nil && tl.Workspace.ID > 0 {
		resp.WorkspaceName = tl.Workspace.Name
	}

	return resp
}

func (s *adminService) screenshotToResponse(ss *models.Screenshot) dto.AdminScreenshotResponse {
	resp := dto.AdminScreenshotResponse{
		ID:           ss.ID,
		UserID:       ss.UserID,
		TaskID:       ss.TaskID,
		TimeLogID:    ss.TimeLogID,
		OrgID:        ss.OrganizationID,
		WorkspaceID:  ss.WorkspaceID,
		FileName:     ss.FileName,
		FilePath:     ss.FilePath,
		FileSize:     ss.FileSize,
		MimeType:     ss.MimeType,
		ScreenNumber: ss.ScreenNumber,
		MonitorIndex: ss.ScreenNumber, // Use ScreenNumber as MonitorIndex
		IsEncrypted:  ss.IsEncrypted,
		CapturedAt:   ss.CapturedAt,
		CreatedAt:    ss.CreatedAt,
	}

	if ss.User.ID > 0 {
		resp.UserEmail = ss.User.Email
		resp.UserName = ss.User.FirstName + " " + ss.User.LastName
	}

	if ss.Task != nil && ss.Task.ID > 0 {
		resp.TaskTitle = ss.Task.Title
	}

	if ss.Organization != nil && ss.Organization.ID > 0 {
		resp.OrgName = ss.Organization.Name
	}

	if ss.Workspace != nil && ss.Workspace.ID > 0 {
		resp.WorkspaceName = ss.Workspace.Name
	}

	return resp
}
