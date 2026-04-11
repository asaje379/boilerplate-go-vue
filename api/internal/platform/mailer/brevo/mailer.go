package brevo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"api/internal/platform/config"
	platformmailer "api/internal/platform/mailer"
)

const sendURL = "https://api.brevo.com/v3/smtp/email"

type Mailer struct {
	apiKey    string
	fromEmail string
	fromName  string
	client    *http.Client
}

func New(cfg config.Config) *Mailer {
	return &Mailer{
		apiKey:    cfg.BrevoAPIKey,
		fromEmail: cfg.MailFromEmail,
		fromName:  cfg.MailFromName,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

type sendRequest struct {
	Sender      sender      `json:"sender"`
	To          []recipient `json:"to"`
	Subject     string      `json:"subject"`
	HTMLContent string      `json:"htmlContent"`
	TextContent string      `json:"textContent,omitempty"`
}

type sender struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type recipient struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

func (m *Mailer) Send(ctx context.Context, message platformmailer.Message) error {
	payload := sendRequest{
		Sender:      sender{Email: m.fromEmail, Name: m.fromName},
		To:          []recipient{{Email: message.ToEmail, Name: message.ToName}},
		Subject:     message.Subject,
		HTMLContent: message.HTMLBody,
		TextContent: message.TextBody,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sendURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("api-key", m.apiKey)

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("brevo send failed with status %d", resp.StatusCode)
	}

	return nil
}
