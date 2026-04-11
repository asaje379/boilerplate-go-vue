package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	appcommon "api/internal/application/common"
	platnotification "api/internal/platform/notification"

	amqp "github.com/rabbitmq/amqp091-go"
)

type NotificationWorker struct {
	rabbitMQURL string
	exchange    string
	queue       string
	consumerTag string
	prefetch    int
	dispatcher  *platnotification.Dispatcher
}

func NewNotificationWorker(rabbitMQURL, exchange, queue, consumerTag string, prefetch int, dispatcher *platnotification.Dispatcher) *NotificationWorker {
	if prefetch <= 0 {
		prefetch = 10
	}
	return &NotificationWorker{rabbitMQURL: rabbitMQURL, exchange: exchange, queue: queue, consumerTag: consumerTag, prefetch: prefetch, dispatcher: dispatcher}
}

func (w *NotificationWorker) Run(ctx context.Context) error {
	if w.rabbitMQURL == "" {
		return fmt.Errorf("RABBITMQ_URL is required to run the notification worker")
	}
	for {
		if err := w.runOnce(ctx); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
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

func (w *NotificationWorker) runOnce(ctx context.Context) error {
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
	if err := channel.QueueBind(w.queue, "#", w.exchange, false, nil); err != nil {
		return err
	}
	if err := channel.Qos(w.prefetch, 0, false); err != nil {
		return err
	}

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
				_ = delivery.Nack(false, true)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}

func (w *NotificationWorker) handleDelivery(ctx context.Context, delivery amqp.Delivery) error {
	var event appcommon.RealtimeEvent
	if err := json.Unmarshal(delivery.Body, &event); err != nil {
		return err
	}
	w.dispatcher.HandleEvent(ctx, event)
	return nil
}
