package realtime

import (
	"encoding/json"
	"time"
)

func NewPresenceCountEvent(count int) Event {
	data, _ := json.Marshal(map[string]int{"count": count})

	return Event{
		ID:           time.Now().UTC().Format("20060102150405.000000000"),
		Type:         "presence.users.count.updated",
		Channel:      "presence",
		AllowedRoles: []string{"admin"},
		OccurredAt:   time.Now().UTC(),
		Data:         data,
	}
}

type Event struct {
	ID             string          `json:"id"`
	Type           string          `json:"type"`
	Channel        string          `json:"channel"`
	AllowedUserIDs []string        `json:"allowedUserIds,omitempty"`
	AllowedRoles   []string        `json:"allowedRoles,omitempty"`
	OccurredAt     time.Time       `json:"occurredAt"`
	Data           json.RawMessage `json:"data,omitempty"`
}

type TransportMessage struct {
	Event string          `json:"event"`
	ID    string          `json:"id,omitempty"`
	Data  json.RawMessage `json:"data,omitempty"`
	Meta  TransportMeta   `json:"meta"`
}

type TransportMeta struct {
	Channel    string    `json:"channel,omitempty"`
	OccurredAt time.Time `json:"occurredAt"`
	Transport  string    `json:"transport,omitempty"`
}

func (e Event) ToTransportMessage(transport string) TransportMessage {
	return TransportMessage{
		Event: e.Type,
		ID:    e.ID,
		Data:  e.Data,
		Meta: TransportMeta{
			Channel:    e.Channel,
			OccurredAt: e.OccurredAt,
			Transport:  transport,
		},
	}
}
