package notification

import (
	"context"

	appcommon "api/internal/application/common"
)

type Repository interface {
	Create(ctx context.Context, notification *Notification) error
	ListByUserID(ctx context.Context, userID string, params appcommon.ListParams) ([]Notification, int64, error)
	MarkAsRead(ctx context.Context, id string, userID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
	CountUnread(ctx context.Context, userID string) (int64, error)
}
