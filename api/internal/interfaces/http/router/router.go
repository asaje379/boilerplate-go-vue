package router

import (
	appauth "api/internal/application/auth"
	appfile "api/internal/application/file"
	appuser "api/internal/application/user"
	userdomain "api/internal/domain/user"
	"api/internal/interfaces/http/handlers"
	"api/internal/interfaces/http/middleware"
	"api/internal/platform/config"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func New(cfg config.Config, db *gorm.DB, authService appauth.Service, userService appuser.Service, fileService appfile.Service) *gin.Engine {
	engine := gin.Default()
	engine.SetTrustedProxies(nil)
	engine.Use(middleware.RequestID())
	engine.Use(middleware.SecurityHeaders())
	engine.Use(middleware.NewCORS(cfg.CORSAllowedOrigins))
	engine.Use(middleware.NewRateLimiter(cfg.RateLimitRPM, cfg.RateLimitBurst, 10*time.Minute).Middleware())

	healthHandler := handlers.NewHealthHandler(db)
	authHandler := handlers.NewAuthHandler(authService, fileService)
	fileHandler := handlers.NewFileHandler(fileService)
	userHandler := handlers.NewUserHandler(userService, fileService)

	v1 := engine.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.GetHealth)
		v1.GET("/files/public/:id/download", fileHandler.PublicDownload)

		authRoutes := v1.Group("/auth")
		{
			authRoutes.GET("/setup-status", authHandler.SetupStatus)
			authRoutes.POST("/bootstrap-first-admin", authHandler.BootstrapFirstAdmin)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/verify-otp", authHandler.VerifyLoginOTP)
			authRoutes.POST("/forgot-password", authHandler.ForgotPassword)
			authRoutes.POST("/reset-password", authHandler.ResetPassword)
			authRoutes.POST("/refresh", authHandler.Refresh)
			authRoutes.POST("/logout", authHandler.Logout)
		}

		protected := v1.Group("")
		protected.Use(middleware.Authenticate(authService))
		{
			protected.POST("/files/upload", fileHandler.Upload)
			protected.GET("/files", fileHandler.List)
			protected.GET("/files/:id", fileHandler.GetByID)
			protected.DELETE("/files/:id", fileHandler.Delete)
			protected.GET("/files/:id/download-signed", fileHandler.SignedDownload)
			protected.PATCH("/users/me", userHandler.UpdateCurrentProfile)
			protected.POST("/users/me/change-password", userHandler.ChangePassword)
			protected.PATCH("/users/me/profile-photo", userHandler.UpdateProfilePhoto)
			protected.PATCH("/users/me/security", userHandler.UpdateSecurity)
			protected.GET("/users/me", userHandler.Me)

			admin := protected.Group("/users")
			admin.Use(middleware.RequireRoles(userdomain.RoleAdmin))
			{
				admin.GET("", userHandler.List)
				admin.POST("", userHandler.Create)
				admin.GET("/:id", userHandler.GetByID)
				admin.PATCH("/:id", userHandler.Update)
				admin.PATCH("/:id/deactivate", userHandler.Deactivate)
				admin.PATCH("/:id/reactivate", userHandler.Reactivate)
			}
		}
	}

	swagger := engine.Group("/swagger", gin.BasicAuth(gin.Accounts{cfg.SwaggerUsername: cfg.SwaggerPassword}))
	swagger.GET("/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	return engine
}
