package realtime

import "sync"

type Principal struct {
	UserID string
	Role   string
	Email  string
}

type Client struct {
	ID        string
	Principal Principal
	Channels  map[string]struct{}
	Send      chan Event
}

type Registry struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

func NewRegistry() *Registry {
	return &Registry{clients: make(map[string]*Client)}
}

func (r *Registry) Add(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[client.ID] = client
}

func (r *Registry) Remove(clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, clientID)
}

func (r *Registry) UniqueUserCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make(map[string]struct{}, len(r.clients))
	for _, client := range r.clients {
		if client.Principal.UserID == "" {
			continue
		}
		users[client.Principal.UserID] = struct{}{}
	}

	return len(users)
}

func (r *Registry) Broadcast(event Event) int {
	r.mu.RLock()
	defer r.mu.RUnlock()

	delivered := 0
	for _, client := range r.clients {
		if !matches(client, event) {
			continue
		}

		select {
		case client.Send <- event:
			delivered++
		default:
		}
	}

	return delivered
}

func matches(client *Client, event Event) bool {
	if event.Channel != "" && len(client.Channels) > 0 {
		if _, ok := client.Channels[event.Channel]; !ok {
			return false
		}
	}

	if len(event.AllowedUserIDs) == 0 && len(event.AllowedRoles) == 0 {
		return true
	}

	for _, userID := range event.AllowedUserIDs {
		if userID == client.Principal.UserID {
			return true
		}
	}

	for _, role := range event.AllowedRoles {
		if role == client.Principal.Role {
			return true
		}
	}

	return false
}
