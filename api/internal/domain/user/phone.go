package user

import "regexp"

var e164PhonePattern = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

func IsValidWhatsAppPhone(value string) bool {
	if value == "" {
		return true
	}
	return e164PhonePattern.MatchString(value)
}
