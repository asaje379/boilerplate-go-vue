package postgres

import (
	"context"
	"time"

	appcommon "api/internal/application/common"
	notificationdomain "api/internal/domain/notification"
	platformid "api/internal/platform/id"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return NotificationRepository{db: db}
}

func (r NotificationRepository) Create(ctx context.Context, notification *notificationdomain.Notification) error {
	if notification.ID == "" {
		notification.ID = platformid.New()
	}
	if notification.CreatedAt.IsZero() {
		notification.CreatedAt = time.Now().UTC()
	}

	model := fromDomainNotification(notification)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}

	*notification = *model.toDomain()
	return nil
}

func (r NotificationRepository) ListByUserID(ctx context.Context, userID string, params appcommon.ListParams) ([]notificationdomain.Notification, int64, error) {
	query := r.db.WithContext(ctx).Model(&NotificationModel{}).Where("user_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var models []NotificationModel
	if err := query.Order("created_at DESC").Limit(params.Limit).Offset(params.Offset()).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	notifications := make([]notificationdomain.Notification, 0, len(models))
	for _, model := range models {
		notifications = append(notifications, *model.toDomain())
	}

	return notifications, total, nil
}

func (r NotificationRepository) MarkAsRead(ctx context.Context, id string, userID string) error {
	now := time.Now().UTC()
	result := r.db.WithContext(ctx).Model(&NotificationModel{}).
		Where("id = ? AND user_id = ? AND read_at IS NULL", id, userID).
		Update("read_at", now)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return appcommon.ErrNotFound
	}
	return nil
}

func (r NotificationRepository) MarkAllAsRead(ctx context.Context, userID string) error {
	now := time.Now().UTC()
	return r.db.WithContext(ctx).Model(&NotificationModel{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Update("read_at", now).Error
}

func (r NotificationRepository) CountUnread(ctx context.Context, userID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&NotificationModel{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

var _ notificationdomain.Repository = NotificationRepository{}
