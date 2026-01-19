package router

import (
	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/controller"
	"github.com/beuphecan/remote-time-tracker/internal/middleware"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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

	// New organization/workspace controllers
	OrganizationController *controller.OrganizationController
	WorkspaceController    *controller.WorkspaceController
	InvitationController   *controller.InvitationController
	AdminController        *controller.AdminController

	// Update controller
	UpdateController *controller.UpdateController

	// Services for middleware
	OrganizationService service.OrganizationService
	WorkspaceService    service.WorkspaceService
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
	router.Use(middleware.Logger())
	router.Use(middleware.CORSMiddleware())

	// Serve static files (screenshots)
	router.Static("/uploads", config.AppConfig.Upload.Path)

	// Health check
	router.GET("/health", middleware.HealthCheck)

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", cfg.AuthController.Register)
			auth.POST("/login", cfg.AuthController.Login)
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
				publicDownloads.GET("/file/:version/:filename", cfg.UpdateController.DownloadAsset) // Reuse existing handler
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
			sync := protected.Group("/sync")
			{
				sync.POST("/batch", cfg.SyncController.BatchSync)
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
					orgs.GET("/join/:invite_code", cfg.OrganizationController.GetOrgByInviteCode)
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
				admin.Use(middleware.RequireSystemAdmin())
				{
					// User management
					users := admin.Group("/users")
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

					// Organization management
					orgs := admin.Group("/organizations")
					{
						orgs.GET("", cfg.AdminController.ListOrganizations)
						orgs.GET("/:id", cfg.AdminController.GetOrganization)
						orgs.PUT("/:id", cfg.AdminController.UpdateOrganization)
						orgs.DELETE("/:id", cfg.AdminController.DeleteOrganization)
						orgs.PUT("/:id/verify", cfg.AdminController.VerifyOrganization)
					}

					// Workspace management
					workspaces := admin.Group("/workspaces")
					{
						workspaces.GET("", cfg.AdminController.ListWorkspaces)
						workspaces.GET("/:id", cfg.AdminController.GetWorkspace)
						workspaces.PUT("/:id", cfg.AdminController.UpdateWorkspace)
						workspaces.DELETE("/:id", cfg.AdminController.DeleteWorkspace)
						workspaces.PUT("/:id/archive", cfg.AdminController.ArchiveWorkspace)
					}

					// Task management
					tasks := admin.Group("/tasks")
					{
						tasks.GET("", cfg.AdminController.ListTasks)
						tasks.GET("/:id", cfg.AdminController.GetTask)
						tasks.PUT("/:id", cfg.AdminController.UpdateTask)
						tasks.DELETE("/:id", cfg.AdminController.DeleteTask)
					}

					// Time log management
					timelogs := admin.Group("/timelogs")
					{
						timelogs.GET("", cfg.AdminController.ListTimeLogs)
						timelogs.GET("/:id", cfg.AdminController.GetTimeLog)
						timelogs.PUT("/:id", cfg.AdminController.UpdateTimeLog)
						timelogs.DELETE("/:id", cfg.AdminController.DeleteTimeLog)
						timelogs.POST("/approve", cfg.AdminController.ApproveTimeLogs)
					}

					// Screenshot management
					screenshots := admin.Group("/screenshots")
					{
						screenshots.GET("", cfg.AdminController.ListScreenshots)
						screenshots.GET("/:id", cfg.AdminController.GetScreenshot)
						screenshots.GET("/:id/view", cfg.AdminController.ViewScreenshot)
						screenshots.DELETE("/:id", cfg.AdminController.DeleteScreenshot)
						screenshots.POST("/bulk-delete", cfg.AdminController.BulkDeleteScreenshots)
					}

					// Statistics & Reports
					stats := admin.Group("/stats")
					{
						stats.GET("", cfg.AdminController.GetSystemStats)
						stats.GET("/overview", cfg.AdminController.GetOverviewStats)
						stats.GET("/trends", cfg.AdminController.GetTrendStats)
						stats.GET("/user-performance", cfg.AdminController.GetUserPerformanceStats)
						stats.GET("/org-distribution", cfg.AdminController.GetOrgDistributionStats)
						stats.GET("/activity", cfg.AdminController.GetActivityStats)
					}
				}
			}
		}
	}

	return router
}
