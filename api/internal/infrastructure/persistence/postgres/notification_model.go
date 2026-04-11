package postgres

import (
	"encoding/json"
	"time"

	notificationdomain "api/internal/domain/notification"
)

type NotificationModel struct {
	ID        string     `gorm:"primaryKey;size:32"`
	UserID    string     `gorm:"size:32;not null;index:idx_notifications_user_id"`
	Type      string     `gorm:"size:100;not null"`
	Title     string     `gorm:"size:255;not null"`
	Body      string     `gorm:"type:text;not null"`
	Data      []byte     `gorm:"type:jsonb"`
	ReadAt    *time.Time `gorm:"index:idx_notifications_user_unread"`
	CreatedAt time.Time
}

func (NotificationModel) TableName() string {
	return "notifications"
}

func (m NotificationModel) toDomain() *notificationdomain.Notification {
	n := &notificationdomain.Notification{
		ID:        m.ID,
		UserID:    m.UserID,
		Type:      m.Type,
		Title:     m.Title,
		Body:      m.Body,
		ReadAt:    m.ReadAt,
		CreatedAt: m.CreatedAt,
	}
	if m.Data != nil {
		_ = json.Unmarshal(m.Data, &n.Data)
	}
	return n
}

func fromDomainNotification(n *notificationdomain.Notification) *NotificationModel {
	model := &NotificationModel{
		ID:        n.ID,
		UserID:    n.UserID,
		Type:      n.Type,
		Title:     n.Title,
		Body:      n.Body,
		ReadAt:    n.ReadAt,
		CreatedAt: n.CreatedAt,
	}
	if n.Data != nil {
		model.Data, _ = json.Marshal(n.Data)
	}
	return model
}
