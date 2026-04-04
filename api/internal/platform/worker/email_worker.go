package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
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
		"email worker started: rabbitmq=%s exchange=%s queue=%s consumer_tag=%s prefetch=%d routing_key=%s",
		describeAMQPURL(w.rabbitMQURL),
		w.exchange,
		w.queue,
		w.consumerTag,
		w.prefetch,
		async.EmailRoutingKey,
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
	log.Printf("email worker dialing rabbitmq: endpoint=%s", describeAMQPURL(w.rabbitMQURL))
	conn, err := amqp.Dial(w.rabbitMQURL)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Printf("email worker rabbitmq connected: endpoint=%s", describeAMQPURL(w.rabbitMQURL))

	channel, err := conn.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()
	log.Printf("email worker channel opened: exchange=%s queue=%s", w.exchange, w.queue)

	if err := channel.ExchangeDeclare(w.exchange, amqp.ExchangeTopic, true, false, false, false, nil); err != nil {
		return err
	}
	log.Printf("email worker exchange declared: name=%s kind=%s durable=%t", w.exchange, amqp.ExchangeTopic, true)
	if _, err := channel.QueueDeclare(w.queue, true, false, false, false, nil); err != nil {
		return err
	}
	log.Printf("email worker queue declared: name=%s durable=%t", w.queue, true)
	if err := channel.QueueBind(w.queue, async.EmailRoutingKey, w.exchange, false, nil); err != nil {
		return err
	}
	log.Printf("email worker queue bound: queue=%s exchange=%s routing_key=%s", w.queue, w.exchange, async.EmailRoutingKey)
	if err := channel.Qos(w.prefetch, 0, false); err != nil {
		return err
	}
	log.Printf("email worker qos configured: prefetch=%d global=%t", w.prefetch, false)

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
			log.Printf(
				"email worker delivery received: delivery_tag=%d exchange=%s routing_key=%s redelivered=%t content_type=%s bytes=%d",
				delivery.DeliveryTag,
				delivery.Exchange,
				delivery.RoutingKey,
				delivery.Redelivered,
				delivery.ContentType,
				len(delivery.Body),
			)
			if err := w.handleDelivery(ctx, delivery); err != nil {
				log.Printf("email worker task failed: delivery_tag=%d err=%v", delivery.DeliveryTag, err)
				_ = delivery.Nack(false, true)
				log.Printf("email worker delivery nacked: delivery_tag=%d requeue=%t", delivery.DeliveryTag, true)
				continue
			}
			_ = delivery.Ack(false)
			log.Printf("email worker delivery acked: delivery_tag=%d", delivery.DeliveryTag)
		}
	}
}

func (w *EmailWorker) handleDelivery(ctx context.Context, delivery amqp.Delivery) error {
	var task async.EmailTask
	if err := json.Unmarshal(delivery.Body, &task); err != nil {
		log.Printf("email worker invalid payload: delivery_tag=%d err=%v", delivery.DeliveryTag, err)
		return err
	}

	log.Printf(
		"email worker processing task: task_id=%s delivery_tag=%d exchange=%s routing_key=%s requested_at=%s to=%s subject=%q",
		task.ID,
		delivery.DeliveryTag,
		delivery.Exchange,
		delivery.RoutingKey,
		task.RequestedAt.Format(time.RFC3339),
		task.Message.ToEmail,
		task.Message.Subject,
	)

	if err := w.mailer.Send(ctx, task.Message); err != nil {
		log.Printf("email worker mail send failed: task_id=%s delivery_tag=%d err=%v", task.ID, delivery.DeliveryTag, err)
		return err
	}

	log.Printf("email worker task completed: task_id=%s delivery_tag=%d to=%s", task.ID, delivery.DeliveryTag, task.Message.ToEmail)
	return nil
}

func describeAMQPURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "invalid-url"
	}

	host := parsed.Hostname()
	port := parsed.Port()
	if port == "" {
		port = "5672"
	}

	vhost := parsed.Path
	if vhost == "" || vhost == "/" {
		vhost = "/"
	}

	return fmt.Sprintf("%s://%s:%s%s", parsed.Scheme, host, port, vhost)
}
