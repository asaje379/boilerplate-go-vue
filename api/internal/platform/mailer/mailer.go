package mailer

import "context"

type Message struct {
	ToEmail  string
	ToName   string
	Subject  string
	HTMLBody string
	TextBody string
}

type Mailer interface {
	Send(ctx context.Context, message Message) error
}
