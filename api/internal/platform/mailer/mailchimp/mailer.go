package mailchimp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"api/internal/platform/config"
	platformmailer "api/internal/platform/mailer"
)

const sendURL = "https://mandrillapp.com/api/1.0/messages/send.json"

type Mailer struct {
	apiKey    string
	fromEmail string
	fromName  string
	client    *http.Client
}

func New(cfg config.Config) *Mailer {
	return &Mailer{
		apiKey:    cfg.MailchimpTransactionalAPIKey,
		fromEmail: cfg.MailFromEmail,
		fromName:  cfg.MailFromName,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (m *Mailer) Send(ctx context.Context, message platformmailer.Message) error {
	payload := map[string]any{
		"key": m.apiKey,
		"message": map[string]any{
			"subject":    message.Subject,
			"from_email": m.fromEmail,
			"from_name":  m.fromName,
			"html":       message.HTMLBody,
			"text":       message.TextBody,
			"to": []map[string]any{{
				"email": message.ToEmail,
				"name":  message.ToName,
				"type":  "to",
			}},
		},
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

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("mailchimp transactional send failed with status %d", resp.StatusCode)
	}

	return nil
}

func HTMLCodeTemplate(title, intro, code string, expiresInMinutes int) string {
	return fmt.Sprintf("<h2>%s</h2><p>%s</p><p style=\"font-size:24px;font-weight:bold;letter-spacing:4px;\">%s</p><p>Ce code expire dans %d minutes.</p>", escape(title), escape(intro), escape(code), expiresInMinutes)
}

func TextCodeTemplate(title, intro, code string, expiresInMinutes int) string {
	return fmt.Sprintf("%s\n\n%s\n\nCode: %s\n\nCe code expire dans %d minutes.", title, intro, code, expiresInMinutes)
}

func escape(value string) string {
	replacer := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;")
	return replacer.Replace(value)
}
