package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db *gorm.DB
}

type HealthResponse struct {
	Status   string                 `json:"status" example:"ok"`
	Services map[string]ServiceInfo `json:"services"`
}

type ServiceInfo struct {
	Status  string `json:"status" example:"up"`
	Message string `json:"message,omitempty" example:"postgres responding"`
}

func NewHealthHandler(db *gorm.DB) HealthHandler {
	return HealthHandler{db: db}
}

// GetHealth godoc
// @Summary Health check
// @Description Returns API and Postgres health.
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Failure 503 {object} HealthResponse
// @Router /api/v1/health [get]
func (h HealthHandler) GetHealth(c *gin.Context) {
	status := http.StatusOK
	response := HealthResponse{
		Status: "ok",
		Services: map[string]ServiceInfo{
			"api":      {Status: "up", Message: "server responding"},
			"postgres": {Status: "up", Message: "postgres responding"},
		},
	}

	sqlDB, err := h.db.DB()
	if err != nil {
		status = http.StatusServiceUnavailable
		response.Status = "degraded"
		response.Services["postgres"] = ServiceInfo{Status: "down", Message: "sql handle unavailable"}
		c.JSON(status, response)
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		status = http.StatusServiceUnavailable
		response.Status = "degraded"
		response.Services["postgres"] = ServiceInfo{Status: "down", Message: err.Error()}
	}

	c.JSON(status, response)
}
