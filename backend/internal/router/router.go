package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"remote-time-tracker.dev/internal/config"
	"remote-time-tracker.dev/internal/controller"
	"remote-time-tracker.dev/internal/middleware"
	"remote-time-tracker.dev/internal/service"
)

// RouterConfig holds all dependencies for router setup
type RouterConfig struct {
	// Legacy controllers
	AuthController       *controller.AuthController
	TimeLogController    *controller.TimeLogController
	SyncController       *controller.SyncController
	ScreenshotController *controller.ScreenshotController
	TaskController       *controller.TaskController
	SystemController     *controller.SystemController
	PresenceController   *controller.PresenceController

	// New organization/workspace controllers
	OrganizationController  *controller.OrganizationController
	WorkspaceController     *controller.WorkspaceController
	InvitationController    *controller.InvitationController
	AdminController         *controller.AdminController
	AdminPresenceController *controller.AdminPresenceController

	// Update controller
	UpdateController *controller.UpdateController

	// Services for middleware
	OrganizationService service.OrganizationService
	WorkspaceService    service.WorkspaceService
	SystemLogService    service.SystemLogService
}

// SetupRouter configures and returns the Gin router
func SetupRouter(
	authController *controller.AuthController,
	timeLogController *controller.TimeLogController,
	syncController *controller.SyncController,
	screenshotController *controller.ScreenshotController,
	taskController *controller.TaskController,
	systemController *controller.SystemController,
) *gin.Engine {
	return SetupRouterWithConfig(&RouterConfig{
		AuthController:       authController,
		TimeLogController:    timeLogController,
		SyncController:       syncController,
		ScreenshotController: screenshotController,
		TaskController:       taskController,
		SystemController:     systemController,
	})
}

