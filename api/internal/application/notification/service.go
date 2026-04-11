package notification

import (
	"context"

	appcommon "api/internal/application/common"
	notificationdomain "api/internal/domain/notification"
)

type Service struct {
	notifications notificationdomain.Repository
}

func NewService(notifications notificationdomain.Repository) Service {
	return Service{notifications: notifications}
}

func (s Service) List(ctx context.Context, userID string, params appcommon.ListParams) (*appcommon.PageResult[notificationdomain.Notification], error) {
	params = params.Normalize(20, 100, "createdAt")
	items, total, err := s.notifications.ListByUserID(ctx, userID, params)
	if err != nil {
		return nil, err
	}

	return &appcommon.PageResult[notificationdomain.Notification]{
		Items: items,
		Meta:  appcommon.NewPageMeta(params, total),
	}, nil
}

func (s Service) GetUnreadCount(ctx context.Context, userID string) (int64, error) {
	return s.notifications.CountUnread(ctx, userID)
}

func (s Service) MarkAsRead(ctx context.Context, id string, userID string) error {
	return s.notifications.MarkAsRead(ctx, id, userID)
}

func (s Service) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.notifications.MarkAllAsRead(ctx, userID)
}
