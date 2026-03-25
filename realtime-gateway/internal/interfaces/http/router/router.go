package router

import (
	appauth "realtime-gateway/internal/application/auth"
	apprealtime "realtime-gateway/internal/application/realtime"
	"realtime-gateway/internal/interfaces/http/handlers"
	"realtime-gateway/internal/platform/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func New(authService appauth.Service, registry *apprealtime.Registry, cfg config.Config) *gin.Engine {
	engine := gin.Default()
	engine.SetTrustedProxies(nil)
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Cache-Control", "Content-Type"},
		ExposeHeaders:    []string{"Content-Type"},
		AllowCredentials: true,
	}
	if len(cfg.CORSAllowedOrigins) == 0 {
		corsConfig.AllowAllOrigins = true
		corsConfig.AllowCredentials = false
	}
	engine.Use(cors.New(corsConfig))

	handler := handlers.NewRealtimeHandler(authService, registry, cfg)
	engine.GET("/", handler.Health)
	engine.GET("/health", handler.Health)
	engine.GET("/rt/sse", handler.SSE)
	engine.GET("/rt/ws", handler.WebSocket)

	return engine
}
