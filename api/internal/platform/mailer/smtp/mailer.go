package smtp

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	gosmtp "net/smtp"
	"strings"

	"api/internal/platform/config"
	platformmailer "api/internal/platform/mailer"
)

type Mailer struct {
	host      string
	port      int
	username  string
	password  string
	useSSL    bool
	fromEmail string
	fromName  string
}

func New(cfg config.Config) *Mailer {
	return &Mailer{
		host:      cfg.SMTPHost,
		port:      cfg.SMTPPort,
		username:  cfg.SMTPUsername,
		password:  cfg.SMTPPassword,
		useSSL:    cfg.SMTPUseSSL,
		fromEmail: cfg.MailFromEmail,
		fromName:  cfg.MailFromName,
	}
}

func (m *Mailer) Send(ctx context.Context, message platformmailer.Message) error {
	_ = ctx
	addr := fmt.Sprintf("%s:%d", m.host, m.port)

	from := m.fromEmail
	if m.fromName != "" {
		from = fmt.Sprintf("%s <%s>", m.fromName, m.fromEmail)
	}

	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s <%s>", message.ToName, message.ToEmail),
		fmt.Sprintf("Subject: %s", message.Subject),
		"MIME-Version: 1.0",
	}

	var body string
	if message.HTMLBody != "" {
		headers = append(headers, "Content-Type: multipart/alternative; boundary=\"boundary42\"")
		body = strings.Join(headers, "\r\n") + "\r\n\r\n" +
			"--boundary42\r\n" +
			"Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n" +
			message.TextBody + "\r\n" +
			"--boundary42\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n" +
			message.HTMLBody + "\r\n" +
			"--boundary42--"
	} else {
		headers = append(headers, "Content-Type: text/plain; charset=\"UTF-8\"")
		body = strings.Join(headers, "\r\n") + "\r\n\r\n" + message.TextBody
	}

	var auth gosmtp.Auth
	if m.username != "" {
		auth = gosmtp.PlainAuth("", m.username, m.password, m.host)
	}

	if m.useSSL {
		return m.sendSSL(addr, auth, m.fromEmail, message.ToEmail, []byte(body))
	}

	return gosmtp.SendMail(addr, auth, m.fromEmail, []string{message.ToEmail}, []byte(body))
}

func (m *Mailer) sendSSL(addr string, auth gosmtp.Auth, from, to string, body []byte) error {
	tlsConfig := &tls.Config{ServerName: m.host}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("smtp tls dial: %w", err)
	}
	defer conn.Close()

	host, _, _ := net.SplitHostPort(addr)
	client, err := gosmtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp new client: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write(body); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close data: %w", err)
	}

	return client.Quit()
}
