package async

import (
	"context"
	"log"
	"time"

	platformid "api/internal/platform/id"
	platformmailer "api/internal/platform/mailer"
	"api/internal/platform/rabbitmq"
)

const EmailRoutingKey = "email.send"

type EmailTask struct {
	ID          string                 `json:"id"`
	RequestedAt time.Time              `json:"requestedAt"`
	Message     platformmailer.Message `json:"message"`
}

type EmailDispatcher interface {
	Dispatch(ctx context.Context, message platformmailer.Message) error
}

type DirectEmailDispatcher struct {
	mailer platformmailer.Mailer
}

func NewDirectEmailDispatcher(mailer platformmailer.Mailer) DirectEmailDispatcher {
	return DirectEmailDispatcher{mailer: mailer}
}

func (d DirectEmailDispatcher) Dispatch(ctx context.Context, message platformmailer.Message) error {
	return d.mailer.Send(ctx, message)
}

type RabbitMQEmailDispatcher struct {
	publisher *rabbitmq.Publisher
	exchange  string
}

func NewRabbitMQEmailDispatcher(publisher *rabbitmq.Publisher, exchange string) RabbitMQEmailDispatcher {
	return RabbitMQEmailDispatcher{publisher: publisher, exchange: exchange}
}

func (d RabbitMQEmailDispatcher) Dispatch(ctx context.Context, message platformmailer.Message) error {
	task := EmailTask{
		ID:          platformid.New(),
		RequestedAt: time.Now().UTC(),
		Message:     message,
	}

	log.Printf(
		"email task enqueued: task_id=%s exchange=%s routing_key=%s to=%s subject=%q",
		task.ID,
		d.exchange,
		EmailRoutingKey,
		message.ToEmail,
		message.Subject,
	)

	return d.publisher.PublishJSON(ctx, d.exchange, EmailRoutingKey, task)
}
