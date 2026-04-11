package notification

import "time"

type Channel string

const (
	ChannelInApp    Channel = "in_app"
	ChannelEmail    Channel = "email"
	ChannelWhatsapp Channel = "whatsapp"
)

type Notification struct {
	ID        string
	UserID    string
	Type      string
	Title     string
	Body      string
	Data      map[string]any
	ReadAt    *time.Time
	CreatedAt time.Time
}
