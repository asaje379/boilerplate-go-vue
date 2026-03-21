package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"api/internal/platform/async"
	platformmailer "api/internal/platform/mailer"

	amqp "github.com/rabbitmq/amqp091-go"
)

type EmailWorker struct {
	rabbitMQURL string
	exchange    string
	queue       string
	consumerTag string
	prefetch    int
	mailer      platformmailer.Mailer
}

func NewEmailWorker(rabbitMQURL, exchange, queue, consumerTag string, prefetch int, mailer platformmailer.Mailer) *EmailWorker {
	if prefetch <= 0 {
		prefetch = 10
	}

	return &EmailWorker{
		rabbitMQURL: rabbitMQURL,
		exchange:    exchange,
		queue:       queue,
		consumerTag: consumerTag,
		prefetch:    prefetch,
		mailer:      mailer,
	}
}

func (w *EmailWorker) Run(ctx context.Context) error {
	if w.rabbitMQURL == "" {
		return fmt.Errorf("RABBITMQ_URL is required to run the worker")
	}

	log.Printf(
		"email worker started: exchange=%s queue=%s consumer_tag=%s prefetch=%d",
		w.exchange,
		w.queue,
		w.consumerTag,
		w.prefetch,
	)

	for {
		if err := w.runOnce(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			log.Printf("email worker connection dropped: %v", err)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(3 * time.Second):
			}
			continue
		}

		return nil
	}
}

func (w *EmailWorker) runOnce(ctx context.Context) error {
	conn, err := amqp.Dial(w.rabbitMQURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	channel, err := conn.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()

	if err := channel.ExchangeDeclare(w.exchange, amqp.ExchangeTopic, true, false, false, false, nil); err != nil {
		return err
	}
	if _, err := channel.QueueDeclare(w.queue, true, false, false, false, nil); err != nil {
		return err
	}
	if err := channel.QueueBind(w.queue, async.EmailRoutingKey, w.exchange, false, nil); err != nil {
		return err
	}
	if err := channel.Qos(w.prefetch, 0, false); err != nil {
		return err
	}

	log.Printf(
		"email worker consuming: exchange=%s queue=%s routing_key=%s",
		w.exchange,
		w.queue,
		async.EmailRoutingKey,
	)

	deliveries, err := channel.Consume(w.queue, w.consumerTag, false, false, false, false, nil)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("rabbitmq delivery channel closed")
			}
			if err := w.handleDelivery(ctx, delivery); err != nil {
				log.Printf("email worker task failed: %v", err)
				_ = delivery.Nack(false, true)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}

func (w *EmailWorker) handleDelivery(ctx context.Context, delivery amqp.Delivery) error {
	var task async.EmailTask
	if err := json.Unmarshal(delivery.Body, &task); err != nil {
		return err
	}

	log.Printf("email worker processing task: task_id=%s to=%s subject=%q", task.ID, task.Message.ToEmail, task.Message.Subject)

	return w.mailer.Send(ctx, task.Message)
}
