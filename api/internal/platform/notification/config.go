package notification

import (
	"bytes"
	"fmt"
	"os"
	"text/template"

	userdomain "api/internal/domain/user"

	"gopkg.in/yaml.v3"
)

type TemplateSet struct {
	Title        string `yaml:"title"`
	Body         string `yaml:"body"`
	EmailSubject string `yaml:"email_subject,omitempty"`
	WhatsappBody string `yaml:"whatsapp_body,omitempty"`
}

type EventConfig struct {
	Channels  []string               `yaml:"channels"`
	Templates map[string]TemplateSet `yaml:"templates"`
}

type Config struct {
	Notifications map[string]EventConfig `yaml:"notifications"`
}

type ResolvedTemplate struct {
	Title        string
	Body         string
	EmailSubject string
	WhatsappBody string
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read notification config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse notification config: %w", err)
	}

	for eventType, eventCfg := range cfg.Notifications {
		for locale, tpl := range eventCfg.Templates {
			if _, err := template.New("").Parse(tpl.Title); err != nil {
				return nil, fmt.Errorf("invalid title template for %s/%s: %w", eventType, locale, err)
			}
			if _, err := template.New("").Parse(tpl.Body); err != nil {
				return nil, fmt.Errorf("invalid body template for %s/%s: %w", eventType, locale, err)
			}
			if tpl.EmailSubject != "" {
				if _, err := template.New("").Parse(tpl.EmailSubject); err != nil {
					return nil, fmt.Errorf("invalid email_subject template for %s/%s: %w", eventType, locale, err)
				}
			}
			if tpl.WhatsappBody != "" {
				if _, err := template.New("").Parse(tpl.WhatsappBody); err != nil {
					return nil, fmt.Errorf("invalid whatsapp_body template for %s/%s: %w", eventType, locale, err)
				}
			}
		}
	}

	return &cfg, nil
}

func (c *Config) GetEventConfig(eventType string) *EventConfig {
	ec, ok := c.Notifications[eventType]
	if !ok {
		return nil
	}
	return &ec
}

func (c *Config) ResolveTemplate(eventType string, locale userdomain.Locale, defaultLocale userdomain.Locale, data map[string]any) (*ResolvedTemplate, error) {
	ec := c.GetEventConfig(eventType)
	if ec == nil {
		return nil, fmt.Errorf("no config for event type: %s", eventType)
	}

	tplSet, ok := ec.Templates[string(locale)]
	if !ok {
		tplSet, ok = ec.Templates[string(defaultLocale)]
		if !ok {
			return nil, fmt.Errorf("no template for event %s locale %s or default %s", eventType, locale, defaultLocale)
		}
	}

	title, err := executeTemplate(tplSet.Title, data)
	if err != nil {
		return nil, err
	}
	body, err := executeTemplate(tplSet.Body, data)
	if err != nil {
		return nil, err
	}
	emailSubject := title
	if tplSet.EmailSubject != "" {
		emailSubject, err = executeTemplate(tplSet.EmailSubject, data)
		if err != nil {
			return nil, err
		}
	}
	whatsappBody := body
	if tplSet.WhatsappBody != "" {
		whatsappBody, err = executeTemplate(tplSet.WhatsappBody, data)
		if err != nil {
			return nil, err
		}
	}

	return &ResolvedTemplate{Title: title, Body: body, EmailSubject: emailSubject, WhatsappBody: whatsappBody}, nil
}

func executeTemplate(tplStr string, data map[string]any) (string, error) {
	tpl, err := template.New("").Parse(tplStr)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
