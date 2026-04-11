package handlers

import (
	"net/http"

	appcommon "api/internal/application/common"
	appnotification "api/internal/application/notification"
	"api/internal/interfaces/http/middleware"
	"api/internal/interfaces/http/presenter"
	queryhelper "api/internal/interfaces/http/query"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	notificationService appnotification.Service
}

func NewNotificationHandler(notificationService appnotification.Service) NotificationHandler {
	return NotificationHandler{notificationService: notificationService}
}

func (h NotificationHandler) List(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	params, err := queryhelper.ParseListParams(c, "createdAt", map[string]struct{}{"createdAt": {}})
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.notificationService.List(c.Request.Context(), current.ID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to list notifications"})
		return
	}

	c.JSON(http.StatusOK, presenter.ToPaginatedNotificationsResponse(result))
}

func (h NotificationHandler) UnreadCount(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	count, err := h.notificationService.GetUnreadCount(c.Request.Context(), current.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to count unread notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h NotificationHandler) MarkAsRead(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	if err := h.notificationService.MarkAsRead(c.Request.Context(), c.Param("id"), current.ID); err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h NotificationHandler) MarkAllAsRead(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	if err := h.notificationService.MarkAllAsRead(c.Request.Context(), current.ID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "failed to mark all notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
