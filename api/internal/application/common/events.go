package common

import (
	"context"
	"time"
)

type RealtimeEvent struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"`
	Channel        string    `json:"channel"`
	AllowedUserIDs []string  `json:"allowedUserIds,omitempty"`
	AllowedRoles   []string  `json:"allowedRoles,omitempty"`
	OccurredAt     time.Time `json:"occurredAt"`
	Data           any       `json:"data,omitempty"`
}

type EventPublisher interface {
	Publish(ctx context.Context, event RealtimeEvent) error
}

type NoopEventPublisher struct{}

func (NoopEventPublisher) Publish(context.Context, RealtimeEvent) error {
	return nil
}
