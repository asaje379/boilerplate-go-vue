package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Exchange struct {
	Name string
	Kind string
}

type Publisher struct {
	url       string
	exchanges []Exchange

	mu      sync.Mutex
	conn    *amqp.Connection
	channel *amqp.Channel
	ready   bool
}

func NewPublisher(url string, exchanges ...Exchange) (*Publisher, error) {
	p := &Publisher{url: url, exchanges: exchanges}
	if err := p.connect(); err != nil {
		return nil, err
	}

	return p, nil
}

func (p *Publisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var firstErr error
	if p.channel != nil {
		if err := p.channel.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	if p.conn != nil {
		if err := p.conn.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	p.channel = nil
	p.conn = nil
	p.ready = false

	return firstErr
}

func (p *Publisher) PublishJSON(ctx context.Context, exchange, routingKey string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return p.publish(ctx, exchange, routingKey, body)
}

func (p *Publisher) publish(ctx context.Context, exchange, routingKey string, body []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if err := p.ensureConnected(); err != nil {
		return err
	}

	if err := p.channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	}); err == nil {
		return nil
	}

	p.resetLocked()
	if err := p.connectLocked(); err != nil {
		return err
	}

	return p.channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	})
}

func (p *Publisher) ensureConnected() error {
	if p.ready && p.conn != nil && !p.conn.IsClosed() && p.channel != nil {
		return nil
	}

	return p.connectLocked()
}

func (p *Publisher) connect() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	return p.connectLocked()
}

func (p *Publisher) connectLocked() error {
	if p.url == "" {
		return fmt.Errorf("rabbitmq url is required")
	}

	conn, err := amqp.Dial(p.url)
	if err != nil {
		return err
	}

	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return err
	}

	for _, exchange := range p.exchanges {
		if err := channel.ExchangeDeclare(exchange.Name, exchange.Kind, true, false, false, false, nil); err != nil {
			_ = channel.Close()
			_ = conn.Close()
			return err
		}
	}

	p.resetLocked()
	p.conn = conn
	p.channel = channel
	p.ready = true

	return nil
}

func (p *Publisher) resetLocked() {
	if p.channel != nil {
		_ = p.channel.Close()
	}
	if p.conn != nil {
		_ = p.conn.Close()
	}
	p.channel = nil
	p.conn = nil
	p.ready = false
}
