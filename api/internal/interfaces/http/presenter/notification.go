package presenter

import (
	appcommon "api/internal/application/common"
	notificationdomain "api/internal/domain/notification"
)

type NotificationResponse struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Body      string         `json:"body"`
	Data      map[string]any `json:"data"`
	ReadAt    *string        `json:"readAt"`
	CreatedAt string         `json:"createdAt"`
}

type PaginatedNotificationsResponse struct {
	Items []NotificationResponse `json:"items"`
	Meta  PaginationMetaResponse `json:"meta"`
}

func ToNotificationResponse(n *notificationdomain.Notification) NotificationResponse {
	resp := NotificationResponse{
		ID:        n.ID,
		Type:      n.Type,
		Title:     n.Title,
		Body:      n.Body,
		Data:      n.Data,
		CreatedAt: n.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if n.ReadAt != nil {
		formatted := n.ReadAt.Format("2006-01-02T15:04:05Z07:00")
		resp.ReadAt = &formatted
	}
	return resp
}

func ToPaginatedNotificationsResponse(result *appcommon.PageResult[notificationdomain.Notification]) PaginatedNotificationsResponse {
	items := make([]NotificationResponse, 0, len(result.Items))
	for i := range result.Items {
		items = append(items, ToNotificationResponse(&result.Items[i]))
	}
	return PaginatedNotificationsResponse{
		Items: items,
		Meta: PaginationMetaResponse{
			Page:       result.Meta.Page,
			Limit:      result.Meta.Limit,
			Total:      result.Meta.Total,
			TotalPages: result.Meta.TotalPages,
			Search:     result.Meta.Search,
			SortBy:     result.Meta.SortBy,
			SortOrder:  result.Meta.SortOrder,
		},
	}
}
