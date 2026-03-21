package template

import (
	"fmt"
	"html/template"
	"strings"

	userdomain "api/internal/domain/user"
)

type OTPTemplateInput struct {
	Locale           userdomain.Locale
	RecipientName    string
	Code             string
	ExpiresInMinutes int
	Purpose          string
}

type OTPTemplateOutput struct {
	Subject  string
	HTMLBody string
	TextBody string
}

func BuildOTP(input OTPTemplateInput) (OTPTemplateOutput, error) {
	copy := input
	copy.Locale = copy.Locale.Normalize()
	content := localizedContent(copy.Locale, copy.Purpose)
	name := strings.TrimSpace(copy.RecipientName)
	if name == "" {
		name = content.DefaultName
	}

	data := map[string]any{
		"Subject":          content.Subject,
		"Headline":         content.Headline,
		"Greeting":         fmt.Sprintf(content.Greeting, name),
		"Intro":            content.Intro,
		"CodeLabel":        content.CodeLabel,
		"Code":             copy.Code,
		"Expiry":           fmt.Sprintf(content.Expiry, copy.ExpiresInMinutes),
		"IgnoreNotice":     content.IgnoreNotice,
		"SupportSignature": content.SupportSignature,
	}

	tpl, err := template.New("otp-email").Parse(htmlLayout)
	if err != nil {
		return OTPTemplateOutput{}, err
	}

	var htmlBuilder strings.Builder
	if err := tpl.Execute(&htmlBuilder, data); err != nil {
		return OTPTemplateOutput{}, err
	}

	textBody := strings.Join([]string{data["Greeting"].(string), "", data["Intro"].(string), "", data["CodeLabel"].(string) + ": " + copy.Code, data["Expiry"].(string), "", data["IgnoreNotice"].(string), data["SupportSignature"].(string)}, "\n")

	return OTPTemplateOutput{Subject: content.Subject, HTMLBody: htmlBuilder.String(), TextBody: textBody}, nil
}

type contentSet struct {
	Subject          string
	Headline         string
	Greeting         string
	Intro            string
	CodeLabel        string
	Expiry           string
	IgnoreNotice     string
	SupportSignature string
	DefaultName      string
}

func localizedContent(locale userdomain.Locale, purpose string) contentSet {
	if locale == userdomain.LocaleEN {
		switch purpose {
		case "password_reset":
			return contentSet{
				Subject:          "Password reset code",
				Headline:         "Reset your password",
				Greeting:         "Hello %s,",
				Intro:            "Use the following one-time code to reset your password.",
				CodeLabel:        "Code",
				Expiry:           "%d-minute validity",
				IgnoreNotice:     "If you did not request this action, you can safely ignore this email.",
				SupportSignature: "The support team",
				DefaultName:      "there",
			}
		default:
			return contentSet{
				Subject:          "Your login verification code",
				Headline:         "Confirm your sign in",
				Greeting:         "Hello %s,",
				Intro:            "Use the following one-time code to finish signing in.",
				CodeLabel:        "Code",
				Expiry:           "%d-minute validity",
				IgnoreNotice:     "If you did not try to sign in, please ignore this email and change your password.",
				SupportSignature: "The support team",
				DefaultName:      "there",
			}
		}
	}

	switch purpose {
	case "password_reset":
		return contentSet{
			Subject:          "Code de reinitialisation du mot de passe",
			Headline:         "Reinitialisez votre mot de passe",
			Greeting:         "Bonjour %s,",
			Intro:            "Utilisez le code a usage unique suivant pour reinitialiser votre mot de passe.",
			CodeLabel:        "Code",
			Expiry:           "Validite de %d minutes",
			IgnoreNotice:     "Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.",
			SupportSignature: "L'equipe support",
			DefaultName:      "a vous",
		}
	default:
		return contentSet{
			Subject:          "Votre code de verification de connexion",
			Headline:         "Confirmez votre connexion",
			Greeting:         "Bonjour %s,",
			Intro:            "Utilisez le code a usage unique suivant pour finaliser votre connexion.",
			CodeLabel:        "Code",
			Expiry:           "Validite de %d minutes",
			IgnoreNotice:     "Si vous n'etes pas a l'origine de cette connexion, ignorez cet email et changez votre mot de passe.",
			SupportSignature: "L'equipe support",
			DefaultName:      "a vous",
		}
	}
}

const htmlLayout = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ .Subject }}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Helvetica,Arial,sans-serif;color:#1b1f24;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(16,24,40,0.08);">
            <tr>
              <td style="padding:32px 36px;background:linear-gradient(135deg,#0f4c81,#3f8ecb);color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:0.8;">Secure message</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;">{{ .Headline }}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">{{ .Greeting }}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#475467;">{{ .Intro }}</p>
                <div style="margin:0 0 24px;padding:20px;border:1px solid #d0d5dd;border-radius:16px;background:#f8fafc;text-align:center;">
                  <p style="margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#667085;">{{ .CodeLabel }}</p>
                  <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:8px;color:#0f172a;">{{ .Code }}</p>
                </div>
                <p style="margin:0 0 12px;font-size:14px;color:#667085;">{{ .Expiry }}</p>
                <p style="margin:0 0 24px;font-size:14px;color:#667085;">{{ .IgnoreNotice }}</p>
                <p style="margin:0;font-size:15px;color:#344054;">{{ .SupportSignature }}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
