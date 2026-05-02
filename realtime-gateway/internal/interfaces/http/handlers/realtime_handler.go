package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	appauth "realtime-gateway/internal/application/auth"
	apprealtime "realtime-gateway/internal/application/realtime"
	"realtime-gateway/internal/platform/config"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type RealtimeHandler struct {
	auth     appauth.Service
	registry *apprealtime.Registry
	config   config.Config
	upgrader websocket.Upgrader
}

func NewRealtimeHandler(auth appauth.Service, registry *apprealtime.Registry, cfg config.Config) RealtimeHandler {
	allowedOrigins := make(map[string]struct{}, len(cfg.CORSAllowedOrigins))
	for _, origin := range cfg.CORSAllowedOrigins {
		allowedOrigins[origin] = struct{}{}
	}

	return RealtimeHandler{
		auth:     auth,
		registry: registry,
		config:   cfg,
		upgrader: websocket.Upgrader{
			Subprotocols: []string{"bearer"},
			CheckOrigin: func(r *http.Request) bool {
				if len(allowedOrigins) == 0 {
					return true
				}
				origin := strings.TrimSpace(r.Header.Get("Origin"))
				_, ok := allowedOrigins[origin]
				return ok
			},
		},
	}
}

func (h RealtimeHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h RealtimeHandler) SSE(c *gin.Context) {
	principal, ok := h.authenticate(c)
	if !ok {
		return
	}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming unsupported"})
		return
	}

	client := &apprealtime.Client{
		ID:        connectionID(principal.UserID),
		Principal: apprealtime.Principal(principal),
		Channels:  parseChannels(c.Query("channels")),
		Send:      make(chan apprealtime.Event, 32),
	}
	h.registry.Add(client)
	h.broadcastPresenceCount()
	defer h.registry.Remove(client.ID)
	defer h.broadcastPresenceCount()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	h.writeSSEMessage(c.Writer, apprealtime.TransportMessage{
		Event: "ready",
		Meta:  apprealtime.TransportMeta{Transport: "sse", OccurredAt: time.Now().UTC()},
	})
	flusher.Flush()

	heartbeat := time.NewTicker(h.config.HeartbeatInterval)
	defer heartbeat.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-heartbeat.C:
			_, _ = c.Writer.Write([]byte(": ping\n\n"))
			flusher.Flush()
		case event := <-client.Send:
			h.writeSSEMessage(c.Writer, event.ToTransportMessage("sse"))
			flusher.Flush()
		}
	}
}

func (h RealtimeHandler) WebSocket(c *gin.Context) {
	principal, ok := h.authenticate(c)
	if !ok {
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	client := &apprealtime.Client{
		ID:        connectionID(principal.UserID),
		Principal: apprealtime.Principal(principal),
		Channels:  parseChannels(c.Query("channels")),
		Send:      make(chan apprealtime.Event, 32),
	}
	h.registry.Add(client)
	h.broadcastPresenceCount()
	defer h.registry.Remove(client.ID)
	defer h.broadcastPresenceCount()

	_ = conn.WriteJSON(apprealtime.TransportMessage{
		Event: "ready",
		Meta:  apprealtime.TransportMeta{Transport: "ws", OccurredAt: time.Now().UTC()},
	})

	conn.SetReadLimit(1024)
	_ = conn.SetReadDeadline(time.Now().Add(2 * h.config.HeartbeatInterval))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(2 * h.config.HeartbeatInterval))
	})

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()

	pingTicker := time.NewTicker(h.config.HeartbeatInterval)
	defer pingTicker.Stop()

	for {
		select {
		case <-done:
			return
		case <-c.Request.Context().Done():
			return
		case <-pingTicker.C:
			_ = conn.SetWriteDeadline(time.Now().Add(h.config.WriteTimeout))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case event := <-client.Send:
			_ = conn.SetWriteDeadline(time.Now().Add(h.config.WriteTimeout))
			if err := conn.WriteJSON(event.ToTransportMessage("ws")); err != nil {
				return
			}
		}
	}
}

func (h RealtimeHandler) authenticate(c *gin.Context) (appauth.Principal, bool) {
	token := strings.TrimSpace(c.Query("access_token"))
	if token == "" {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		parts := strings.SplitN(header, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		token = bearerSubprotocolToken(c.GetHeader("Sec-WebSocket-Protocol"))
	}

	principal, err := h.auth.Authenticate(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return appauth.Principal{}, false
	}

	return principal, true
}

func bearerSubprotocolToken(header string) string {
	parts := strings.Split(header, ",")
	for index, part := range parts {
		if strings.EqualFold(strings.TrimSpace(part), "bearer") && index+1 < len(parts) {
			return strings.TrimSpace(parts[index+1])
		}
	}
	return ""
}

func parseChannels(raw string) map[string]struct{} {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	channels := make(map[string]struct{})
	for _, channel := range strings.Split(raw, ",") {
		trimmed := strings.TrimSpace(channel)
		if trimmed != "" {
			channels[trimmed] = struct{}{}
		}
	}
	return channels
}

func connectionID(userID string) string {
	return userID + "-" + time.Now().UTC().Format("20060102150405.000000000")
}

func (h RealtimeHandler) writeSSEMessage(writer http.ResponseWriter, message apprealtime.TransportMessage) {
	body, _ := json.Marshal(message)
	if message.ID != "" {
		_, _ = writer.Write([]byte("id: " + message.ID + "\n"))
	}
	_, _ = writer.Write([]byte("data: "))
	_, _ = writer.Write(body)
	_, _ = writer.Write([]byte("\n\n"))
}

func (h RealtimeHandler) broadcastPresenceCount() {
	h.registry.Broadcast(apprealtime.NewPresenceCountEvent(h.registry.UniqueUserCount()))
}