// SetupRouterWithConfig configures and returns the Gin router with full config
func SetupRouterWithConfig(cfg *RouterConfig) *gin.Engine {
	router := gin.Default()

	// Apply middleware
	router.Use(middleware.Logger(cfg.SystemLogService))
	router.Use(middleware.CORSMiddleware())

	// Default route
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Welcome to Remote Time Tracker API",
		})
	})

	// Serve static files (screenshots)
	router.Static("/uploads", config.AppConfig.Upload.Path)

	// Health check
	router.GET("/health", middleware.HealthCheck)

	// Swagger documentation
	router.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", cfg.AuthController.Register)
			auth.POST("/login", cfg.AuthController.Login)
			auth.POST("/cms-login", cfg.AuthController.CMSLogin)
			auth.POST("/refresh", cfg.AuthController.RefreshToken)
		}

		// Public system routes (no auth required) - for initializing admin
		if cfg.SystemController != nil {
			publicSystem := v1.Group("/system")
			{
				publicSystem.POST("/init-admin", cfg.SystemController.InitializeAdmin)
				publicSystem.GET("/admin-exists", cfg.SystemController.CheckAdminExists)
			}
		}

		// Public invitation routes (for accepting invitations)
		if cfg.InvitationController != nil {
			invitations := v1.Group("/invitations")
			{
				invitations.GET("/:token", cfg.InvitationController.GetByToken)
				invitations.POST("/accept", cfg.InvitationController.AcceptByBody)
			}
		}

		// Public organization routes (for viewing invite link info)
		if cfg.OrganizationController != nil {
			publicOrgs := v1.Group("/public/organizations")
			{
				publicOrgs.GET("/invite/:invite_code", cfg.OrganizationController.GetOrgByInviteCode)
			}
		}

		// Public download routes (for website to get app download links)
		if cfg.UpdateController != nil {
			publicDownloads := v1.Group("/public/downloads")
			{
				publicDownloads.GET("/latest", cfg.UpdateController.GetPublicDownloadLinks)
				publicDownloads.GET("/file/:version/:filename", cfg.UpdateController.DownloadPublicAsset)
			}
		}

		// Public update routes (for checking and downloading updates)
		// These require JWT auth to prevent unauthorized access
		if cfg.UpdateController != nil {
			updates := v1.Group("/updates")
			updates.Use(middleware.AuthMiddleware())
			{
				updates.POST("/check", cfg.UpdateController.CheckForUpdates)
				updates.GET("/latest", cfg.UpdateController.GetLatestVersion)
				updates.GET("/download/:version/:filename", cfg.UpdateController.DownloadAsset)
				updates.GET("/yml/:platform", cfg.UpdateController.GetYMLFile)
				updates.GET("/notes/:version", cfg.UpdateController.GetReleaseNotes)
				updates.GET("/notes", cfg.UpdateController.GetReleaseNotes) // Default to latest
			}
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth
			protected.GET("/auth/me", cfg.AuthController.Me)

			// Presence
			if cfg.PresenceController != nil {
				presence := protected.Group("/presence")
				{
					presence.POST("/heartbeat", cfg.PresenceController.Heartbeat)
				}
			}

			// User invitations
			if cfg.InvitationController != nil {
				protected.GET("/invitations/my", cfg.InvitationController.GetMyInvitations)
			}

			// Time logs
			timeLogs := protected.Group("/timelogs")
			{
				timeLogs.GET("", cfg.TimeLogController.List)
				timeLogs.GET("/:id", cfg.TimeLogController.GetByID)
				timeLogs.POST("/start", cfg.TimeLogController.Start)
				timeLogs.POST("/stop", cfg.TimeLogController.Stop)
				timeLogs.POST("/pause", cfg.TimeLogController.Pause)
				timeLogs.POST("/resume", cfg.TimeLogController.Resume)
				timeLogs.GET("/active", cfg.TimeLogController.GetActive)
				timeLogs.GET("/stats", cfg.TimeLogController.GetStats)
			}

			// Sync
			sync := protected.Group("/sync-data")
			{
				sync.POST("/batch-sync", cfg.SyncController.BatchSync)
			}

			// Screenshots
			screenshots := protected.Group("/screenshots")
			{
				screenshots.GET("", cfg.ScreenshotController.ListScreenshots)
				screenshots.GET("/today/count", cfg.ScreenshotController.GetTodayScreenshotCount)
				screenshots.GET("/:id", cfg.ScreenshotController.GetScreenshot)
				screenshots.GET("/:id/view", cfg.ScreenshotController.ViewScreenshot)
				screenshots.GET("/:id/download", cfg.ScreenshotController.DownloadScreenshot)
				screenshots.GET("/timelog/:timelog_id", cfg.ScreenshotController.GetScreenshotsByTimeLog)
				screenshots.GET("/task/:task_id", cfg.ScreenshotController.GetScreenshotsByTaskID)
				screenshots.GET("/range", cfg.ScreenshotController.GetScreenshotsByDateRange)
				screenshots.GET("/stats", cfg.ScreenshotController.GetScreenshotStats)
				screenshots.DELETE("/:id", cfg.ScreenshotController.DeleteScreenshot)
			}

			// Tasks
			tasks := protected.Group("/tasks")
			{
				tasks.GET("", cfg.TaskController.List)
				tasks.POST("", cfg.TaskController.Create)
				tasks.GET("/:id", cfg.TaskController.GetByID)
				tasks.PUT("/:id", cfg.TaskController.Update)
				tasks.DELETE("/:id", cfg.TaskController.Delete)
				tasks.GET("/active", cfg.TaskController.GetActiveTasks)
			}

			// System
			system := protected.Group("/system")
			{
				system.GET("/uploads/check", cfg.SystemController.CheckUploadsFolder)
				system.POST("/uploads/ensure", cfg.SystemController.EnsureUploadsFolders)
			}

			// Organizations
			if cfg.OrganizationController != nil {
				orgs := protected.Group("/organizations")
				{
					orgs.GET("", cfg.OrganizationController.List)
					orgs.POST("", cfg.OrganizationController.Create)
					orgs.GET("/join/:invite_code", cfg.OrganizationController.GetProtectedOrgByInviteCode)
					orgs.POST("/join/:invite_code", cfg.OrganizationController.JoinByInviteCode)

					// Organization-specific routes (require org membership)
					org := orgs.Group("/:org_id")
					org.Use(middleware.SetUserIDMiddleware())
					{
						org.GET("", cfg.OrganizationController.GetByID)
						org.PUT("", cfg.OrganizationController.Update)
						org.DELETE("", cfg.OrganizationController.Delete)

						// Organization members
						members := org.Group("/members")
						{
							members.GET("", cfg.OrganizationController.GetMembers)
							members.POST("", cfg.OrganizationController.AddMember)
							members.PUT("/:user_id", cfg.OrganizationController.UpdateMember)
							members.DELETE("/:user_id", cfg.OrganizationController.RemoveMember)
						}

						// Organization roles (workspace roles)
						roles := org.Group("/roles")
						{
							roles.GET("", cfg.OrganizationController.GetRoles)
							roles.POST("", cfg.OrganizationController.CreateRole)
							roles.PUT("/:role_id", cfg.OrganizationController.UpdateRole)
							roles.DELETE("/:role_id", cfg.OrganizationController.DeleteRole)
						}

						// Organization workspaces
						workspaces := org.Group("/workspaces")
						{
							workspaces.GET("", cfg.OrganizationController.GetWorkspaces)
							workspaces.POST("", cfg.OrganizationController.CreateWorkspace)
						}

						// Organization invitations
						invitations := org.Group("/invitations")
						{
							invitations.GET("", cfg.OrganizationController.GetInvitations)
							invitations.POST("", cfg.OrganizationController.CreateInvitation)
							invitations.DELETE("/:invitation_id", cfg.OrganizationController.RevokeInvitation)
						}

						// Admin operations
						org.POST("/regenerate-invite-code", cfg.OrganizationController.RegenerateInviteCode)
						org.POST("/transfer-ownership", cfg.OrganizationController.TransferOwnership)
					}
				}
			}

			// Workspaces (standalone routes)
			if cfg.WorkspaceController != nil {
				workspaces := protected.Group("/workspaces")
				{
					workspaces.GET("", cfg.WorkspaceController.List)

					// Workspace-specific routes
					ws := workspaces.Group("/:workspace_id")
					ws.Use(middleware.SetUserIDMiddleware())
					{
						ws.GET("", cfg.WorkspaceController.GetByID)
						ws.PUT("", cfg.WorkspaceController.Update)
						ws.DELETE("", cfg.WorkspaceController.Delete)

						// Workspace members
						members := ws.Group("/members")
						{
							members.GET("", cfg.WorkspaceController.GetMembers)
							members.POST("", cfg.WorkspaceController.AddMember)
							members.PUT("/:user_id", cfg.WorkspaceController.UpdateMember)
							members.DELETE("/:user_id", cfg.WorkspaceController.RemoveMember)
						}
					}
				}
			}

			// Admin routes (system admin only)
			if cfg.AdminController != nil {
				admin := protected.Group("/admin")
				admin.Use(middleware.SetUserIDMiddleware())
				admin.Use(middleware.RequireCMSAccess())
				{
					// User management
					admin.GET("/user-options", cfg.AdminController.ListUserOptions)

					users := admin.Group("/users")
					users.Use(middleware.RequireSystemAdmin())
					{
						users.GET("", cfg.AdminController.ListUsers)
						users.POST("", cfg.AdminController.CreateUser)
						users.GET("/:id", cfg.AdminController.GetUser)
						users.PUT("/:id", cfg.AdminController.UpdateUser)
						users.DELETE("/:id", cfg.AdminController.DeleteUser)
						users.PUT("/:id/activate", cfg.AdminController.ActivateUser)
						users.PUT("/:id/role", cfg.AdminController.ChangeUserRole)
						users.PUT("/:id/system-role", cfg.AdminController.ChangeUserSystemRole)
					}

					// Presence stream
					if cfg.AdminPresenceController != nil {
						admin.GET("/presence/stream", middleware.RequireSystemAdmin(), cfg.AdminPresenceController.Stream)
					}

					// Organization management
					orgs := admin.Group("/organizations")
					{
						orgs.GET("", cfg.AdminController.ListOrganizations)
						orgs.GET("/:id", cfg.AdminController.GetOrganization)
						orgs.PUT("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.UpdateOrganization)
						orgs.DELETE("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.DeleteOrganization)
						orgs.PUT("/:id/verify", middleware.RequireSystemAdmin(), cfg.AdminController.VerifyOrganization)
					}

					// Workspace management
					workspaces := admin.Group("/workspaces")
					{
						workspaces.GET("", cfg.AdminController.ListWorkspaces)
						workspaces.GET("/:id", cfg.AdminController.GetWorkspace)
						workspaces.PUT("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.UpdateWorkspace)
						workspaces.DELETE("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.DeleteWorkspace)
						workspaces.PUT("/:id/archive", middleware.RequireSystemAdmin(), cfg.AdminController.ArchiveWorkspace)
					}

					// Task management
					tasks := admin.Group("/tasks")
					{
						tasks.GET("", cfg.AdminController.ListTasks)
						tasks.GET("/:id", cfg.AdminController.GetTask)
						tasks.PUT("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.UpdateTask)
						tasks.DELETE("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.DeleteTask)
					}

					// Time log management
					timelogs := admin.Group("/timelogs")
					{
						timelogs.GET("", cfg.AdminController.ListTimeLogs)
						timelogs.GET("/:id", cfg.AdminController.GetTimeLog)
						timelogs.PUT("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.UpdateTimeLog)
						timelogs.DELETE("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.DeleteTimeLog)
						timelogs.POST("/approve", middleware.RequireSystemAdmin(), cfg.AdminController.ApproveTimeLogs)
					}

					// Screenshot management
					screenshots := admin.Group("/screenshots")
					{
						screenshots.GET("", cfg.AdminController.ListScreenshots)
						screenshots.GET("/:id", cfg.AdminController.GetScreenshot)
						screenshots.GET("/:id/view", cfg.AdminController.ViewScreenshot)
						screenshots.DELETE("/:id", middleware.RequireSystemAdmin(), cfg.AdminController.DeleteScreenshot)
						screenshots.POST("/bulk-delete", middleware.RequireSystemAdmin(), cfg.AdminController.BulkDeleteScreenshots)
					}

					systemLogs := admin.Group("/system-logs")
					systemLogs.Use(middleware.RequireSystemAdmin())
					{
						systemLogs.GET("", cfg.AdminController.ListSystemLogs)
						systemLogs.GET("/policy", cfg.AdminController.GetSystemLogPolicy)
						systemLogs.PUT("/policy", cfg.AdminController.UpdateSystemLogPolicy)
						systemLogs.GET("/:id", cfg.AdminController.GetSystemLog)
						systemLogs.POST("/cleanup", cfg.AdminController.CleanupSystemLogs)
					}

					systemConfigs := admin.Group("/system-configs")
					systemConfigs.Use(middleware.RequireSystemAdmin())
					{
						systemConfigs.GET("", cfg.AdminController.ListSystemConfigs)
						systemConfigs.PUT("/:key", cfg.AdminController.UpdateSystemConfig)
					}

					// Statistics & Reports
					stats := admin.Group("/stats")
					{
						stats.GET("", middleware.RequireSystemAdmin(), cfg.AdminController.GetSystemStats)
						stats.GET("/overview", middleware.RequireSystemAdmin(), cfg.AdminController.GetOverviewStats)
						stats.GET("/trends", middleware.RequireSystemAdmin(), cfg.AdminController.GetTrendStats)
						stats.GET("/user-performance", cfg.AdminController.GetUserPerformanceStats)
						stats.GET("/org-distribution", middleware.RequireSystemAdmin(), cfg.AdminController.GetOrgDistributionStats)
						stats.GET("/activity", middleware.RequireSystemAdmin(), cfg.AdminController.GetActivityStats)
					}
				}
			}
		}
	}

	return router
}
