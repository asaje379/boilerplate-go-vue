package broker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Event struct {
	ID             string          `json:"id"`
	Type           string          `json:"type"`
	Channel        string          `json:"channel"`
	AllowedUserIDs []string        `json:"allowedUserIds,omitempty"`
	AllowedRoles   []string        `json:"allowedRoles,omitempty"`
	OccurredAt     time.Time       `json:"occurredAt"`
	Data           json.RawMessage `json:"data,omitempty"`
}

type Consumer struct {
	rabbitMQURL string
	exchange    string
	queue       string
	instanceID  string
}

func NewConsumer(rabbitMQURL, exchange, queue, instanceID string) *Consumer {
	return &Consumer{rabbitMQURL: rabbitMQURL, exchange: exchange, queue: queue, instanceID: instanceID}
}

func (c *Consumer) Run(ctx context.Context, handler func(Event) error) error {
	if c.rabbitMQURL == "" {
		return fmt.Errorf("RABBITMQ_URL is required")
	}

	for {
		if err := c.runOnce(ctx, handler); err != nil {
			if ctx.Err() != nil {
				return nil
			}
			log.Printf("realtime consumer reconnecting after error: %v", err)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(3 * time.Second):
			}
			continue
		}
		return nil
	}
}

func (c *Consumer) runOnce(ctx context.Context, handler func(Event) error) error {
	conn, err := amqp.Dial(c.rabbitMQURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	channel, err := conn.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()

	if err := channel.ExchangeDeclare(c.exchange, amqp.ExchangeTopic, true, false, false, false, nil); err != nil {
		return err
	}
	if _, err := channel.QueueDeclare(c.queue, false, true, false, false, nil); err != nil {
		return err
	}
	if err := channel.QueueBind(c.queue, "#", c.exchange, false, nil); err != nil {
		return err
	}
	if err := channel.Qos(100, 0, false); err != nil {
		return err
	}

	deliveries, err := channel.Consume(c.queue, c.instanceID, false, false, false, false, nil)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case delivery, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed")
			}

			var event Event
			if err := json.Unmarshal(delivery.Body, &event); err != nil {
				_ = delivery.Nack(false, false)
				continue
			}

			if err := handler(event); err != nil {
				_ = delivery.Nack(false, true)
				continue
			}

			_ = delivery.Ack(false)
		}
	}
}
