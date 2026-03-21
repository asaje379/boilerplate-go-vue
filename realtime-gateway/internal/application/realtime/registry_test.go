package realtime

import "testing"

func TestRegistryMatchesAudienceAndChannels(t *testing.T) {
	client := &Client{
		ID: "conn_1",
		Principal: Principal{
			UserID: "usr_1",
			Role:   "admin",
		},
		Channels: map[string]struct{}{"users": {}},
		Send:     make(chan Event, 1),
	}

	if !matches(client, Event{Channel: "users", AllowedRoles: []string{"admin"}}) {
		t.Fatal("expected matching admin event on subscribed channel")
	}

	if matches(client, Event{Channel: "files", AllowedRoles: []string{"admin"}}) {
		t.Fatal("expected channel mismatch to fail")
	}

	if matches(client, Event{Channel: "users", AllowedUserIDs: []string{"usr_2"}}) {
		t.Fatal("expected foreign user event to fail")
	}

	if !matches(client, Event{Channel: "users", AllowedUserIDs: []string{"usr_1"}}) {
		t.Fatal("expected direct user event to pass")
	}
}
