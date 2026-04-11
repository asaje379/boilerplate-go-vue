package notification

import (
	"context"
	"fmt"
	"html"
	"log"
	"strings"
	"time"

	appcommon "api/internal/application/common"
	notificationdomain "api/internal/domain/notification"
	userdomain "api/internal/domain/user"
	platformid "api/internal/platform/id"
	platformmailer "api/internal/platform/mailer"
	platformwhatsapp "api/internal/platform/whatsapp"
)

type Dispatcher struct {
	config        *Config
	notifications notificationdomain.Repository
	users         userdomain.Repository
	mailer        platformmailer.Mailer
	whatsapp      *platformwhatsapp.Client
	events        appcommon.EventPublisher
	defaultLocale userdomain.Locale
}

func NewDispatcher(config *Config, notifications notificationdomain.Repository, users userdomain.Repository, mailer platformmailer.Mailer, whatsapp *platformwhatsapp.Client, events appcommon.EventPublisher, defaultLocale userdomain.Locale) *Dispatcher {
	return &Dispatcher{config: config, notifications: notifications, users: users, mailer: mailer, whatsapp: whatsapp, events: events, defaultLocale: defaultLocale}
}

func (d *Dispatcher) HandleEvent(ctx context.Context, event appcommon.RealtimeEvent) {
	ec := d.config.GetEventConfig(event.Type)
	if ec == nil {
		return
	}

	seen := make(map[string]bool)
	for _, userID := range event.AllowedUserIDs {
		if !seen[userID] {
			seen[userID] = true
			d.dispatchToUser(ctx, event, ec, userID)
		}
	}

	for _, role := range event.AllowedRoles {
		ids, err := d.users.ListIDsByRole(ctx, userdomain.Role(role))
		if err != nil {
			log.Printf("notification dispatcher: failed to list users for role %s: %v", role, err)
			continue
		}
		for _, userID := range ids {
			if !seen[userID] {
				seen[userID] = true
				d.dispatchToUser(ctx, event, ec, userID)
			}
		}
	}
}

func (d *Dispatcher) dispatchToUser(ctx context.Context, event appcommon.RealtimeEvent, ec *EventConfig, userID string) {
	user, err := d.users.GetByID(ctx, userID)
	if err != nil {
		log.Printf("notification dispatcher: failed to load user %s: %v", userID, err)
		return
	}

	data, _ := event.Data.(map[string]any)
	resolved, err := d.config.ResolveTemplate(event.Type, user.PreferredLocale, d.defaultLocale, data)
	if err != nil {
		log.Printf("notification dispatcher: failed to resolve template for %s user %s: %v", event.Type, userID, err)
		return
	}

	for _, channel := range ec.Channels {
		switch channel {
		case string(notificationdomain.ChannelInApp):
			if !user.NotifyInApp {
				continue
			}
			d.dispatchInApp(ctx, event, user, resolved)
		case string(notificationdomain.ChannelEmail):
			if !user.NotifyEmail {
				continue
			}
			d.dispatchEmail(ctx, user, resolved)
		case string(notificationdomain.ChannelWhatsapp):
			if !user.NotifyWhatsapp {
				continue
			}
			d.dispatchWhatsapp(ctx, user, resolved)
		}
	}
}

func (d *Dispatcher) dispatchInApp(ctx context.Context, event appcommon.RealtimeEvent, user *userdomain.User, resolved *ResolvedTemplate) {
	data, _ := event.Data.(map[string]any)
	notif := &notificationdomain.Notification{ID: platformid.New(), UserID: user.ID, Type: event.Type, Title: resolved.Title, Body: resolved.Body, Data: data, CreatedAt: time.Now().UTC()}
	if err := d.notifications.Create(ctx, notif); err != nil {
		log.Printf("notification dispatcher: failed to persist notification for user %s: %v", user.ID, err)
		return
	}

	realtimeEvent := appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "notification.created",
		Channel:        "notifications",
		AllowedUserIDs: []string{user.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"whatsappPhone": strings.TrimSpace(user.WhatsAppPhone),
			"notification": map[string]any{
				"id":        notif.ID,
				"type":      notif.Type,
				"title":     notif.Title,
				"body":      notif.Body,
				"data":      notif.Data,
				"readAt":    nil,
				"createdAt": notif.CreatedAt.Format(time.RFC3339),
			},
		},
	}
	if err := d.events.Publish(ctx, realtimeEvent); err != nil {
		log.Printf("notification dispatcher: failed to publish notification.created for user %s: %v", user.ID, err)
	}
}

func (d *Dispatcher) dispatchEmail(ctx context.Context, user *userdomain.User, resolved *ResolvedTemplate) {
	htmlBody := fmt.Sprintf("<h1>%s</h1><p>%s</p>", html.EscapeString(resolved.Title), html.EscapeString(resolved.Body))
	textBody := strings.Join([]string{resolved.Title, "", resolved.Body}, "\n")
	if err := d.mailer.Send(ctx, platformmailer.Message{ToEmail: user.Email, ToName: user.Name, Subject: resolved.EmailSubject, HTMLBody: htmlBody, TextBody: textBody}); err != nil {
		log.Printf("notification dispatcher: failed to send email to %s: %v", user.Email, err)
	}
}

func (d *Dispatcher) dispatchWhatsapp(ctx context.Context, user *userdomain.User, resolved *ResolvedTemplate) {
	if d.whatsapp == nil {
		return
	}
	phone := strings.TrimSpace(user.WhatsAppPhone)
	if phone == "" {
		return
	}
	text := strings.TrimSpace(resolved.WhatsappBody)
	if text == "" {
		text = resolved.Body
	}
	if err := d.whatsapp.Send(ctx, phone, text); err != nil {
		log.Printf("notification dispatcher: failed to send whatsapp to %s: %v", phone, err)
	}
}
