package email

import (
	"embed"
	"fmt"
	"strings"
)

//go:embed data/*.conf
var dataFS embed.FS

type Validator struct {
	allowedEmails   map[string]struct{}
	allowedDomains  map[string]struct{}
	blocklisted     map[string]struct{}
	officialAllowed map[string]struct{}
}

func NewValidator(allowedEmails, allowedDomains []string) (Validator, error) {
	blocklisted, err := loadDomainSet("data/disposable_email_blocklist.conf")
	if err != nil {
		return Validator{}, err
	}

	officialAllowed, err := loadDomainSet("data/allowlist.conf")
	if err != nil {
		return Validator{}, err
	}

	return Validator{
		allowedEmails:   normalizeSet(allowedEmails),
		allowedDomains:  normalizeSet(allowedDomains),
		blocklisted:     blocklisted,
		officialAllowed: officialAllowed,
	}, nil
}

func (v Validator) Validate(email string) error {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	parts := strings.Split(normalizedEmail, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return fmt.Errorf("invalid email address")
	}

	domain := parts[1]
	if len(v.allowedEmails) > 0 || len(v.allowedDomains) > 0 {
		if _, ok := v.allowedEmails[normalizedEmail]; ok {
			return nil
		}
		if _, ok := v.allowedDomains[domain]; ok {
			return nil
		}
		return fmt.Errorf("email is not in the registration allowlist")
	}

	if _, ok := v.officialAllowed[domain]; ok {
		return nil
	}
	if _, ok := v.blocklisted[domain]; ok {
		return fmt.Errorf("temporary or disposable email addresses are not allowed")
	}

	return nil
}

func loadDomainSet(path string) (map[string]struct{}, error) {
	content, err := dataFS.ReadFile(path)
	if err != nil {
		return nil, err
	}

	set := make(map[string]struct{})
	for _, line := range strings.Split(string(content), "\n") {
		trimmed := strings.ToLower(strings.TrimSpace(line))
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		set[trimmed] = struct{}{}
	}

	return set, nil
}

func normalizeSet(values []string) map[string]struct{} {
	set := make(map[string]struct{})
	for _, value := range values {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "" {
			continue
		}
		set[normalized] = struct{}{}
	}

	return set
}
